import jwt, { type SignOptions } from 'jsonwebtoken';
import env from '../config/env';

export type Role = 'customer' | 'rider' | 'admin';

export interface AccessPayload {
    id: string;
    phone: string;
    role: Role;
    typ: 'access';
}

export interface RefreshPayload {
    id: string;
    jti: string;
    typ: 'refresh';
}

const opts = (expiresIn: string | number): SignOptions => ({ expiresIn: expiresIn as SignOptions['expiresIn'] });

export function signAccess(payload: Omit<AccessPayload, 'typ'>): string {
    return jwt.sign({ ...payload, typ: 'access' }, env.JWT_SECRET, opts(env.ACCESS_TOKEN_TTL));
}

export function signRefresh(payload: Omit<RefreshPayload, 'typ'>): string {
    return jwt.sign({ ...payload, typ: 'refresh' }, env.JWT_SECRET, opts(`${env.REFRESH_TOKEN_TTL_DAYS}d`));
}

export function verifyAccess(token: string): AccessPayload {
    const p = jwt.verify(token, env.JWT_SECRET) as AccessPayload;
    if (p.typ && p.typ !== 'access') throw new Error('Wrong token type');
    return p;
}

export function verifyRefresh(token: string): RefreshPayload {
    const p = jwt.verify(token, env.JWT_SECRET) as RefreshPayload;
    if (p.typ !== 'refresh') throw new Error('Wrong token type');
    return p;
}

// Legacy alias — some code paths still call sign()/verify() from utils/jwt.
export const sign = signAccess;
export const verify = verifyAccess;
