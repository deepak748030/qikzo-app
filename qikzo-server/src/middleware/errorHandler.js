// Central error handler — turns thrown errors into consistent JSON.
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[error]', err.message, err.stack);
    }
    res.status(status).json({
        success: false,
        message: err.message || 'Internal server error',
        code: err.code,
    });
};
