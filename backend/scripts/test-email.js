const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const emailService = require('../services/emailService');

const targetEmail = process.argv[2] || process.env.SUPPORT_EMAIL || 'durgasjewellery98@gmail.com';
const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

console.log(`\n⏳ Sending live test verification email to: ${targetEmail}...`);

emailService.sendOtpEmail({
  toEmail: targetEmail,
  otp: testOtp,
  purpose: 'Email System Verification Test'
}).then((res) => {
  if (res && res.success) {
    console.log(`\n✅ EMAIL DELIVERED SUCCESSFULLY!`);
    console.log(`📨 Recipient: ${targetEmail}`);
    console.log(`🔑 Verification Code (OTP) Sent: ${testOtp}`);
    console.log(`🆔 Message ID: ${res.messageId}`);
    console.log(`\n👉 Please check the inbox (or spam folder) for ${targetEmail}.\n`);
  } else {
    console.log(`\n❌ Delivery failed:`, res?.message || 'Unknown error');
  }
  process.exit(0);
}).catch((err) => {
  console.error(`\n❌ Error during sending:`, err.message);
  process.exit(1);
});
