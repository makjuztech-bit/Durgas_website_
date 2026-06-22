const db = require('../config/db');

exports.getDashboardStats = (req, res) => {
  const queries = {
    totalProducts: 'SELECT COUNT(*) AS count FROM products',
    totalOrders: 'SELECT COUNT(*) AS count FROM orders',
    totalCustomers: "SELECT COUNT(*) AS count FROM users WHERE role = 'customer'",
    totalRevenue: 'SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE status != "cancelled"',
  };

  const stats = {};
  const keys = Object.keys(queries);
  let completed = 0;

  keys.forEach((key) => {
    db.query(queries[key], (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      stats[key] = key === 'totalRevenue' ? parseFloat(rows[0].total) : rows[0].count;
      completed++;
      if (completed === keys.length) {
        res.json({
          totalProducts: stats.totalProducts,
          totalOrders: stats.totalOrders,
          totalCustomers: stats.totalCustomers,
          totalRevenue: stats.totalRevenue,
        });
      }
    });
  });
};

exports.getReviews = (req, res) => {
  const sql = `
    SELECT r.*, p.name AS product_name
    FROM reviews r
    JOIN products p ON r.product_id = p.id
    ORDER BY r.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.getProductReviews = (req, res) => {
  db.query(
    'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
    [req.params.productId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    }
  );
};
