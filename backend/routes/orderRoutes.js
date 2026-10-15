const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth, adminOnly, optionalAuth } = require('../middleware/auth');

router.post('/webhook', orderController.razorpayWebhook);
router.post('/payment', optionalAuth, orderController.createRazorpayOrder);
router.post('/payment/failure', optionalAuth, orderController.paymentFailed);
router.post('/verify', optionalAuth, orderController.verifyRazorpayOrder);
router.post('/whatsapp', orderController.recordWhatsAppInquiry);
router.post('/', optionalAuth, orderController.createOrder);
router.get('/', auth, orderController.getOrders);
router.get('/:id', optionalAuth, orderController.getOrderById);
router.put('/:id/status', auth, adminOnly, orderController.updateOrderStatus);

module.exports = router;
