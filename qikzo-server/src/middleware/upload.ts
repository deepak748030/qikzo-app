import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import type { Request } from 'express';
import { errors } from '../lib/errors';

/**
 * Multer disk storage for user/rider uploads.
 *
 * Files land in `UPLOAD_DIR` (defaults to `<cwd>/uploads` locally and
 * `/tmp/uploads` on serverless). The `/uploads` static route in `app.ts`
 * serves both, so returned URLs are immediately fetchable.
 */
const UPLOAD_DIR =
    process.env.UPLOAD_DIR ||
    (process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads'));

try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch {}

const ALLOWED = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
]);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const id = crypto.randomBytes(12).toString('hex');
        const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 8) || '';
        cb(null, `${Date.now()}_${id}${ext}`);
    },
});

export const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024, files: 1 }, // 8MB per file
    fileFilter: (_req: Request, file, cb) => {
        if (!ALLOWED.has(file.mimetype)) {
            return cb(errors.badRequest('Unsupported file type', 'BAD_MIME') as any);
        }
        cb(null, true);
    },
});

/** Build the public URL served by the /uploads static handler. */
export function publicUrlFor(filename: string): string {
    return `/uploads/${filename}`;
}

export default upload;
