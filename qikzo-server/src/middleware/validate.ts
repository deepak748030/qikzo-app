import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { errors } from '../lib/errors';

type Source = 'body' | 'query' | 'params';

/** Validates the given request source with a zod schema and replaces it with the parsed value. */
export function validate(schema: ZodSchema, source: Source = 'body') {
    return (req: Request, _res: Response, next: NextFunction) => {
        const parsed = schema.safeParse((req as any)[source]);
        if (!parsed.success) {
            return next(errors.badRequest('Validation failed', 'VALIDATION', parsed.error.flatten()));
        }
        (req as any)[source] = parsed.data;
        next();
    };
}

export default validate;
