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

// --- Speech-to-text via Lovable AI Gateway --------------------------------
// Uses in-memory multer (audio blobs are small) and proxies to the Gateway
// with the workspace's LOVABLE_API_KEY. Returns `{ text }` on success.
const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB — well below Gateway's 25MiB cap
});

router.post(
    '/transcribe',
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
        audioUpload.single('audio')(req, res, (err: any) => {
            if (!err) return next();
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') return next(errors.badRequest('Audio too large (max 20MB)', 'AUDIO_TOO_LARGE'));
                return next(errors.badRequest(err.message, 'UPLOAD_ERROR'));
            }
            next(err);
        });
    },
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const f = req.file;
            if (!f || !f.buffer?.length) throw errors.badRequest('No audio uploaded', 'NO_AUDIO');
            const apiKey = process.env.LOVABLE_API_KEY;
            if (!apiKey) throw errors.internal('Transcription not configured', 'AI_NOT_CONFIGURED');

            // Derive a filename with a real extension so OpenAI can decode it.
            const mime = f.mimetype || 'audio/webm';
            const extMap: Record<string, string> = {
                'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a',
                'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
                'audio/ogg': 'ogg', 'audio/flac': 'flac', 'audio/aac': 'aac',
            };
            const ext = extMap[mime.split(';')[0]] || 'webm';

            const form = new FormData();
            form.append('file', new Blob([f.buffer], { type: mime }), `recording.${ext}`);
            form.append('model', 'openai/gpt-4o-transcribe');
            form.append('language', 'en');

            const upstream = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}` },
                body: form as any,
            });

            const bodyText = await upstream.text();
            if (!upstream.ok) {
                logger.warn({ status: upstream.status, body: bodyText.slice(0, 500) }, 'transcription_failed');
                return next(errors.badRequest(
                    upstream.status === 402 ? 'Transcription credits exhausted' : 'Transcription failed',
                    'TRANSCRIBE_FAIL',
                ));
            }
            let json: any = {};
            try { json = JSON.parse(bodyText); } catch { /* ignore */ }
            const text = String(json?.text || '').trim();
            res.json({ success: true, text });
        } catch (e) {
            next(e);
        }
    },
);

export default router;
