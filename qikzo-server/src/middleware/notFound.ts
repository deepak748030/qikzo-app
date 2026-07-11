import type { Request, Response } from 'express';

export function notFound(req: Request, res: Response): void {
    res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        requestId: req.id,
    });
}

export default notFound;
