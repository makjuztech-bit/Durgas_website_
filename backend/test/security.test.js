const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createSecurityMiddleware } = require('../middleware/security');

test('adds security headers and rate-limits authentication without affecting static routes', async (t) => {
  const app = express();
  const { securityHeaders, apiLimiter, authLimiter } = createSecurityMiddleware({ apiLimit: 20, authLimit: 1 });

  app.use(securityHeaders);
  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.get('/api/ping', (req, res) => res.json({ ok: true }));
  app.post('/api/auth/login', (req, res) => res.json({ ok: true }));
  app.get('/', (req, res) => res.send('DURGAS storefront'));

  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const storefront = await fetch(`${origin}/`);
  assert.equal(storefront.status, 200);
  assert.equal(await storefront.text(), 'DURGAS storefront');

  const api = await fetch(`${origin}/api/ping`);
  assert.equal(api.status, 200);
  assert.equal(api.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(api.headers.get('x-frame-options'), 'SAMEORIGIN');

  assert.equal((await fetch(`${origin}/api/auth/login`, { method: 'POST' })).status, 200);
  const limited = await fetch(`${origin}/api/auth/login`, { method: 'POST' });
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { message: 'Too many authentication attempts. Please try again later.' });
});