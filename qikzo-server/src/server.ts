import http from 'http';
import { initSentry } from './lib/sentry';
// Sentry MUST be initialised before importing app (patches http/express).
const sentryOn = initSentry();
import app from './app';
import env from './config/env';
import { connectDB } from './config/db';
import { initSockets } from './sockets';
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

    const shutdown = (sig: string) => {
        logger.info({ sig }, 'shutting_down');
        clearInterval(scheduleTick);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void bootstrap();
