import type { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            id: string;
        }
    }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    req.id = (typeof incoming === 'string' && incoming) || uuid();
    res.setHeader('x-request-id', req.id);
    next();
}
