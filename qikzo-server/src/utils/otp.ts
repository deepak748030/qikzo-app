import env from '../config/env';

export const generateCode = (): string =>
    env.OTP_DEV_MODE
        ? env.OTP_FIXED_CODE
        : String(Math.floor(100000 + Math.random() * 900000));

export const expiryDate = (): Date => new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

/**
 * Normalize any Indian phone input to the canonical 10-digit form.
 * Accepts "+91 74893 01982", "917489301982", "07489301982", "7489301982", etc.
 * Returns empty string if it cannot be normalized to 10 digits starting 6-9.
 */
export const normalizeIndianPhone = (p: unknown): string => {
    let digits = String(p || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : '';
};

export const isValidIndianMobile = (p: unknown): boolean =>
    normalizeIndianPhone(p) !== '';
