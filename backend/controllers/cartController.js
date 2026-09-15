const db = require('../config/db');

exports.addToCart = (req, res) => {
  const { product_id, quantity = 1 } = req.body || {};
  const userId = req.user.id;

  if (!Number.isInteger(Number(product_id)) || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 99) {
    return res.status(400).json({ message: 'A valid product and quantity between 1 and 99 are required.' });
  }

  db.query(
    'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?',
    [userId, product_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });

      db.query('SELECT stock, is_active FROM products WHERE id = ?', [product_id], (productErr, products) => {
        if (productErr) return res.status(500).json({ message: productErr.message });
        if (!products.length || !products[0].is_active) return res.status(404).json({ message: 'Product is unavailable.' });
        const requested = (rows.length ? rows[0].quantity : 0) + Number(quantity);
        if (requested > products[0].stock) return res.status(400).json({ message: 'Requested quantity is not available.' });

      if (rows.length) {
        const newQty = requested;
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
          [userId, product_id, Number(quantity)],
          (insErr, result) => {
            if (insErr) return res.status(500).json({ message: insErr.message });
            res.status(201).json({ message: 'Added to cart', id: result.insertId });
          }
        );
      }
      });
    }
  );
};

exports.updateCart = (req, res) => {
  const quantity = Number(req.body?.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return res.status(400).json({ message: 'Quantity must be an integer between 1 and 99.' });
  }
  db.query(
    `UPDATE cart c JOIN products p ON p.id = c.product_id
     SET c.quantity = ? WHERE c.id = ? AND c.user_id = ? AND p.stock >= ?`,
    [quantity, req.params.id, req.user.id, quantity],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(400).json({ message: 'Cart item not found or quantity exceeds stock.' });
      res.json({ message: 'Cart quantity updated' });
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
