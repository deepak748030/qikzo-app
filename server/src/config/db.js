const mongoose = require('mongoose');
const env = require('./env');

// Cache connection across serverless invocations for speed.
let cached = global.__mongoose;
if (!cached) cached = global.__mongoose = { conn: null, promise: null };

async function connectDB() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        mongoose.set('strictQuery', true);
        cached.promise = mongoose
            .connect(env.MONGO_URI, {
                serverSelectionTimeoutMS: 8000,
                maxPoolSize: 20,
                minPoolSize: 2,
            })
            .then((m) => {
                // eslint-disable-next-line no-console
                console.log('✅ MongoDB connected');

                return m;
            });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

module.exports = { connectDB, mongoose };
