/**
 * Structured API error. All non-2xx responses (and network failures) thrown by
 * the client are ApiError instances so screens can switch on `code`.
 */
export class ApiError extends Error {
    status: number;
    code?: string;
    details?: unknown;
    requestId?: string;

    constructor(opts: { message: string; status: number; code?: string; details?: unknown; requestId?: string }) {
        super(opts.message);
        this.name = 'ApiError';
        this.status = opts.status;
        this.code = opts.code;
        this.details = opts.details;
        this.requestId = opts.requestId;
    }

    isAuth() {
        return this.status === 401 || this.code === 'UNAUTHORIZED';
    }
    isValidation() {
        return this.status === 400 || this.status === 422;
    }
    isNetwork() {
        return this.status === 0;
    }
}

export default ApiError;
