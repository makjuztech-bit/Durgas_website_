const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/', newsletterController.subscribe);
router.get('/', auth, adminOnly, newsletterController.getSubscribers);

module.exports = router;
