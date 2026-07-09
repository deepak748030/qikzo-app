// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    if (process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.error('[error]', err.message);
    }
    res.status(status).json({
        ok: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
};
