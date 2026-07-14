import http from 'http';
import { initSentry } from './lib/sentry';
// Sentry MUST be initialised before importing app (patches http/express).
const sentryOn = initSentry();
import app from './app';
import env from './config/env';
import { connectDB } from './config/db';
import { initSockets, getIO } from './sockets';
import mongoose from 'mongoose';
import { logger } from './lib/logger';
// Side-effect import: registers every Mongoose model so syncIndexes() finds them.
import './models';
import { runMigrations, syncIndexes } from './db/migrator';
import { migrations } from './db/migrations';
import bookingService from './services/bookingService';

async function bootstrap(): Promise<void> {
    const server = http.createServer(app);
    initSockets(server, { corsOrigin: env.CORS_ORIGIN });
    try {
        await connectDB();
        // Run migrations + index sync on boot in dev. In prod, gate behind an
        // explicit env flag so a rolling deploy doesn't fight itself.
        if (env.isDev || process.env.RUN_MIGRATIONS_ON_BOOT === 'true') {
            await syncIndexes();
            const r = await runMigrations(migrations);
            logger.info(r, 'migrations:boot');
        }
    } catch (err) {
        logger.error({ err }, 'mongo:connect_failed');
        process.exit(1);
    }
    server.listen(env.PORT, () => {
        logger.info(`⚡ Qikzo API ready on http://localhost:${env.PORT} (${env.NODE_ENV})${sentryOn ? ' [sentry]' : ''}`);
    });

    // Scheduled-booking dispatcher: every 60s, promote any bookings whose
    // pickup time is within the next 15 min into `Searching rider`.
    const scheduleTick = setInterval(() => {
        bookingService.wakeScheduledDue().catch((err) => logger.warn({ err }, 'schedule:tick_failed'));
    }, 60_000).unref();

    // Zombie trip cleanup + rider stale-ping detection. Runs every 2 min.
    //  - Bookings stuck in "Searching rider" > 15 min → auto-cancel (no rider
    //    found; customer app already gave up).
    //  - Trips stuck in early stages > 2 h with no location update → mark
    //    the rider as offline so nothing else gets dispatched to them and
    //    the customer's map stops showing a ghost rider.
    const zombieTick = setInterval(async () => {
        try {
            const Booking = (await import('./models/Booking')).default;
            const Rider = (await import('./models/Rider')).default;
            const { emitBookingUpdate } = await import('./sockets');

            // Stale searches
            const searchCutoff = new Date(Date.now() - 15 * 60 * 1000);
            const stale = await Booking.find({
                status: 'Searching rider',
                rider: null,
                createdAt: { $lte: searchCutoff },
            }).limit(50);
            for (const b of stale) {
                b.status = 'Cancelled';
                (b as any).cancelledBy = 'system';
                (b as any).cancelledReason = 'No rider available';
                (b as any).cancelledAt = new Date();
                (b.history as any).push({ status: 'Cancelled', note: 'Auto-cancelled: no rider available' });
                await b.save();
                emitBookingUpdate(b);
            }
            if (stale.length) logger.info({ n: stale.length }, 'zombie:cancelled_stale_search');

            // Riders that have gone silent (no location ping for > 3 min) are
            // marked offline so the dispatcher stops targeting them.
            const pingCutoff = new Date(Date.now() - 3 * 60 * 1000);
            const silent = await Rider.updateMany(
                { online: true, 'currentLocation.updatedAt': { $lte: pingCutoff } },
                { $set: { online: false } }
            );
            if (silent.modifiedCount) logger.info({ n: silent.modifiedCount }, 'zombie:offlined_silent_riders');
        } catch (err) {
            logger.warn({ err }, 'zombie:tick_failed');
        }
    }, 120_000).unref();

    // Graceful shutdown: stop accepting new sockets/requests, drain in-flight
    // work for up to 5s, close Mongo, exit. Critical for zero-downtime pm2
    // reload — dropping websockets mid-frame would strand rider/customer apps.
    let shuttingDown = false;
    const shutdown = async (sig: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        logger.info({ sig }, 'shutting_down');
        clearInterval(scheduleTick);
        clearInterval(zombieTick);
        const hardKill = setTimeout(() => {
            logger.warn('shutdown:forced');
            process.exit(1);
        }, 10_000).unref();
        try {
            const io = getIO();
            if (io) await new Promise<void>((r) => io.close(() => r()));
        } catch { /* ignore */ }
        server.close(async () => {
            try { await mongoose.disconnect(); } catch { /* ignore */ }
            clearTimeout(hardKill);
            process.exit(0);
        });
    };
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
