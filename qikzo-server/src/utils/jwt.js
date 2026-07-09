const jwt = require('jsonwebtoken');
const env = require('../config/env');

exports.sign = (payload) =>
    jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

exports.verify = (token) => jwt.verify(token, env.JWT_SECRET);
