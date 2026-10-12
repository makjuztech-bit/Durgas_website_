const db = require('../config/db');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const emailService = require('../services/emailService');

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

const generateOrderNumber = () => {
  return 'DUR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

const generateInvoiceNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-DUR-${dateStr}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

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

    const gstRate = parseFloat(process.env.JEWELLERY_GST_RATE || '3.0');
    const total = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const subtotal = Math.round((total / (1 + (gstRate / 100))) * 100) / 100;
    const taxAmount = Math.round((total - subtotal) * 100) / 100;
    const orderNumber = generateOrderNumber();
    const invoiceNumber = generateInvoiceNumber();
    const paymentStatus = paymentMethod === 'razorpay' ? 'paid' : 'pending';

    const orderResult = await query(connection, `INSERT INTO orders
      (user_id, order_number, subtotal_amount, tax_amount, total_amount, invoice_number, shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, payment_method, payment_status, razorpay_order_id, razorpay_payment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      userId, orderNumber, subtotal, taxAmount, total, invoiceNumber,
      shippingData.shipping_address.trim(), shippingData.shipping_city.trim(),
      shippingData.shipping_state.trim(), shippingData.shipping_pincode.trim(), shippingData.shipping_phone.trim(),
      paymentMethod, paymentStatus, paymentMeta.razorpay_order_id || null, paymentMeta.razorpay_payment_id || null,
    ]);

    for (const item of cartItems) {
      const itemTotal = Number(item.price) * item.quantity;
      const itemSubtotal = Math.round((itemTotal / (1 + (gstRate / 100))) * 100) / 100;
      const itemTax = Math.round((itemTotal - itemSubtotal) * 100) / 100;
      await query(connection, `
        INSERT INTO order_items (order_id, product_id, product_name, quantity, price, tax_rate, tax_amount, hallmark_details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [orderResult.insertId, item.product_id, item.name, item.quantity, item.price, gstRate, itemTax, 'BIS 916/750 Certified']);
    }

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

    // Trigger tax invoice confirmation email asynchronously
    query(connection, 'SELECT email, full_name FROM users WHERE id = ?', [userId]).then((userRows) => {
      if (userRows && userRows.length) {
        emailService.sendOrderConfirmation({
          order: {
            order_number: orderNumber,
            invoice_number: invoiceNumber,
            subtotal_amount: subtotal,
            tax_amount: taxAmount,
            total_amount: total,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            shipping_address: shippingData.shipping_address,
            shipping_city: shippingData.shipping_city,
            shipping_state: shippingData.shipping_state,
            shipping_pincode: shippingData.shipping_pincode,
            shipping_phone: shippingData.shipping_phone,
          },
          items: cartItems,
          customerEmail: userRows[0].email,
          customerName: userRows[0].full_name,
        }).catch((e) => console.error('[email dispatch error]', e.message));
      }
    }).catch(() => {});

    return {
      order_id: orderResult.insertId,
      order_number: orderNumber,
      invoice_number: invoiceNumber,
      subtotal_amount: subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      razorpay_order_id: paymentMeta.razorpay_order_id || null,
      razorpay_payment_id: paymentMeta.razorpay_payment_id || null
    };
  } catch (err) {
    await query(connection, 'ROLLBACK').catch(() => {});
    throw err;
  } finally {
    connection.release();
  }
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

      razorpay.payments.fetch(razorpay_payment_id).then((payment) => {
        if (
          payment.order_id !== razorpay_order_id
          || Number(payment.amount) !== expectedAmount
          || payment.currency !== 'INR'
          || payment.status !== 'captured'
        ) {
          return res.status(400).json({ message: 'Payment is not captured or does not match the order.' });
        }

        return placeOrderTransaction(req.user.id, shippingData, 'razorpay', {
          razorpay_order_id,
          razorpay_payment_id,
          paymentAttemptId: attempt.id,
        }).then((orderSummary) => {
          res.status(201).json({ message: 'Payment verified and order placed successfully', ...orderSummary });
        });
      }).catch((err) => {
        if (res.headersSent) return;
        res.status(err.status || 502).json({ message: err.status ? err.message : 'Unable to verify payment with Razorpay.' });
      });
    });
  });
};

exports.getOrders = (req, res) => {
  const isAdmin = ['superadmin', 'admin'].includes(req.user.role);
  const sql = isAdmin
    ? `SELECT o.*, COALESCE(o.customer_name, u.full_name, 'Guest Customer') AS full_name, u.email FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`
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

exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid order status.' });
  }

  const connection = await new Promise((resolve, reject) => db.getConnection((err, conn) => err ? reject(err) : resolve(conn)));
  
  try {
    await query(connection, 'START TRANSACTION');
    
    // Lock the order
    const orders = await query(connection, 'SELECT status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!orders.length) {
      await query(connection, 'ROLLBACK');
      connection.release();
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const currentStatus = orders[0].status;
    
    // Restock if cancelling
    if (status === 'cancelled' && currentStatus !== 'cancelled') {
      const items = await query(connection, 'SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await query(connection, 'UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    } else if (currentStatus === 'cancelled' && status !== 'cancelled') {
       // Deduct stock if un-cancelling
       const items = await query(connection, 'SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
       for (const item of items) {
         const update = await query(connection, 'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [item.quantity, item.product_id, item.quantity]);
         if (!update.affectedRows) {
            throw new Error(`Insufficient stock to un-cancel order.`);
         }
       }
    }

    await query(connection, 'UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    await query(connection, 'COMMIT');
    res.json({ message: 'Order status updated' });
  } catch (err) {
    await query(connection, 'ROLLBACK').catch(() => {});
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!secret || !signature || !req.rawBody) {
    return res.status(400).send('Invalid webhook request');
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('hex');

    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
    ) {
      return res.status(400).send('Invalid signature');
    }
  } catch (err) {
    return res.status(400).send('Signature validation failed');
  }

  const event = req.body?.event;
  const eventId = req.body?.id || req.headers['x-razorpay-event-id'] || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payloadEntity = req.body?.payload?.payment?.entity || req.body?.payload?.order?.entity || {};
  const razorpay_order_id = payloadEntity.order_id || payloadEntity.id;

  const connection = await new Promise((resolve, reject) => db.getConnection((err, conn) => err ? reject(err) : resolve(conn)));

  try {
    await query(connection, 'START TRANSACTION');

    // Webhook Idempotency Check: if event already processed, exit early with 200
    const existingLogs = await query(connection, 'SELECT status FROM payment_webhook_logs WHERE event_id = ? FOR UPDATE', [eventId]);
    if (existingLogs.length && existingLogs[0].status === 'processed') {
      await query(connection, 'COMMIT');
      return res.status(200).send('Webhook event already processed');
    }

    if (!existingLogs.length) {
      await query(connection, `
        INSERT INTO payment_webhook_logs (event_id, event_type, entity_id, payload, status)
        VALUES (?, ?, ?, ?, 'pending')
      `, [eventId, event || 'unknown', razorpay_order_id || null, JSON.stringify(req.body)]);
    }

    if (event === 'order.paid' || event === 'payment.captured') {
      if (razorpay_order_id) {
        const attempts = await query(connection, 'SELECT id, status, order_id FROM payment_attempts WHERE razorpay_order_id = ? FOR UPDATE', [razorpay_order_id]);
        if (attempts.length && attempts[0].status === 'pending') {
          await query(connection, 'UPDATE payment_attempts SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?', ['paid', attempts[0].id]);
          if (attempts[0].order_id) {
            await query(connection, 'UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', attempts[0].order_id]);
          }
        }
      }
    } else if (event === 'payment.failed') {
      if (razorpay_order_id) {
        await query(connection, 'UPDATE payment_attempts SET status = ? WHERE razorpay_order_id = ? AND status = ?', ['failed', razorpay_order_id, 'pending']);
      }
    }

    // Mark webhook log as processed
    await query(connection, 'UPDATE payment_webhook_logs SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE event_id = ?', ['processed', eventId]);

    await query(connection, 'COMMIT');
    res.status(200).send('Webhook processed');
  } catch (err) {
    await query(connection, 'ROLLBACK').catch(() => {});
    console.error('Webhook error:', err);
    res.status(500).send('Internal Server Error');
  } finally {
    connection.release();
  }
};

exports.recordWhatsAppInquiry = async (req, res) => {
  const { customer_name, customer_phone, shipping_address, shipping_city, shipping_state, shipping_pincode, items, total_amount, notes } = req.body;

  try {
    const userId = req.user?.id || null;
    const orderNumber = 'WA-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = 'WA-INQ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const total = parseFloat(total_amount) || 0;
    const subtotal = Math.round((total / 1.03) * 100) / 100;
    const taxAmount = Math.round((total - subtotal) * 100) / 100;

    const orderResult = await db.query(
      `INSERT INTO orders 
      (user_id, order_number, subtotal_amount, tax_amount, total_amount, invoice_number, 
       shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, 
       payment_method, payment_status, status, order_source, customer_name, customer_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'whatsapp', 'pending', 'pending', 'whatsapp', ?, ?)`,
      [
        userId,
        orderNumber,
        subtotal,
        taxAmount,
        total,
        invoiceNumber,
        (shipping_address || '').trim(),
        (shipping_city || '').trim(),
        (shipping_state || 'Tamil Nadu').trim(),
        (shipping_pincode || '').trim(),
        (customer_phone || '').trim(),
        (customer_name || 'Customer').trim(),
        (notes || 'WhatsApp Order Inquiry initiated by customer').trim(),
      ]
    );

    const orderId = orderResult.insertId;

    if (Array.isArray(items) && items.length && orderId) {
      for (const item of items) {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQty = parseInt(item.quantity, 10) || 1;
        const itemTax = Math.round((itemPrice * itemQty * 0.03) * 100) / 100;
        await db.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, tax_rate, tax_amount, hallmark_details)
           VALUES (?, ?, ?, ?, ?, 3.0, ?, ?)`,
          [
            orderId,
            item.product_id || item.id || null,
            item.name || 'Jewellery Item',
            itemQty,
            itemPrice,
            itemTax,
            item.metal_composition || 'Five-Metal Jewellery Verified',
          ]
        ).catch(() => {});
      }
    }

    res.status(201).json({
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      message: 'WhatsApp order inquiry recorded',
    });
  } catch (err) {
    console.error('Error recording WhatsApp inquiry:', err.message);
    res.status(500).json({ message: 'Error recording WhatsApp inquiry: ' + err.message });
  }
};

