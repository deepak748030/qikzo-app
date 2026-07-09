require('dotenv').config();

const num = (v, d) => (v ? parseInt(v, 10) : d);
const bool = (v, d) => (v == null ? d : String(v).toLowerCase() === 'true');

module.exports = {
    PORT: num(process.env.PORT, 4000),
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/qikzo',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
    OTP_DEV_MODE: bool(process.env.OTP_DEV_MODE, true),
    OTP_FIXED_CODE: process.env.OTP_FIXED_CODE || '123456',
    OTP_TTL_SECONDS: num(process.env.OTP_TTL_SECONDS, 300),
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    PRICE_BASE: num(process.env.PRICE_BASE, 25),
    PRICE_PER_KM: num(process.env.PRICE_PER_KM, 8),
    PRICE_MIN: num(process.env.PRICE_MIN, 40),
};
