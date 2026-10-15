const db = require('../config/db');

exports.getDashboardStats = (req, res) => {
  const queries = {
    totalProducts: 'SELECT COUNT(*) AS count FROM products',
    totalOrders: 'SELECT COUNT(*) AS count FROM orders',
    totalCustomers: "SELECT COUNT(*) AS count FROM users WHERE role = 'customer'",
    totalRevenue: "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE status != 'cancelled'",
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
    "SELECT * FROM reviews WHERE product_id = ? AND (status IS NULL OR status = 'approved') ORDER BY created_at DESC",
    [req.params.productId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    }
  );
};

exports.addReview = (req, res) => {
  const { product_id, rating, reviewer_name, review_text } = req.body || {};
  const parsedProductId = parseInt(product_id, 10);
  if (!parsedProductId) {
    return res.status(400).json({ message: 'Valid product ID is required.' });
  }

  const parsedRating = parseInt(rating, 10);
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ message: 'Rating must be a whole number between 1 and 5 stars.' });
  }

  const cleanReviewText = (review_text || '').trim();
  if (!cleanReviewText) {
    return res.status(400).json({ message: 'Please write your review feedback before submitting.' });
  }

  const userId = req.user ? req.user.id : null;
  const cleanName = (reviewer_name || (req.user ? (req.user.full_name || req.user.name) : 'Verified Customer')).trim();

  // Verify product exists and is active
  db.query('SELECT id, name FROM products WHERE id = ?', [parsedProductId], (checkErr, prodRows) => {
    if (checkErr) return res.status(500).json({ message: checkErr.message });
    if (!prodRows.length) return res.status(404).json({ message: 'Product not found.' });

    const sql = `
      INSERT INTO reviews (product_id, user_id, reviewer_name, rating, review_text, created_at, status)
      VALUES (?, ?, ?, ?, ?, NOW(), 'approved')
    `;

    db.query(sql, [parsedProductId, userId, cleanName, parsedRating, cleanReviewText], (insErr, result) => {
      if (insErr) return res.status(500).json({ message: 'Failed to record review: ' + insErr.message });
      res.status(201).json({
        message: 'Review submitted successfully',
        review: {
          id: result.insertId,
          product_id: parsedProductId,
          user_id: userId,
          reviewer_name: cleanName,
          rating: parsedRating,
          review_text: cleanReviewText,
          created_at: new Date().toISOString()
        }
      });
    });
  });
};
