const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);
router.get('/customers', auth, adminOnly, authController.getCustomers);

module.exports = router;
