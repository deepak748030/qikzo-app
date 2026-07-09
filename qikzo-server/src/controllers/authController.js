const bcrypt = require('bcryptjs');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateCode, expiryDate, isValidIndianMobile } = require('../utils/otp');
const { sign } = require('../utils/jwt');
const { ok, fail } = require('../utils/response');
const env = require('../config/env');

// POST /api/auth/request-otp   { phone }
exports.requestOtp = asyncHandler(async (req, res) => {
    const phone = String(req.body.phone || '').trim();
    if (!isValidIndianMobile(phone)) {
        return fail(res, 400, 'Enter a valid 10-digit Indian mobile number');
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 8);

    await Otp.findOneAndUpdate(
        { phone },
        { phone, codeHash, attempts: 0, expiresAt: expiryDate() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // In production this is where an SMS provider (MSG91/Twilio) would fire.
    return ok(res, {
        phone,
        ttlSeconds: env.OTP_TTL_SECONDS,
        // Never leak the code in production.
        ...(env.OTP_DEV_MODE ? { devCode: code } : {}),
    }, 'OTP sent');
});

// POST /api/auth/verify-otp    { phone, code }
exports.verifyOtp = asyncHandler(async (req, res) => {
    const phone = String(req.body.phone || '').trim();
    const code = String(req.body.code || '').trim();
    if (!isValidIndianMobile(phone)) return fail(res, 400, 'Invalid phone');
    if (!/^\d{4,8}$/.test(code)) return fail(res, 400, 'Invalid code');

    const record = await Otp.findOne({ phone });
    if (!record) return fail(res, 400, 'Please request a new OTP');
    if (record.expiresAt < new Date()) {
        await Otp.deleteOne({ _id: record._id });
        return fail(res, 400, 'OTP expired, request again');
    }
    if (record.attempts >= 5) {
        await Otp.deleteOne({ _id: record._id });
        return fail(res, 429, 'Too many attempts, request a new OTP');
    }

    const match = await bcrypt.compare(code, record.codeHash);
    if (!match) {
        record.attempts += 1;
        await record.save();
        return fail(res, 400, 'Incorrect OTP');
    }

    await Otp.deleteOne({ _id: record._id });

    const user = await User.findOneAndUpdate(
        { phone },
        { $setOnInsert: { phone, name: 'Guest' }, $set: { lastLoginAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = sign({ id: String(user._id), phone: user.phone });
    return ok(res, { token, user }, 'Login successful');
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => ok(res, { user: req.user }));
