const router = require('express').Router();
const c = require('../controllers/riderController');

router.get('/available', c.listAvailable);

module.exports = router;
