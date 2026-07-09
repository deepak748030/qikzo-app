const asyncHandler = require('../middleware/asyncHandler');
const Booking = require('../models/Booking');
const Rider = require('../models/Rider');
const { estimateTrip } = require('../utils/pricing');
const { ok, created, fail } = require('../utils/response');
const { emitBookingUpdate } = require('../sockets');

const nextCode = () => 'QZ' + String(2100 + Math.floor(Math.random() * 9000));

// POST /api/bookings/estimate   { pickup, drop, pickupCoord?, dropCoord? }
exports.estimate = asyncHandler(async (req, res) => {
    const { pickup, drop, pickupCoord, dropCoord } = req.body;
    if (!pickup || !drop) return fail(res, 400, 'pickup and drop are required');
    const est = estimateTrip({
        pickup: pickup.address || pickup,
        drop: drop.address || drop,
        pickupCoord: pickupCoord || pickup.coord || null,
        dropCoord: dropCoord || drop.coord || null,
    });
    return ok(res, est);
});

// POST /api/bookings
exports.create = asyncHandler(async (req, res) => {
    const {
        mode = 'delivery',
        categorySlug,
        pickup, drop,
        notes = '',
        recipientPhone = '',
        payment = 'cash',
    } = req.body;

    if (!categorySlug) return fail(res, 400, 'categorySlug is required');
    if (!pickup?.address || !drop?.address) return fail(res, 400, 'pickup.address and drop.address are required');

    const est = estimateTrip({
        pickup: pickup.address,
        drop: drop.address,
        pickupCoord: pickup.lat != null ? { lat: pickup.lat, lng: pickup.lng } : null,
        dropCoord: drop.lat != null ? { lat: drop.lat, lng: drop.lng } : null,
    });

    const booking = await Booking.create({
        code: nextCode(),
        user: req.user.id,
        mode,
        categorySlug,
        pickup,
        drop,
        notes,
        recipientPhone,
        payment,
        distanceKm: est.distanceKm,
        etaMin: est.etaMin,
        price: est.price,
        pricing: { base: est.base, perKm: est.perKm },
        status: 'Searching rider',
        history: [{ status: 'Searching rider' }],
    });

    // Fire-and-forget: simulate rider assignment after a short delay.
    setTimeout(() => assignRider(booking._id).catch(() => { }), 4000);

    return created(res, { booking });
});

// GET /api/bookings           — current user's bookings
exports.listMine = asyncHandler(async (req, res) => {
    const items = await Booking.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .populate('rider')
        .lean();
    return ok(res, { items });
});

// GET /api/bookings/:id
exports.getOne = asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id })
        .populate('rider')
        .lean();
    if (!booking) return fail(res, 404, 'Booking not found');
    return ok(res, { booking });
});

// PATCH /api/bookings/:id/status   { status, note? }
exports.updateStatus = asyncHandler(async (req, res) => {
    const { status, note = '' } = req.body;
    if (!Booking.BOOKING_STATUSES.includes(status)) return fail(res, 400, 'Invalid status');
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return fail(res, 404, 'Booking not found');
    booking.status = status;
    booking.history.push({ status, note });
    await booking.save();
    emitBookingUpdate(booking);
    return ok(res, { booking }, 'Status updated');
});

// POST /api/bookings/:id/cancel   { reason? }
exports.cancel = asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return fail(res, 404, 'Booking not found');
    if (['Delivered', 'Cancelled'].includes(booking.status)) {
        return fail(res, 400, `Cannot cancel a ${booking.status.toLowerCase()} booking`);
    }
    booking.status = 'Cancelled';
    booking.cancelledReason = String(req.body.reason || '').trim();
    booking.history.push({ status: 'Cancelled', note: booking.cancelledReason });
    await booking.save();
    emitBookingUpdate(booking);
    return ok(res, { booking }, 'Booking cancelled');
});

// Internal: pick an available rider and progress the booking.
async function assignRider(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== 'Searching rider') return;
    const rider = await Rider.findOne({ online: true, available: true }).sort({ rating: -1 });
    if (!rider) return;
    booking.rider = rider._id;
    booking.status = 'Rider accepted';
    booking.history.push({ status: 'Rider accepted', note: `Assigned to ${rider.name}` });
    await booking.save();
    emitBookingUpdate(booking);
}

exports._assignRider = assignRider;
