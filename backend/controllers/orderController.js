const db = require('../config/db');

const generateOrderNumber = () => {
  return 'DUR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

exports.createOrder = (req, res) => {
  const {
    shipping_address, shipping_city, shipping_state,
    shipping_pincode, shipping_phone, payment_method,
  } = req.body;
  const userId = req.user.id;

  const cartSql = `
    SELECT c.quantity, p.id AS product_id, p.name, p.price, p.stock
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(cartSql, [userId], (err, cartItems) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!cartItems.length) return res.status(400).json({ message: 'Cart is empty' });

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = generateOrderNumber();

    db.query(
      `INSERT INTO orders
       (user_id, order_number, total_amount, shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, orderNumber, total, shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, payment_method || 'cod'],
      (orderErr, orderResult) => {
        if (orderErr) return res.status(500).json({ message: orderErr.message });

        const orderId = orderResult.insertId;
        const itemValues = cartItems.map((item) => [
          orderId, item.product_id, item.name, item.quantity, item.price,
        ]);

        db.query(
          'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?',
          [itemValues],
          (itemsErr) => {
            if (itemsErr) return res.status(500).json({ message: itemsErr.message });

            cartItems.forEach((item) => {
              db.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
              );
            });

            db.query('DELETE FROM cart WHERE user_id = ?', [userId], (clearErr) => {
              if (clearErr) return res.status(500).json({ message: clearErr.message });
              res.status(201).json({
                message: 'Order placed successfully',
                order_id: orderId,
                order_number: orderNumber,
                total_amount: total,
              });
            });
          }
        );
      }
    );
  });
};

exports.getOrders = (req, res) => {
  const isAdmin = req.user.role === 'superadmin';
  const sql = isAdmin
    ? `SELECT o.*, u.full_name, u.email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`
    : `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`;
  const params = isAdmin ? [] : [req.user.id];

  db.query(sql, params, (err, orders) => {
    if (err) return res.status(500).json({ message: err.message });

    if (!orders.length) return res.json([]);

    const orderIds = orders.map((o) => o.id);
    db.query(
      'SELECT * FROM order_items WHERE order_id IN (?)',
      [orderIds],
      (itemsErr, items) => {
        if (itemsErr) return res.status(500).json({ message: itemsErr.message });

        const result = orders.map((order) => ({
          ...order,
          items: items.filter((i) => i.order_id === order.id),
        }));
        res.json(result);
      }
    );
  });
};

exports.getOrderById = (req, res) => {
  const isAdmin = req.user.role === 'superadmin';
  let sql = 'SELECT * FROM orders WHERE id = ?';
  const params = [req.params.id];

  if (!isAdmin) {
    sql += ' AND user_id = ?';
    params.push(req.user.id);
  }

  db.query(sql, params, (err, orders) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!orders.length) return res.status(404).json({ message: 'Order not found' });

    db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orders[0].id],
      (itemsErr, items) => {
        if (itemsErr) return res.status(500).json({ message: itemsErr.message });
        res.json({ ...orders[0], items });
      }
    );
  });
};

exports.updateOrderStatus = (req, res) => {
  const { status } = req.body;
  db.query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(404).json({ message: 'Order not found' });
      res.json({ message: 'Order status updated' });
    }
  );
};
