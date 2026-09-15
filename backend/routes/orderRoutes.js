const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/payment', auth, orderController.createRazorpayOrder);
router.post('/payment/failure', auth, orderController.paymentFailed);
router.post('/verify', auth, orderController.verifyRazorpayOrder);
router.post('/', auth, orderController.createOrder);
router.get('/', auth, orderController.getOrders);
router.get('/:id', auth, orderController.getOrderById);
router.put('/:id/status', auth, adminOnly, orderController.updateOrderStatus);

module.exports = router;
