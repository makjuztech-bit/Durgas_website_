const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
transporter.sendMail({
  from: 'DURGAS FIVE METAL JEWELLERY <durgasjewellery20@gmail.com>',
  to: 'durgasjewellery20@gmail.com',
  subject: 'Test Email - DURGAS System Check',
  text: 'Email system is working! SendGrid SMTP connected successfully. Order confirmation emails will now be sent to customers.'
}, (err, info) => {
  if (err) { console.log('FAILED: ' + err.message); }
  else { console.log('EMAIL SENT SUCCESSFULLY!'); console.log('Message ID: ' + info.messageId); }
  process.exit(0);
});
