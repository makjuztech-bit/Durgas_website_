const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', categoryController.getCategories);
router.post('/', auth, adminOnly, categoryController.addCategory);
router.put('/:id', auth, adminOnly, categoryController.updateCategory);
router.delete('/:id', auth, adminOnly, categoryController.deleteCategory);

module.exports = router;
