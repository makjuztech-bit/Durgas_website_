const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDatabaseUrl } = require('../config/connectionString');

test('accepts a complete PostgreSQL connection URL', () => {
  const value = 'postgresql://postgres:encoded%40password@db.project-ref.supabase.co:5432/postgres';
  assert.equal(validateDatabaseUrl(value), value);
});

test('rejects malformed URLs without echoing their value', () => {
  const invalid = 'postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres';
  assert.throws(() => validateDatabaseUrl(invalid), (error) => {
    assert.match(error.message, /valid PostgreSQL connection URL/);
    assert.doesNotMatch(error.message, /YOUR-PASSWORD|PROJECT-REF/);
    return true;
  });
});

test('rejects non-PostgreSQL or incomplete connection URLs', () => {
  assert.throws(() => validateDatabaseUrl('mysql://user:password@example.test/db'), /PostgreSQL scheme/);
  assert.throws(() => validateDatabaseUrl('postgresql://localhost/postgres'), /username, and password/);
});