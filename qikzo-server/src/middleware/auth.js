const { verify } = require('../utils/jwt');
const User = require('../models/User');

// Requires a valid Bearer token; attaches req.user (lean doc).
module.exports = async function requireAuth(req, res, next) {
    try {
        const h = req.headers.authorization || '';
        const token = h.startsWith('Bearer ') ? h.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
        const payload = verify(token);
        const user = await User.findById(payload.id).lean();
        if (!user) return res.status(401).json({ success: false, message: 'User not found' });
        req.user = { ...user, id: String(user._id) };
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
