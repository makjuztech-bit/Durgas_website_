const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/', contactController.submitContact);
router.get('/', auth, adminOnly, contactController.getMessages);

module.exports = router;
