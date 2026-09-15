const db = require('../config/db');

exports.addToWishlist = (req, res) => {
  const { product_id } = req.body || {};

  if (!Number.isInteger(Number(product_id))) {
    return res.status(400).json({ message: 'A valid product is required.' });
  }

  db.query(
    'INSERT INTO wishlist (user_id, product_id) SELECT ?, id FROM products WHERE id = ? AND is_active = 1',
    [req.user.id, product_id],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Already in wishlist' });
        }
        return res.status(500).json({ message: err.message });
      }
      if (!result.affectedRows) return res.status(404).json({ message: 'Product is unavailable.' });
      res.status(201).json({ message: 'Added to wishlist', id: result.insertId });
    }
  );
};

exports.getWishlist = (req, res) => {
  const sql = `
    SELECT w.id, p.id AS product_id, p.name, p.price, p.material, p.purity, p.badge,
           (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) AS image
    FROM wishlist w
    JOIN products p ON w.product_id = p.id
    WHERE w.user_id = ?
  `;

  db.query(sql, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.removeFromWishlist = (req, res) => {
  db.query(
    'DELETE FROM wishlist WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(404).json({ message: 'Wishlist item not found' });
      res.json({ message: 'Removed from wishlist' });
    }
  );
};
