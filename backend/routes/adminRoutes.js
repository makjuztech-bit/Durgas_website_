// backend/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');

// Product management (reuse existing controller)
router.get('/products', auth, adminOnly, productController.getAllProductsAdmin);
router.post('/products', auth, adminOnly, productController.addProduct);
router.put('/products/:id', auth, adminOnly, productController.updateProduct);
router.delete('/products/:id', auth, adminOnly, productController.deleteProduct);

// Inventory update – simple stock change
router.patch('/inventory/:id', auth, adminOnly, (req, res) => {
  const productId = req.params.id;
  const { stock } = req.body;
  if (stock == null) return res.status(400).json({ message: 'Stock value required' });
  const sql = 'UPDATE products SET stock = ? WHERE id = ?';
  const db = require('../config/db');
  db.query(sql, [stock, productId], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Stock updated', productId, stock });
  });
});

// Sales reporting – optional date range query
router.get('/sales', auth, adminOnly, (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT COUNT(*) AS ordersCount, SUM(total_amount) AS totalRevenue FROM orders';
  const params = [];
  if (from && to) {
    sql += ' WHERE created_at BETWEEN ? AND ?';
    params.push(from, to);
  }
  const db = require('../config/db');
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows[0]);
  });
});

module.exports = router;
