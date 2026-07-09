// Wraps async route handlers so thrown errors go to errorHandler.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
