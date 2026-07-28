const db = require('../config/db');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateOrderNumber = () => {
  return 'DUR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

const placeOrderInDb = (userId, shippingData, payment_method, callback) => {
  const cartSql = `
    SELECT c.quantity, p.id AS product_id, p.name, p.price, p.stock
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(cartSql, [userId], (err, cartItems) => {
    if (err) return callback(err);
    if (!cartItems.length) return callback(new Error('Cart is empty'), null, null, 400);

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = generateOrderNumber();

    db.query(
      `INSERT INTO orders
       (user_id, order_number, total_amount, shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, orderNumber, total, shippingData.shipping_address, shippingData.shipping_city, shippingData.shipping_state, shippingData.shipping_pincode, shippingData.shipping_phone, payment_method],
      (orderErr, orderResult) => {
        if (orderErr) return callback(orderErr);

        const orderId = orderResult.insertId;
        const itemValues = cartItems.map((item) => [
          orderId, item.product_id, item.name, item.quantity, item.price,
        ]);

        db.query(
          'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?',
          [itemValues],
          (itemsErr) => {
            if (itemsErr) return callback(itemsErr);

            cartItems.forEach((item) => {
              db.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
              );
            });

            db.query('DELETE FROM cart WHERE user_id = ?', [userId], (clearErr) => {
              if (clearErr) return callback(clearErr);
              callback(null, {
                order_id: orderId,
                order_number: orderNumber,
                total_amount: total,
              }, total);
            });
          }
        );
      }
    );
  });
};

exports.createOrder = (req, res) => {
  const {
    shipping_address, shipping_city, shipping_state,
    shipping_pincode, shipping_phone, payment_method,
  } = req.body;

  if (payment_method === 'razorpay') {
    return res.status(400).json({ message: 'Use Razorpay checkout for online payment.' });
  }

  const shippingData = {
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_pincode,
    shipping_phone,
  };

  placeOrderInDb(req.user.id, shippingData, payment_method || 'cod', (err, orderSummary, total) => {
    if (err) return res.status(err.status || 500).json({ message: err.message });
    res.status(201).json({
      message: 'Order placed successfully',
      ...orderSummary,
    });
  });
};

exports.createRazorpayOrder = (req, res) => {
  const { amount } = req.body;
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Invalid order amount' });
  }

  const options = {
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    payment_capture: 1,
  };

  razorpay.orders.create(options, (err, order) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  });
};

exports.verifyRazorpayOrder = (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_pincode,
    shipping_phone,
  } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing Razorpay payment details.' });
  }

  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ message: 'Invalid payment signature.' });
  }

  const shippingData = {
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_pincode,
    shipping_phone,
  };

  placeOrderInDb(req.user.id, shippingData, 'razorpay', (err, orderSummary) => {
    if (err) return res.status(err.status || 500).json({ message: err.message });
    res.status(201).json({
      message: 'Payment verified and order placed successfully',
      ...orderSummary,
      razorpay_payment_id,
      razorpay_order_id,
    });
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
