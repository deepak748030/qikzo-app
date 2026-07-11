import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import User from '../models/User';
import Otp from '../models/Otp';
import RefreshToken from '../models/RefreshToken';
import { generateCode, expiryDate, isValidIndianMobile } from '../utils/otp';
import { signAccess, signRefresh, verifyRefresh, type Role } from '../lib/tokens';
import env from '../config/env';
import { errors } from '../lib/errors';

const OTP_MAX_ATTEMPTS = 5;
const REFRESH_TTL_MS = () => env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface DeviceMeta {
    deviceId?: string;
    userAgent?: string;
    ip?: string;
}

export const authService = {
    async requestOtp(phone: string) {
        phone = String(phone || '').trim();
        if (!isValidIndianMobile(phone)) {
            throw errors.badRequest('Enter a valid 10-digit Indian mobile number', 'INVALID_PHONE');
        }
        const code = generateCode();
        const codeHash = await bcrypt.hash(code, 8);
        await Otp.findOneAndUpdate(
            { phone },
            { phone, codeHash, attempts: 0, expiresAt: expiryDate() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return {
            phone,
            ttlSeconds: env.OTP_TTL_SECONDS,
            ...(env.OTP_DEV_MODE ? { devCode: code } : {}),
        };
    },

    async verifyOtp(phone: string, code: string, device: DeviceMeta = {}) {
        phone = String(phone || '').trim();
        code = String(code || '').trim();
        if (!isValidIndianMobile(phone)) throw errors.badRequest('Invalid phone', 'INVALID_PHONE');
        if (!/^\d{4,8}$/.test(code)) throw errors.badRequest('Invalid code', 'INVALID_OTP');

        const record = await Otp.findOne({ phone });
        if (!record) throw errors.badRequest('Please request a new OTP', 'OTP_NOT_FOUND');
        if (record.expiresAt < new Date()) {
            await Otp.deleteOne({ _id: record._id });
            throw errors.badRequest('OTP expired, request again', 'OTP_EXPIRED');
        }
        if ((record.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
            await Otp.deleteOne({ _id: record._id });
            throw errors.tooMany('Too many attempts, request a new OTP');
        }
        const match = await bcrypt.compare(code, record.codeHash);
        if (!match) {
            record.attempts = (record.attempts ?? 0) + 1;
            await record.save();
            throw errors.badRequest('Incorrect OTP', 'OTP_MISMATCH');
        }
        await Otp.deleteOne({ _id: record._id });

        const user = await User.findOneAndUpdate(
            { phone },
            { $setOnInsert: { phone, name: 'Guest', role: 'customer' }, $set: { lastLoginAt: new Date() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (!user) throw errors.internal('Failed to upsert user', 'USER_UPSERT_FAILED');

        const tokens = await this.issueTokens(user as any, device);
        return { user, ...tokens };
    },

    async issueTokens(
        user: { _id: any; phone: string; role?: Role },
        device: DeviceMeta = {}
    ) {
        const role: Role = (user.role as Role) || 'customer';
        const accessToken = signAccess({ id: String(user._id), phone: user.phone, role });
        const jti = uuid();
        const refreshToken = signRefresh({ id: String(user._id), jti });
        const tokenHash = await bcrypt.hash(refreshToken, 8);
        await RefreshToken.create({
            user: user._id,
            jti,
            tokenHash,
            deviceId: device.deviceId || '',
            userAgent: device.userAgent || '',
            ip: device.ip || '',
            expiresAt: new Date(Date.now() + REFRESH_TTL_MS()),
        });
        // Return both `token` (legacy alias) and `accessToken` for forward-compat.
        return { token: accessToken, accessToken, refreshToken };
    },

    async refresh(refreshToken: string, device: DeviceMeta = {}) {
        let payload;
        try {
            payload = verifyRefresh(String(refreshToken || ''));
        } catch {
            throw errors.unauthorized('Invalid refresh token', 'BAD_REFRESH');
        }
        const record = await RefreshToken.findOne({ jti: payload.jti, user: payload.id });
        if (!record) throw errors.unauthorized('Refresh token not recognised', 'REFRESH_NOT_FOUND');
        if (record.revokedAt) throw errors.unauthorized('Refresh token revoked', 'REFRESH_REVOKED');
        if (record.expiresAt < new Date()) throw errors.unauthorized('Refresh token expired', 'REFRESH_EXPIRED');
        const match = await bcrypt.compare(refreshToken, record.tokenHash);
        if (!match) throw errors.unauthorized('Refresh mismatch', 'REFRESH_MISMATCH');

        const user = await User.findById(payload.id);
        if (!user) throw errors.unauthorized('User not found', 'USER_NOT_FOUND');

        // Rotate: revoke current, issue new pair.
        const tokens = await this.issueTokens(user as any, device);
        record.revokedAt = new Date();
        // pull the new jti out of the new refresh JWT
        try {
            const next = verifyRefresh(tokens.refreshToken);
            record.replacedByJti = next.jti;
        } catch { /* noop */ }
        await record.save();

        return { user, ...tokens };
    },

    async revokeRefresh(refreshToken?: string, userId?: string) {
        if (!refreshToken) return { revoked: 0 };
        try {
            const p = verifyRefresh(refreshToken);
            if (userId && p.id !== userId) return { revoked: 0 };
            const r = await RefreshToken.updateOne(
                { jti: p.jti, revokedAt: null },
                { $set: { revokedAt: new Date() } }
            );
            return { revoked: r.modifiedCount };
        } catch {
            return { revoked: 0 };
        }
    },

    async revokeAllForUser(userId: string) {
        const r = await RefreshToken.updateMany(
            { user: userId, revokedAt: null },
            { $set: { revokedAt: new Date() } }
        );
        return { revoked: r.modifiedCount };
    },
};

export default authService;
