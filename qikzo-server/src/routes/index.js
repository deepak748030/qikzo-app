const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/', require('./catalogRoutes'));       // /categories, /banners
router.use('/places', require('./placeRoutes'));
router.use('/bookings', require('./bookingRoutes'));
router.use('/riders', require('./riderRoutes'));

module.exports = router;
