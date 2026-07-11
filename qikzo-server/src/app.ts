import path from 'path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import pinoHttp from 'pino-http';

import env from './config/env';
import { connectDB } from './config/db';
import { logger } from './lib/logger';
import Settings from './models/Settings';
import routes from './routes';
import notFound from './middleware/notFound';
import errorHandler from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { globalLimiter } from './middleware/rateLimiters';

const app: Express = express();

app.set('trust proxy', 1);

app.use(requestId);
app.use(pinoHttp({ logger, customProps: (req) => ({ requestId: (req as any).id }) }));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

// Static uploads (kept for asset compat with previous deployment).
const staticOpts = {
    maxAge: '7d',
    fallthrough: true,
    setHeaders: (res: express.Response) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
} as const;
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), staticOpts));
app.use('/uploads', express.static(path.join('/tmp', 'uploads'), staticOpts));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Sanitisation — order matters: parse body first, then strip NoSQL operators
// and duplicated query params.
app.use(mongoSanitize());
app.use(hpp());

const origins = env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));

if (env.isDev) app.use(morgan('dev'));

app.use('/api', globalLimiter);

// Lazy-connect DB — critical for serverless.
app.use(async (_req, _res, next) => {
    try { await connectDB(); next(); } catch (err) { next(err); }
});

// Maintenance-mode gate — bypass admin, public settings and health.
app.use('/api', async (req, res, next) => {
    try {
        const p = req.path;
        const bypass =
            p.startsWith('/admin') ||
            p.startsWith('/v1/admin') ||
            p.startsWith('/settings/public') ||
            p.startsWith('/v1/settings/public') ||
            p === '/health';
        if (bypass) return next();
        const s = await Settings.getSingleton();
        if (s.maintenanceMode) {
            return res.status(503).json({
                success: false,
                code: 'MAINTENANCE',
                message: s.maintenanceMessage || 'Under maintenance',
                requestId: (req as any).id,
            });
        }
        next();
    } catch (err) { next(err); }
});

app.get('/', (_req, res) => res.json({ ok: true, service: 'qikzo-api', version: 'v1' }));
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get('/ready', async (_req, res, next) => {
    try {
        await connectDB();
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// Mount routes at both /api (legacy) and /api/v1 (canonical) so mobile clients
// can migrate incrementally in Phase 4 without an atomic cutover.
app.use('/api', routes);
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
export { app };
