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
        cached.promise = mongoose
            .connect(env.MONGO_URI, {
                serverSelectionTimeoutMS: 8000,
                socketTimeoutMS: 30000,
                maxPoolSize: 20,
                minPoolSize: 2,
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
