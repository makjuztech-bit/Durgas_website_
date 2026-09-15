const db = require('../config/db');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const validShipping = (data) => [
  data.shipping_address, data.shipping_city, data.shipping_state,
  data.shipping_pincode, data.shipping_phone,
].every((value) => typeof value === 'string' && value.trim().length > 0);

const query = (connection, sql, params = []) => new Promise((resolve, reject) => {
  connection.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
});

const placeOrderTransaction = async (userId, shippingData, paymentMethod, paymentMeta = {}) => {
  const connection = await new Promise((resolve, reject) => db.getConnection((err, conn) => err ? reject(err) : resolve(conn)));
  try {
    await query(connection, 'START TRANSACTION');
    if (paymentMeta.paymentAttemptId) {
      const paymentAttempts = await query(connection, 'SELECT status FROM payment_attempts WHERE id = ? AND user_id = ? FOR UPDATE', [paymentMeta.paymentAttemptId, userId]);
      if (!paymentAttempts.length || paymentAttempts[0].status !== 'pending') {
        throw Object.assign(new Error('Payment has already been processed or is no longer valid.'), { status: 409 });
      }
    }
    const cartItems = await query(connection, `
      SELECT c.quantity, p.id AS product_id, p.name, p.price, p.stock
      FROM cart c JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ? AND p.is_active = 1 FOR UPDATE
    `, [userId]);
    if (!cartItems.length) throw Object.assign(new Error('Cart is empty.'), { status: 400 });
    const unavailable = cartItems.find((item) => item.quantity < 1 || item.quantity > item.stock);
    if (unavailable) throw Object.assign(new Error(`Insufficient stock for ${unavailable.name}.`), { status: 409 });

    const total = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const orderNumber = generateOrderNumber();
    const paymentStatus = paymentMethod === 'razorpay' ? 'paid' : 'pending';
    const orderResult = await query(connection, `INSERT INTO orders
      (user_id, order_number, total_amount, shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, payment_method, payment_status, razorpay_order_id, razorpay_payment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      userId, orderNumber, total, shippingData.shipping_address.trim(), shippingData.shipping_city.trim(),
      shippingData.shipping_state.trim(), shippingData.shipping_pincode.trim(), shippingData.shipping_phone.trim(),
      paymentMethod, paymentStatus, paymentMeta.razorpay_order_id || null, paymentMeta.razorpay_payment_id || null,
    ]);
    const itemValues = cartItems.map((item) => [orderResult.insertId, item.product_id, item.name, item.quantity, item.price]);
    await query(connection, 'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?', [itemValues]);
    for (const item of cartItems) {
      const update = await query(connection, 'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [item.quantity, item.product_id, item.quantity]);
      if (!update.affectedRows) throw Object.assign(new Error(`Insufficient stock for ${item.name}.`), { status: 409 });
    }
    await query(connection, 'DELETE FROM cart WHERE user_id = ?', [userId]);
    if (paymentMeta.paymentAttemptId) {
      const paymentUpdate = await query(connection, 'UPDATE payment_attempts SET status = \'paid\', order_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ? AND status = \'pending\'', [orderResult.insertId, paymentMeta.paymentAttemptId]);
      if (!paymentUpdate.affectedRows) throw Object.assign(new Error('Payment has already been processed.'), { status: 409 });
    }
    await query(connection, 'COMMIT');
    return { order_id: orderResult.insertId, order_number: orderNumber, total_amount: total, payment_method: paymentMethod, payment_status: paymentStatus, razorpay_order_id: paymentMeta.razorpay_order_id || null, razorpay_payment_id: paymentMeta.razorpay_payment_id || null };
  } catch (err) {
    await query(connection, 'ROLLBACK').catch(() => {});
    throw err;
  } finally {
    connection.release();
  }
};

const generateOrderNumber = () => {
  return 'DUR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

exports.createOrder = (req, res) => {
  const {
    shipping_address, shipping_city, shipping_state,
    shipping_pincode, shipping_phone, payment_method,
  } = req.body;

  if (payment_method === 'razorpay') {
    return res.status(400).json({ message: 'Use Razorpay checkout for online payment.' });
  }

  if (!['cod'].includes(payment_method || 'cod')) {
    return res.status(400).json({ message: 'Payment method must be COD or Razorpay.' });
  }
  if (!validShipping({ shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone })) {
    return res.status(400).json({ message: 'Complete shipping details are required.' });
  }

  const shippingData = {
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_pincode,
    shipping_phone,
  };

  placeOrderTransaction(req.user.id, shippingData, payment_method || 'cod').then((orderSummary) => {
    res.status(201).json({
      message: 'Order placed successfully',
      ...orderSummary,
    });
  }).catch((err) => res.status(err.status || 500).json({ message: err.message }));
};

exports.createRazorpayOrder = (req, res) => {
  const userId = req.user.id;
  const cartSql = `
    SELECT c.quantity, p.price, p.stock, p.name
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(cartSql, [userId], (err, cartItems) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!cartItems.length) return res.status(400).json({ message: 'Cart is empty.' });
    const unavailable = cartItems.find((item) => item.quantity < 1 || item.quantity > item.stock);
    if (unavailable) return res.status(409).json({ message: `Insufficient stock for ${unavailable.name}.` });

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total <= 0) return res.status(400).json({ message: 'Cart total must be greater than zero.' });

    const options = {
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    razorpay.orders.create(options, (createErr, order) => {
      if (createErr) return res.status(502).json({ message: 'Unable to create payment order.' });
      db.query('INSERT INTO payment_attempts (user_id, razorpay_order_id, amount_paise) VALUES (?, ?, ?)', [userId, order.id, order.amount], (attemptErr) => {
        if (attemptErr) return res.status(500).json({ message: attemptErr.message });
        res.json({
        key: process.env.RAZORPAY_KEY_ID,
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        total_amount: total,
        });
      });
    });
  });
};

exports.paymentFailed = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id } = req.body || {};
  if (!razorpay_order_id) return res.status(400).json({ message: 'Payment order reference is required.' });
  db.query('UPDATE payment_attempts SET status = \'failed\' WHERE user_id = ? AND razorpay_order_id = ? AND status = \'pending\'', [req.user.id, razorpay_order_id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    if (razorpay_payment_id) {
      return res.json({ message: result.affectedRows ? 'Payment marked as failed.' : 'Payment status already recorded.' });
    }
    res.json({ message: 'Payment canceled.' });
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

  if (!validShipping({ shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone })) {
    return res.status(400).json({ message: 'Complete shipping details are required.' });
  }

  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const signaturesMatch = generated_signature.length === razorpay_signature.length && crypto.timingSafeEqual(Buffer.from(generated_signature), Buffer.from(razorpay_signature));
  if (!signaturesMatch) {
    return res.status(400).json({ message: 'Invalid payment signature.' });
  }

  const shippingData = {
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_pincode,
    shipping_phone,
  };

  db.query('SELECT id, amount_paise, status, order_id FROM payment_attempts WHERE user_id = ? AND razorpay_order_id = ?', [req.user.id, razorpay_order_id], (attemptErr, attempts) => {
    if (attemptErr) return res.status(500).json({ message: attemptErr.message });
    if (!attempts.length) return res.status(400).json({ message: 'Payment session not found.' });
    const attempt = attempts[0];
    if (attempt.status === 'paid' && attempt.order_id) return exports.getOrderById({ ...req, params: { id: attempt.order_id } }, res);
    const expectedAmount = Number(attempt.amount_paise);
    db.query('SELECT SUM(c.quantity * p.price) AS total FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?', [req.user.id], (totalErr, totals) => {
      if (totalErr) return res.status(500).json({ message: totalErr.message });
      if (Math.round(Number(totals[0]?.total || 0) * 100) !== expectedAmount) return res.status(409).json({ message: 'Cart changed. Please restart checkout.' });
      placeOrderTransaction(req.user.id, shippingData, 'razorpay', { razorpay_order_id, razorpay_payment_id, paymentAttemptId: attempt.id }).then((orderSummary) => {
    res.status(201).json({
      message: 'Payment verified and order placed successfully',
      ...orderSummary,
    });
      }).catch((err) => res.status(err.status || 500).json({ message: err.message }));
    });
  });
};

exports.getOrders = (req, res) => {
  const isAdmin = ['superadmin', 'admin'].includes(req.user.role);
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
  const isAdmin = ['superadmin', 'admin'].includes(req.user.role);
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
  const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid order status.' });
  }
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
