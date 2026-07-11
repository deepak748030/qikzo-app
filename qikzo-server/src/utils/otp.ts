import env from '../config/env';

export const generateCode = (): string =>
    env.OTP_DEV_MODE
        ? env.OTP_FIXED_CODE
        : String(Math.floor(100000 + Math.random() * 900000));

export const expiryDate = (): Date => new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

export const isValidIndianMobile = (p: unknown): boolean =>
    /^[6-9]\d{9}$/.test(String(p || '').trim());
