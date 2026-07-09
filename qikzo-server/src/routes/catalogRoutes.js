const router = require('express').Router();
const c = require('../controllers/catalogController');

router.get('/categories', c.listCategories);
router.get('/banners', c.listBanners);

module.exports = router;
