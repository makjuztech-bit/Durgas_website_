// backend/routes/adminRoutes.js
// All routes here require JWT authentication AND admin/superadmin role.

const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const adminController = require('../controllers/adminController');

// Apply auth + adminOnly to all routes in this file
router.use(auth, adminOnly);

// ─── Dashboard ────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/dashboard', adminController.getDashboard);

// ─── Products ────────────────────────────────────────────────────────────────
// GET /api/admin/products?search=&category=&status=&sort=&page=&limit=
router.get('/products', adminController.listProducts);

// POST /api/admin/products  — create (reuse productController, already validates auth+admin)
router.post('/products', upload.array('images', 10), productController.addProduct);

// PUT /api/admin/products/:id  — update
router.put('/products/:id', upload.array('images', 10), productController.updateProduct);

// PATCH /api/admin/products/:id/archive  — soft-delete (preferred over hard delete for products in orders)
router.patch('/products/:id/archive', adminController.archiveProduct);

// PATCH /api/admin/products/:id/unarchive
router.patch('/products/:id/unarchive', adminController.unarchiveProduct);

// DELETE /api/admin/products/:id  — hard delete (only if no orders reference it)
router.delete('/products/:id', productController.deleteProduct);

// ─── Inventory ───────────────────────────────────────────────────────────────
// PATCH /api/admin/inventory/:id  — update stock for a product
router.patch('/inventory/:id', adminController.updateInventory);

// ─── Orders ──────────────────────────────────────────────────────────────────
// GET /api/admin/orders?search=&status=&payment_status=&from=&to=&sort=&page=&limit=
router.get('/orders', adminController.listOrders);

// GET /api/admin/orders/:id
router.get('/orders/:id', adminController.getOrderDetail);

// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', orderController.updateOrderStatus);

// ─── Customers ───────────────────────────────────────────────────────────────
// GET /api/admin/customers?search=&page=&limit=
router.get('/customers', adminController.listCustomers);

// GET /api/admin/customers/:id
router.get('/customers/:id', adminController.getCustomerDetail);

// ─── Reviews ─────────────────────────────────────────────────────────────────
// GET /api/admin/reviews?status=&search=&page=&limit=
router.get('/reviews', adminController.listReviews);

// POST /api/admin/reviews/:id/moderate  body: { action: 'approve'|'hide'|'delete' }
router.post('/reviews/:id/moderate', adminController.moderateReview);

// ─── Audit Log ───────────────────────────────────────────────────────────────
// GET /api/admin/audit?action=&entity_type=&page=&limit=
// Only superadmin can read audit log
router.get('/audit', (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access required for audit log.' });
  }
  next();
}, adminController.getAuditLog);

module.exports = router;
