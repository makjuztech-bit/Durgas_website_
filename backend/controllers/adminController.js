// backend/controllers/adminController.js
// Admin-only controller — all handlers require verifyToken + requireAdmin upstream.

const db = require('../config/db');

// ─── Audit Log Helper ───────────────────────────────────────────────────────

/**
 * Record an admin action in audit_log.
 * Errors are swallowed so they never break the primary operation.
 */
async function auditLog(adminId, action, entityType, entityId, metadata = null) {
  try {
    await db.query(
      'INSERT INTO audit_log (admin_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)',
      [adminId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (_) { /* non-critical */ }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

exports.getDashboard = async (req, res) => {
  try {
    const { from, to } = req.query;

    // Build date range WHERE clause for orders
    let dateFilter = '';
    const dateParams = [];
    if (from && to) {
      dateFilter = 'WHERE o.created_at >= ? AND o.created_at < ?';
      dateParams.push(from, to + 'T23:59:59.999Z');
    } else if (from) {
      dateFilter = 'WHERE o.created_at >= ?';
      dateParams.push(from);
    } else if (to) {
      dateFilter = 'WHERE o.created_at <= ?';
      dateParams.push(to + 'T23:59:59.999Z');
    }

    const [
      productStats,
      orderStats,
      customerCount,
      revenueStats,
      recentOrders,
      lowStock,
    ] = await Promise.all([
      // Product stats
      db.query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out_of_stock,
          SUM(CASE WHEN stock > 0 AND stock <= 5 THEN 1 ELSE 0 END) AS low_stock
        FROM products
      `),

      // Order status counts with optional date filter
      db.query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'pending'    THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
          SUM(CASE WHEN status = 'shipped'    THEN 1 ELSE 0 END) AS shipped,
          SUM(CASE WHEN status = 'delivered'  THEN 1 ELSE 0 END) AS delivered,
          SUM(CASE WHEN status = 'cancelled'  THEN 1 ELSE 0 END) AS cancelled
        FROM orders o
        ${dateFilter}
      `, dateParams),

      // Customer count
      db.query("SELECT COUNT(*) AS total FROM users WHERE role = 'customer'"),

      // Revenue (only non-cancelled orders with successful payment)
      db.query(`
        SELECT
          COALESCE(SUM(o.total_amount), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN o.payment_method = 'razorpay' THEN o.total_amount ELSE 0 END), 0) AS online_revenue,
          COALESCE(SUM(CASE WHEN o.payment_method = 'cod'      THEN o.total_amount ELSE 0 END), 0) AS cod_revenue
        FROM orders o
        WHERE o.status != 'cancelled'
        ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}
      `, dateParams),

      // Recent orders (always last 10, unaffected by date filter)
      db.query(`
        SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_method,
               o.payment_status, o.created_at, u.full_name, u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 10
      `),

      // Low stock (<=5) products
      db.query(`
        SELECT id, name, sku, stock, is_active
        FROM products
        WHERE stock <= 5 AND is_active = TRUE
        ORDER BY stock ASC, name ASC
        LIMIT 20
      `),
    ]);

    const ps = productStats[0];
    const os = orderStats[0];
    const rv = revenueStats[0];

    res.json({
      products: {
        total:       Number(ps.total),
        active:      Number(ps.active),
        outOfStock:  Number(ps.out_of_stock),
        lowStock:    Number(ps.low_stock),
      },
      orders: {
        total:      Number(os.total),
        pending:    Number(os.pending),
        processing: Number(os.processing),
        shipped:    Number(os.shipped),
        delivered:  Number(os.delivered),
        cancelled:  Number(os.cancelled),
      },
      customers: {
        total: Number(customerCount[0].total),
      },
      revenue: {
        total:   parseFloat(rv.total_revenue)   || 0,
        online:  parseFloat(rv.online_revenue)  || 0,
        cod:     parseFloat(rv.cod_revenue)     || 0,
      },
      recentOrders,
      lowStockProducts: lowStock,
    });
  } catch (err) {
    console.error('[adminController.getDashboard]', err.message);
    res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
};

// ─── Products ────────────────────────────────────────────────────────────────

exports.listProducts = async (req, res) => {
  try {
    const { search, category, status, sort, page = 1, limit = 20 } = req.query;
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset   = (pageNum - 1) * pageSize;

    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (p.name ILIKE ? OR p.sku ILIKE ? OR p.material ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (category) {
      where += ' AND p.category_id = ?';
      params.push(parseInt(category, 10));
    }
    if (status === 'active')   { where += ' AND p.is_active = TRUE'; }
    if (status === 'inactive') { where += ' AND p.is_active = FALSE'; }
    if (status === 'out_of_stock') { where += ' AND p.stock = 0'; }
    if (status === 'low_stock')    { where += ' AND p.stock > 0 AND p.stock <= 5'; }

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc')  orderBy = 'p.price ASC';
    if (sort === 'price_desc') orderBy = 'p.price DESC';
    if (sort === 'stock_asc')  orderBy = 'p.stock ASC';
    if (sort === 'name_asc')   orderBy = 'p.name ASC';

    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM products p WHERE ${where}`,
      params
    );
    const total = Number(countResult[0].total);

    const products = await db.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // Attach primary image for each product
    const productIds = products.map((p) => p.id);
    let images = [];
    if (productIds.length) {
      images = await db.query(
        `SELECT * FROM product_images WHERE product_id IN (?) AND is_primary = TRUE`,
        [productIds]
      );
    }
    const imageMap = {};
    for (const img of images) imageMap[img.product_id] = img.image_path;

    const result = products.map((p) => ({
      ...p,
      primary_image: imageMap[p.id] || null,
    }));

    res.json({
      products: result,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('[adminController.listProducts]', err.message);
    res.status(500).json({ message: 'Failed to load products.' });
  }
};

exports.updateInventory = async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!productId) return res.status(400).json({ message: 'Invalid product ID.' });

  const stock = parseInt(req.body.stock, 10);
  if (isNaN(stock) || stock < 0) {
    return res.status(400).json({ message: 'Stock must be a non-negative integer.' });
  }

  try {
    const result = await db.query(
      'UPDATE products SET stock = ? WHERE id = ?',
      [stock, productId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });

    await auditLog(req.user.id, 'inventory_update', 'product', productId, { newStock: stock });
    res.json({ message: 'Stock updated.', productId, stock });
  } catch (err) {
    console.error('[adminController.updateInventory]', err.message);
    res.status(500).json({ message: 'Failed to update inventory.' });
  }
};

exports.archiveProduct = async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!productId) return res.status(400).json({ message: 'Invalid product ID.' });

  try {
    const result = await db.query(
      'UPDATE products SET is_active = FALSE WHERE id = ?',
      [productId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });

    await auditLog(req.user.id, 'product_archived', 'product', productId);
    res.json({ message: 'Product archived.' });
  } catch (err) {
    console.error('[adminController.archiveProduct]', err.message);
    res.status(500).json({ message: 'Failed to archive product.' });
  }
};

exports.unarchiveProduct = async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!productId) return res.status(400).json({ message: 'Invalid product ID.' });

  try {
    const result = await db.query(
      'UPDATE products SET is_active = TRUE WHERE id = ?',
      [productId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });

    await auditLog(req.user.id, 'product_unarchived', 'product', productId);
    res.json({ message: 'Product restored.' });
  } catch (err) {
    console.error('[adminController.unarchiveProduct]', err.message);
    res.status(500).json({ message: 'Failed to restore product.' });
  }
};

// ─── Orders ──────────────────────────────────────────────────────────────────

exports.listOrders = async (req, res) => {
  try {
    const { search, status, payment_status, sort, page = 1, limit = 20, from, to } = req.query;
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset   = (pageNum - 1) * pageSize;

    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (o.order_number ILIKE ? OR u.full_name ILIKE ? OR u.email ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status && status !== 'all') {
      where += ' AND o.status = ?';
      params.push(status);
    }
    if (payment_status && payment_status !== 'all') {
      where += ' AND o.payment_status = ?';
      params.push(payment_status);
    }
    if (from) { where += ' AND o.created_at >= ?'; params.push(from); }
    if (to)   { where += ' AND o.created_at <= ?'; params.push(to + 'T23:59:59.999Z'); }

    let orderBy = 'o.created_at DESC';
    if (sort === 'amount_desc') orderBy = 'o.total_amount DESC';
    if (sort === 'amount_asc')  orderBy = 'o.total_amount ASC';
    if (sort === 'oldest')      orderBy = 'o.created_at ASC';

    const countResult = await db.query(
      `SELECT COUNT(*) AS total
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE ${where}`,
      params
    );
    const total = Number(countResult[0].total);

    const orders = await db.query(
      `SELECT o.*, COALESCE(o.customer_name, u.full_name, 'Guest Customer') AS full_name, u.email, COALESCE(o.shipping_phone, u.phone) AS phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // Fetch items for these orders
    const orderIds = orders.map((o) => o.id);
    let items = [];
    if (orderIds.length) {
      items = await db.query(
        'SELECT * FROM order_items WHERE order_id IN (?)',
        [orderIds]
      );
    }
    const itemsMap = {};
    for (const item of items) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    }

    const result = orders.map((o) => ({ ...o, items: itemsMap[o.id] || [] }));

    res.json({
      orders: result,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('[adminController.listOrders]', err.message);
    res.status(500).json({ message: 'Failed to load orders.' });
  }
};

exports.getOrderDetail = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (!orderId) return res.status(400).json({ message: 'Invalid order ID.' });

  try {
    const orders = await db.query(
      `SELECT o.*, COALESCE(o.customer_name, u.full_name, 'Guest Customer') AS full_name, u.email, COALESCE(o.shipping_phone, u.phone) AS phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );
    if (!orders.length) return res.status(404).json({ message: 'Order not found.' });

    const items = await db.query(
      'SELECT oi.*, p.sku, p.material FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [orderId]
    );

    res.json({ ...orders[0], items });
  } catch (err) {
    console.error('[adminController.getOrderDetail]', err.message);
    res.status(500).json({ message: 'Failed to load order.' });
  }
};

// ─── Customers ───────────────────────────────────────────────────────────────

exports.listCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset   = (pageNum - 1) * pageSize;

    let where = "u.role = 'customer'";
    const params = [];

    if (search) {
      where += ' AND (u.full_name ILIKE ? OR u.email ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
      params
    );
    const total = Number(countResult[0].total);

    const customers = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.city, u.state, u.role, u.created_at,
              COUNT(o.id) AS order_count,
              COALESCE(SUM(o.total_amount), 0) AS total_spent
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'cancelled'
       WHERE ${where}
       GROUP BY u.id, u.full_name, u.email, u.phone, u.city, u.state, u.role, u.created_at
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      customers,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('[adminController.listCustomers]', err.message);
    res.status(500).json({ message: 'Failed to load customers.' });
  }
};

exports.getCustomerDetail = async (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  if (!customerId) return res.status(400).json({ message: 'Invalid customer ID.' });

  try {
    const users = await db.query(
      `SELECT id, full_name, email, phone, address, city, state, pincode, role, created_at
       FROM users WHERE id = ? AND role = 'customer'`,
      [customerId]
    );
    if (!users.length) return res.status(404).json({ message: 'Customer not found.' });

    const orders = await db.query(
      `SELECT id, order_number, total_amount, status, payment_method, payment_status, created_at
       FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [customerId]
    );

    res.json({ ...users[0], orders });
  } catch (err) {
    console.error('[adminController.getCustomerDetail]', err.message);
    res.status(500).json({ message: 'Failed to load customer.' });
  }
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

exports.listReviews = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset   = (pageNum - 1) * pageSize;

    let where = '1=1';
    const params = [];

    if (status === 'approved')  { where += " AND r.status = 'approved'"; }
    if (status === 'pending')   { where += " AND r.status = 'pending'"; }
    if (status === 'hidden')    { where += " AND r.status = 'hidden'"; }

    if (search) {
      where += ' AND (p.name ILIKE ? OR r.reviewer_name ILIKE ? OR r.review_text ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) AS total
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       WHERE ${where}`,
      params
    );
    const total = Number(countResult[0].total);

    const reviews = await db.query(
      `SELECT r.*, p.name AS product_name, u.email AS user_email
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      reviews,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('[adminController.listReviews]', err.message);
    res.status(500).json({ message: 'Failed to load reviews.' });
  }
};

exports.moderateReview = async (req, res) => {
  const reviewId = parseInt(req.params.id, 10);
  if (!reviewId) return res.status(400).json({ message: 'Invalid review ID.' });

  const { action } = req.body;
  const allowedActions = ['approve', 'hide', 'delete'];
  if (!allowedActions.includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Use approve, hide, or delete.' });
  }

  try {
    if (action === 'delete') {
      const result = await db.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
      if (!result.affectedRows) return res.status(404).json({ message: 'Review not found.' });
      await auditLog(req.user.id, 'review_deleted', 'review', reviewId);
      return res.json({ message: 'Review deleted.' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'hidden';
    const result = await db.query(
      'UPDATE reviews SET status = ?, moderated_by = ?, moderated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, req.user.id, reviewId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Review not found.' });

    await auditLog(req.user.id, `review_${newStatus}`, 'review', reviewId);
    res.json({ message: `Review ${newStatus}.` });
  } catch (err) {
    console.error('[adminController.moderateReview]', err.message);
    res.status(500).json({ message: 'Failed to moderate review.' });
  }
};

// ─── Audit Log ───────────────────────────────────────────────────────────────

exports.getAuditLog = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity_type } = req.query;
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset   = (pageNum - 1) * pageSize;

    let where = '1=1';
    const params = [];

    if (action)      { where += ' AND al.action = ?';      params.push(action); }
    if (entity_type) { where += ' AND al.entity_type = ?'; params.push(entity_type); }

    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM audit_log al WHERE ${where}`,
      params
    );
    const total = Number(countResult[0].total);

    const logs = await db.query(
      `SELECT al.*, u.full_name AS admin_name, u.email AS admin_email
       FROM audit_log al
       JOIN users u ON al.admin_id = u.id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('[adminController.getAuditLog]', err.message);
    res.status(500).json({ message: 'Failed to load audit log.' });
  }
};
