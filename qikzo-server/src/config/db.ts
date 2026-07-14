import mongoose from 'mongoose';
import env from './env';
import { logger } from '../lib/logger';

// Cache the connection across serverless invocations (Vercel).
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __qikzoMongo?: Cache };
const cached: Cache = g.__qikzoMongo || (g.__qikzoMongo = { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        mongoose.set('strictQuery', true);
        // Skip index rebuild on connect in prod — indexes are managed by
        // migrations. This shaves seconds off cold-start on Vercel.
        if (env.isProd) mongoose.set('autoIndex', false);
        cached.promise = mongoose
            .connect(env.MONGO_URI, {
                serverSelectionTimeoutMS: 8000,
                socketTimeoutMS: 45000,
                // Pool sized for a single-node self-hosted Mongo on the same
                // VPS. 100 gives ~2-3k concurrent users comfortably; raise to
                // 200+ only after moving Mongo to its own box.
                maxPoolSize: 100,
                minPoolSize: 10,
                // Fail fast when the pool is saturated instead of hanging the
                // request forever — surfaces the bottleneck as a 500 in logs.
                waitQueueTimeoutMS: 5000,
                // Cheaper wire protocol + faster monitoring.
                compressors: ['zlib'] as any,
                heartbeatFrequencyMS: 30000,
            })
            .then((m) => {
                logger.info({ msg: 'mongo:connected' });
                return m;
            });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

export { mongoose };
