// Small helpers so controllers stay tiny and consistent.
exports.ok = (res, data = {}, message = 'OK') =>
    res.json({ success: true, message, ...data });

exports.created = (res, data = {}, message = 'Created') =>
    res.status(201).json({ success: true, message, ...data });

exports.fail = (res, status, message, extra = {}) =>
    res.status(status).json({ success: false, message, ...extra });
