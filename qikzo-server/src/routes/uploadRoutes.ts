import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import requireAuth from '../middleware/requireAuth';
import { upload, publicUrlFor } from '../middleware/upload';
import { errors } from '../lib/errors';
import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /uploads
 * multipart/form-data with field `file`. Requires auth.
 * Returns { url, filename, mimeType, sizeBytes }.
 *
 * Consumers (rider KYC docs, profile photo, vehicle photo) can POST here and
 * pass the returned `url` into their metadata endpoint (e.g. /riders/me/documents).
 */
router.post(
    '/',
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
        upload.single('file')(req, res, (err: any) => {
            if (!err) return next();
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') return next(errors.badRequest('File too large (max 8MB)', 'FILE_TOO_LARGE'));
                return next(errors.badRequest(err.message, 'UPLOAD_ERROR'));
            }
            next(err);
        });
    },
    (req: Request, res: Response) => {
        const f = req.file;
        if (!f) throw errors.badRequest('No file uploaded', 'NO_FILE');
        const url = publicUrlFor(f.filename);
        logger.info({ userId: req.user?.id, filename: f.filename, size: f.size, mime: f.mimetype }, 'file_uploaded');
        res.json({
            success: true,
            url,
            filename: f.filename,
            mimeType: f.mimetype,
            sizeBytes: f.size,
        });
    },
);

export default router;
