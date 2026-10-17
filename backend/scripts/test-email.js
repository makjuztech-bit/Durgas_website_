const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
const fromAddress = process.env.EMAIL_FROM || '"DURGAS FIVE METAL JEWELLERY" <durgasjewellery98@gmail.com>';
const toAddress = process.env.SUPPORT_EMAIL || 'durgasjewellery98@gmail.com';

transporter.sendMail({
  from: fromAddress,
  to: toAddress,
  subject: 'Test Email - DURGAS System Check',
  text: 'Email system is working! SendGrid SMTP connected successfully. Order confirmation emails will now be sent to customers.'
}, (err, info) => {
  if (err) { console.log('FAILED: ' + err.message); }
  else { console.log('EMAIL SENT SUCCESSFULLY!'); console.log('Message ID: ' + info.messageId); }
  process.exit(0);
});
