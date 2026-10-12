const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { generateInvoiceHtml } = require('../services/emailService');

test('Sensitive files (.env, .git, package.json, schema.sql) are strictly blocked', async (t) => {
  const app = express();

  // Test middleware matching app.js
  app.use((req, res, next) => {
    const pathLower = req.path.toLowerCase();
    if (
      pathLower.includes('/.env') ||
      pathLower.includes('/.git') ||
      pathLower.includes('/node_modules') ||
      pathLower.includes('/package.json') ||
      pathLower.includes('/package-lock.json') ||
      pathLower.includes('/schema.sql') ||
      pathLower.includes('/docker-compose')
    ) {
      return res.status(404).json({ message: 'Not found' });
    }
    next();
  });

  app.get('/allowed', (req, res) => res.json({ ok: true }));

  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const envRes = await fetch(`${origin}/.env`);
  assert.equal(envRes.status, 404);

  const gitRes = await fetch(`${origin}/.git/config`);
  assert.equal(gitRes.status, 404);

  const pkgRes = await fetch(`${origin}/package.json`);
  assert.equal(pkgRes.status, 404);

  const schemaRes = await fetch(`${origin}/schema.sql`);
  assert.equal(schemaRes.status, 404);

  const allowedRes = await fetch(`${origin}/allowed`);
  assert.equal(allowedRes.status, 200);
});

test('GST tax invoice generator produces compliant 3% GST breakdown', () => {
  const mockOrder = {
    order_number: 'DUR-TEST-001',
    invoice_number: 'INV-DUR-20251012-ABCD',
    subtotal_amount: 10000.00,
    tax_amount: 300.00,
    total_amount: 10300.00,
    payment_method: 'razorpay',
    payment_status: 'paid',
    shipping_address: '42 Marine Drive',
    shipping_city: 'Mumbai',
    shipping_state: 'Maharashtra',
    shipping_pincode: '400020',
    shipping_phone: '+91 98765 43210',
    created_at: new Date(),
  };

  const mockItems = [
    {
      product_name: 'Solitaire Diamond Pendant (18K Gold)',
      quantity: 1,
      price: 10300.00,
      hallmark_details: 'BIS Hallmark 750 (18K) HUID: AB12CD',
    },
  ];

  const html = generateInvoiceHtml(mockOrder, mockItems);
  assert.ok(html.includes('Tax Invoice'));
  assert.ok(html.includes('INV-DUR-20251012-ABCD'));
  assert.ok(html.includes('CGST (1.5%)'));
  assert.ok(html.includes('SGST (1.5%)'));
  assert.ok(html.includes('BIS Hallmark 750 (18K)'));
  assert.ok(html.includes('DUR-TEST-001'));
});

test('CORS rejects unexpected external origins in production mode', async (t) => {
  const cors = require('cors');
  const app = express();

  const isProd = true;
  const configured = ['https://durgasjewellers.com'];
  const allowedOrigins = [...configured];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS policy'));
    },
    credentials: true,
  }));

  app.get('/test', (req, res) => res.json({ ok: true }));

  app.use((err, req, res, next) => {
    res.status(403).json({ error: err.message });
  });

  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  // Request from unauthorized attacker origin
  const untrustedRes = await fetch(`${origin}/test`, {
    headers: { Origin: 'https://malicious-site.com' },
  });
  assert.equal(untrustedRes.status, 403);

  // Request from authorized production origin
  const trustedRes = await fetch(`${origin}/test`, {
    headers: { Origin: 'https://durgasjewellers.com' },
  });
  assert.equal(trustedRes.status, 200);
});
