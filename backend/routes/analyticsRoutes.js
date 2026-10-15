const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth, adminOnly, optionalAuth } = require('../middleware/auth');

router.get('/dashboard', auth, adminOnly, analyticsController.getDashboardStats);
router.get('/reviews', auth, adminOnly, analyticsController.getReviews);
router.get('/reviews/:productId', analyticsController.getProductReviews);
router.post('/reviews', optionalAuth, analyticsController.addReview);

module.exports = router;
