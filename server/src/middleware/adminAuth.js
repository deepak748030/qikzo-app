const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const env = require('../config/env');

module.exports = async function protectAdmin(req, res, next) {
    try {
        const h = req.headers.authorization || '';
        const token = h.startsWith('Bearer ') ? h.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
        const p = jwt.verify(token, env.JWT_SECRET);
        if (p.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
        const admin = await Admin.findById(p.id).lean();
        if (!admin) return res.status(401).json({ success: false, message: 'Admin not found' });
        req.admin = { ...admin, id: admin._id };
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
