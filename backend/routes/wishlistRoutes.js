const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { auth } = require('../middleware/auth');

router.post('/', auth, wishlistController.addToWishlist);
router.get('/', auth, wishlistController.getWishlist);
router.delete('/:id', auth, wishlistController.removeFromWishlist);

module.exports = router;
