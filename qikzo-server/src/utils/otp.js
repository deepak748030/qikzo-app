const env = require('../config/env');

// 6-digit OTP; dev mode uses a fixed code so QA can log in without SMS.
exports.generateCode = () =>
    env.OTP_DEV_MODE
        ? env.OTP_FIXED_CODE
        : String(Math.floor(100000 + Math.random() * 900000));

exports.expiryDate = () => new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

// Basic +91 mobile format validation (10 digits, starting 6-9).
exports.isValidIndianMobile = (p) => /^[6-9]\d{9}$/.test(String(p || '').trim());
