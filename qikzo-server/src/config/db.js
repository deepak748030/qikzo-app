const mongoose = require('mongoose');
const env = require('./env');

// Cache the connection across serverless invocations (Vercel) for lightning restarts.
let cached = global.__qikzoMongo;
if (!cached) cached = global.__qikzoMongo = { conn: null, promise: null };

async function connectDB() {
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
                // eslint-disable-next-line no-console
                console.log('✅ Qikzo MongoDB connected');
                return m;
            });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

module.exports = { connectDB, mongoose };
