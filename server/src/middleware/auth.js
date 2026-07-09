const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

async function protect(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) return res.status(401).json({ ok: false, error: 'Not authenticated' });
        const payload = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(payload.id).lean();
        if (!user) return res.status(401).json({ ok: false, error: 'User not found' });
        if (user.blocked) return res.status(403).json({ ok: false, error: 'Your account has been blocked. Please contact support.', code: 'USER_BLOCKED' });
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    }
}

module.exports = { protect };
