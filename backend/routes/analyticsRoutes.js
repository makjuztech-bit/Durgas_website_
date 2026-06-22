const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/dashboard', auth, adminOnly, analyticsController.getDashboardStats);
router.get('/reviews', auth, adminOnly, analyticsController.getReviews);
router.get('/reviews/:productId', analyticsController.getProductReviews);

module.exports = router;
