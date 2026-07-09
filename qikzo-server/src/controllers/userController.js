const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const { ok } = require('../utils/response');

// PATCH /api/users/me
exports.updateMe = asyncHandler(async (req, res) => {
    const { name, email, onboarded, location } = req.body;
    const patch = {};
    if (typeof name === 'string') patch.name = name.trim();
    if (typeof email === 'string') patch.email = email.trim().toLowerCase();
    if (typeof onboarded === 'boolean') patch.onboarded = onboarded;
    if (typeof location === 'string' || location === null) patch.location = location;

    const user = await User.findByIdAndUpdate(req.user.id, patch, { new: true });
    return ok(res, { user }, 'Profile updated');
});

// DELETE /api/users/me
exports.deleteMe = asyncHandler(async (req, res) => {
    await User.findByIdAndDelete(req.user.id);
    return ok(res, {}, 'Account deleted');
});
