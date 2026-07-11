import 'dotenv/config';
import { z } from 'zod';

const bool = (d: boolean) =>
    z.preprocess((v) => (v == null ? d : String(v).toLowerCase() === 'true'), z.boolean());
const num = (d: number) =>
    z.preprocess((v) => (v == null || v === '' ? d : Number(v)), z.number());
const str = (d?: string) =>
    z.preprocess((v) => (v == null || v === '' ? d : String(v)), d === undefined ? z.string() : z.string().default(d));

const EnvSchema = z.object({
    NODE_ENV: str('development'),
    PORT: num(4000),
    MONGO_URI: str('mongodb://127.0.0.1:27017/qikzo'),

    // Auth
    JWT_SECRET: str('dev-secret-change-me'),
    // Backwards-compat: JWT_EXPIRES_IN used to be the only knob. It now
    // defaults the ACCESS_TOKEN_TTL when the newer var isn't set.
    JWT_EXPIRES_IN: str('30d'),
    ACCESS_TOKEN_TTL: str(process.env.JWT_EXPIRES_IN || '30d'),
    REFRESH_TOKEN_TTL_DAYS: num(60),

    // OTP
    OTP_DEV_MODE: bool(true),
    OTP_FIXED_CODE: str('123456'),
    OTP_TTL_SECONDS: num(300),

    // CORS
    CORS_ORIGIN: str('*'),

    // Pricing (INR)
    PRICE_BASE: num(25),
    PRICE_PER_KM: num(8),
    PRICE_MIN: num(40),

    // Logging
    LOG_LEVEL: str('info'),
});

const parsed = EnvSchema.parse(process.env);

export const env = {
    ...parsed,
    isProd: parsed.NODE_ENV === 'production',
    isDev: parsed.NODE_ENV !== 'production',
};

export type Env = typeof env;
export default env;
