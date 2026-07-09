require('dotenv').config();

const env = {
    PORT: parseInt(process.env.PORT || '4000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tractorwaladealers',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

module.exports = env;
