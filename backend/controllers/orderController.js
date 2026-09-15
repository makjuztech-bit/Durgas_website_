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

const generateOrderNumber = () => {
  return 'DUR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

const placeOrderInDb = (userId, shippingData, payment_method, paymentMeta = {}, callback) => {
  const cartSql = `
    SELECT c.quantity, p.id AS product_id, p.name, p.price, p.stock
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(cartSql, [userId], (err, cartItems) => {
    if (err) return callback(err);
    if (!cartItems.length) return callback(Object.assign(new Error('Cart is empty'), { status: 400 }), null, null);

    const unavailable = cartItems.find((item) => item.quantity < 1 || item.quantity > item.stock);
    if (unavailable) return callback(Object.assign(new Error(`Insufficient stock for ${unavailable.name}`), { status: 400 }), null, null);
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = generateOrderNumber();
    const paymentStatus = payment_method === 'razorpay' ? 'paid' : 'pending';

    db.query(
      `INSERT INTO orders
       (user_id, order_number, total_amount, shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, tracking_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        orderNumber,
        total,
        shippingData.shipping_address,
        shippingData.shipping_city,
        shippingData.shipping_state,
        shippingData.shipping_pincode,
        shippingData.shipping_phone,
        payment_method,
        paymentStatus,
        paymentMeta.razorpay_order_id || null,
        paymentMeta.razorpay_payment_id || null,
        paymentMeta.tracking_number || null,
      ],
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
                payment_method,
                payment_status: paymentStatus,
                razorpay_order_id: paymentMeta.razorpay_order_id || null,
                razorpay_payment_id: paymentMeta.razorpay_payment_id || null,
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

  placeOrderInDb(req.user.id, shippingData, payment_method || 'cod', (err, orderSummary) => {
    if (err) return res.status(err.status || 500).json({ message: err.message });
    res.status(201).json({
      message: 'Order placed successfully',
      ...orderSummary,
    });
  });
};

exports.createRazorpayOrder = (req, res) => {
  const userId = req.user.id;
  const cartSql = `
    SELECT c.quantity, p.price
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(cartSql, [userId], (err, cartItems) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!cartItems.length) return res.status(400).json({ message: 'Cart is empty.' });

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total <= 0) return res.status(400).json({ message: 'Cart total must be greater than zero.' });

    const options = {
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    razorpay.orders.create(options, (createErr, order) => {
      if (createErr) return res.status(500).json({ message: createErr.message });
      res.json({
        key: process.env.RAZORPAY_KEY_ID,
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        total_amount: total,
      });
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

  if (!validShipping({ shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone })) {
    return res.status(400).json({ message: 'Complete shipping details are required.' });
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

  placeOrderInDb(req.user.id, shippingData, 'razorpay', {
    razorpay_order_id,
    razorpay_payment_id,
  }, (err, orderSummary) => {
    if (err) return res.status(err.status || 500).json({ message: err.message });
    res.status(201).json({
      message: 'Payment verified and order placed successfully',
      ...orderSummary,
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
