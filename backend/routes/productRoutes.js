const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', productController.getProducts);
router.get('/admin/all', auth, adminOnly, productController.getAllProductsAdmin);
router.get('/:id', productController.getProductById);
router.post('/', auth, adminOnly, upload.array('images', 10), productController.addProduct);
router.put('/:id', auth, adminOnly, upload.array('images', 10), productController.updateProduct);
router.delete('/:id', auth, adminOnly, productController.deleteProduct);

module.exports = router;
