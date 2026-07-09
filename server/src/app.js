const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { connectDB } = require('./config/db');
const Settings = require('./models/Settings');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');


const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

// Static uploads (images, videos, pdfs) — served from server/uploads
app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'), {
        maxAge: '7d',
        fallthrough: true,
        setHeaders: (res) => {
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
    })
);
app.use(
    '/uploads',
    express.static(path.join('/tmp', 'uploads'), {
        maxAge: '7d',
        fallthrough: true,
        setHeaders: (res) => {
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
    })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const origins = env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));

if (env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use(
    '/api',
    rateLimit({
        windowMs: 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

// Lazy-connect DB
app.use(async (req, _res, next) => {
    try { await connectDB(); next(); } catch (err) { next(err); }
});

// Maintenance mode guard — allow admin routes and public settings; block the rest.
app.use('/api', async (req, res, next) => {
    try {
        const p = req.path;
        const bypass =
            p.startsWith('/admin') ||
            p.startsWith('/settings/public') ||
            p === '/health';
        if (bypass) return next();
        const s = await Settings.getSingleton();
        if (s.maintenanceMode) {
            return res.status(503).json({
                ok: false,
                success: false,
                code: 'MAINTENANCE',
                error: 'Under maintenance',
                message: s.maintenanceMessage || 'Under maintenance',
            });
        }
        next();
    } catch (err) { next(err); }
});

app.get('/', (_req, res) => res.json({ ok: true, service: 'tractor-wala-dealers-api' }));
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
