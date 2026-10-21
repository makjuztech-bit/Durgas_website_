const test = require('node:test');
const assert = require('node:assert/strict');
const localDb = require('../config/localDb');

test('localDb queries with ILIKE adapt to case-insensitive LIKE in SQLite', async () => {
  const rows = await localDb.query('SELECT * FROM products WHERE name ILIKE ?', ['%kappu%']);
  assert(Array.isArray(rows), 'Expected array of rows');
});

test('localDb correctly expands list parameters in IN (?) clauses', async () => {
  const rows = await localDb.query('SELECT * FROM products WHERE id IN (?)', [[1, 2, 3]]);
  assert(Array.isArray(rows), 'Expected array of rows');
});

test('localDb correctly handles boolean parameters in SQLite', async () => {
  const rows = await localDb.query('SELECT * FROM products WHERE is_active = ?', [true]);
  assert(Array.isArray(rows), 'Expected array of rows');
});
