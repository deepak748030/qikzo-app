const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const c = require('../controllers/placeController');

router.get('/', requireAuth, c.list);
router.post('/', requireAuth, c.create);
router.delete('/:id', requireAuth, c.remove);

module.exports = router;
