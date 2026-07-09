const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const c = require('../controllers/bookingController');

router.post('/estimate', requireAuth, c.estimate);
router.post('/', requireAuth, c.create);
router.get('/', requireAuth, c.listMine);
router.get('/:id', requireAuth, c.getOne);
router.patch('/:id/status', requireAuth, c.updateStatus);
router.post('/:id/cancel', requireAuth, c.cancel);

module.exports = router;
