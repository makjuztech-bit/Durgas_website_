const test = require('node:test');
const assert = require('node:assert/strict');
const { supabase, supabaseAdmin, supabaseAnon, supabaseUrl, jwksUrl } = require('../config/supabaseClient');
const db = require('../config/db');
const { supabaseSessionMiddleware, requireSupabaseAuth, setSessionCookies } = require('../middleware/supabaseAuth');

test('Supabase client helper loads configurations and initializes clients', () => {
  assert.ok(supabaseUrl, 'SUPABASE_URL should be defined');
  assert.ok(jwksUrl, 'JWKS URL should be defined');
  assert.ok(supabase, 'Supabase client instance should be instantiated');
  assert.ok(supabaseAdmin, 'Supabase admin client instance should be instantiated');
  assert.ok(db.supabase, 'Supabase should be accessible via db.supabase');
});

test('Supabase session middleware passes requests gracefully without crash', async () => {
  const req = { headers: {}, cookies: {} };
  const res = { append: () => {} };
  let nextCalled = false;

  await supabaseSessionMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true, 'Next callback must be invoked');
});

test('Supabase setSessionCookies attaches access and refresh token cookies', () => {
  const cookies = [];
  const res = {
    append: (header, val) => {
      if (header === 'Set-Cookie') cookies.push(val);
    },
  };

  setSessionCookies(res, {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
  });

  assert.equal(cookies.length, 2, 'Should set 2 cookies');
  assert.ok(cookies[0].includes('sb-access-token=mock-access-token'));
  assert.ok(cookies[1].includes('sb-refresh-token=mock-refresh-token'));
});

test('requireSupabaseAuth blocks requests without token or user', async () => {
  const req = { headers: {}, cookies: {} };
  let statusSent = null;
  let jsonSent = null;
  const res = {
    status: (s) => {
      statusSent = s;
      return {
        json: (j) => { jsonSent = j; },
      };
    },
  };

  await requireSupabaseAuth(req, res, () => {});

  assert.equal(statusSent, 401, 'Unauthenticated request should return 401');
  assert.ok(jsonSent.message);
});

test('requireSupabaseAuth allows authenticated request when req.user is populated', async () => {
  const req = { headers: {}, cookies: {}, user: { id: 'usr_123', role: 'customer' } };
  let nextCalled = false;
  const res = {};

  await requireSupabaseAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true, 'Should allow request with valid user');
});

test.after(async () => {
  await db.close().catch(() => {});
});
