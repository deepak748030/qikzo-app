const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const c = require('../controllers/userController');

router.patch('/me', requireAuth, c.updateMe);
router.delete('/me', requireAuth, c.deleteMe);

module.exports = router;
