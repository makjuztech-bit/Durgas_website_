const db = require('../config/db');

exports.addToCart = (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const userId = req.user.id;

  db.query(
    'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?',
    [userId, product_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });

      if (rows.length) {
        const newQty = rows[0].quantity + quantity;
        db.query(
          'UPDATE cart SET quantity = ? WHERE id = ?',
          [newQty, rows[0].id],
          (updErr) => {
            if (updErr) return res.status(500).json({ message: updErr.message });
            res.json({ message: 'Cart updated', id: rows[0].id });
          }
        );
      } else {
        db.query(
          'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [userId, product_id, quantity],
          (insErr, result) => {
            if (insErr) return res.status(500).json({ message: insErr.message });
            res.status(201).json({ message: 'Added to cart', id: result.insertId });
          }
        );
      }
    }
  );
};

exports.getCart = (req, res) => {
  const sql = `
    SELECT c.id, c.quantity, p.id AS product_id, p.name, p.price, p.material, p.purity,
           (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) AS image
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(sql, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.removeFromCart = (req, res) => {
  db.query(
    'DELETE FROM cart WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(404).json({ message: 'Cart item not found' });
      res.json({ message: 'Removed from cart' });
    }
  );
};

exports.clearCart = (req, res) => {
  db.query('DELETE FROM cart WHERE user_id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Cart cleared' });
  });
};
