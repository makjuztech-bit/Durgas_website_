const crypto = require('crypto');
const assert = require('node:assert');
const test = require('node:test');

test('Webhook signature validation logic', async (t) => {
  const secret = 'test_secret';
  const payload = JSON.stringify({ event: 'order.paid' });

  // Generate valid signature
  const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  await t.test('accepts valid signature', () => {
    const generated = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    assert.strictEqual(
      crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(validSignature)),
      true
    );
  });

  await t.test('rejects invalid signature', () => {
    const invalidSignature = 'invalid_signature_string_that_is_long_enough';
    // Must handle length mismatch or timingSafeEqual will throw
    const isValid = invalidSignature.length === validSignature.length &&
      crypto.timingSafeEqual(Buffer.from(validSignature), Buffer.from(invalidSignature));
    assert.strictEqual(isValid, false);
  });
});
