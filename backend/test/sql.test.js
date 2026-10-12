const test = require('node:test');
const assert = require('node:assert/strict');
const { formatResult, translateSql } = require('../config/sql');

test('translates placeholders without changing question marks inside SQL string literals', () => {
  const translated = translateSql("SELECT '?' AS symbol, email FROM users WHERE email = ?", ['customer@example.com']);

  assert.equal(translated.text, "SELECT '?' AS symbol, email FROM users WHERE email = $1");
  assert.deepEqual(translated.values, ['customer@example.com']);
});

test('expands list parameters and multi-row insert values', () => {
  const list = translateSql('SELECT id FROM products WHERE id IN (?)', [[3, 8]]);
  assert.equal(list.text, 'SELECT id FROM products WHERE id IN ($1, $2)');
  assert.deepEqual(list.values, [3, 8]);

  const rows = translateSql('INSERT INTO product_images (product_id, image_path) VALUES ?', [[[4, '/a.jpg'], [4, '/b.jpg']]]);
  assert.equal(rows.text, 'INSERT INTO product_images (product_id, image_path) VALUES ($1, $2), ($3, $4) RETURNING id');
  assert.deepEqual(rows.values, [4, '/a.jpg', 4, '/b.jpg']);
});

test('translates transaction, boolean filters, and adds returning id to inserts', () => {
  assert.equal(translateSql('START TRANSACTION').text, 'BEGIN');
  assert.equal(translateSql('SELECT id FROM products WHERE is_active = 1').text, 'SELECT id FROM products WHERE is_active = TRUE');
  assert.equal(translateSql('INSERT INTO users (email) VALUES (?)', ['a@b.test']).text, 'INSERT INTO users (email) VALUES ($1) RETURNING id');
});

test('rejects placeholder and parameter count mismatches', () => {
  assert.throws(() => translateSql('SELECT ?', []), /more placeholders/);
  assert.throws(() => translateSql('SELECT 1', [1]), /parameter count mismatch/);
});

test('formats PostgreSQL results for existing callback-based handlers', () => {
  assert.deepEqual(formatResult('SELECT id FROM users', { rows: [{ id: 5 }], rowCount: 1 }), [{ id: 5 }]);
  assert.deepEqual(formatResult('INSERT INTO users DEFAULT VALUES RETURNING id', { rows: [{ id: 5 }], rowCount: 1 }), {
    insertId: 5,
    affectedRows: 1,
    rows: [{ id: 5 }],
  });
});