/** Standard application error with an HTTP status + machine code. */
export class AppError extends Error {
    status: number;
    code: string;
    details?: unknown;
    constructor(status: number, code: string, message: string, details?: unknown) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export const errors = {
    badRequest: (message = 'Bad request', code = 'BAD_REQUEST', details?: unknown) =>
        new AppError(400, code, message, details),
    unauthorized: (message = 'Not authenticated', code = 'UNAUTHORIZED') =>
        new AppError(401, code, message),
    forbidden: (message = 'Forbidden', code = 'FORBIDDEN') =>
        new AppError(403, code, message),
    notFound: (message = 'Not found', code = 'NOT_FOUND') =>
        new AppError(404, code, message),
    conflict: (message = 'Conflict', code = 'CONFLICT') =>
        new AppError(409, code, message),
    tooMany: (message = 'Too many requests', code = 'RATE_LIMITED') =>
        new AppError(429, code, message),
    internal: (message = 'Internal server error', code = 'INTERNAL') =>
        new AppError(500, code, message),
};
