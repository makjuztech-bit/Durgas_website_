const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return null;
};

// Unified mail sender supporting Resend REST API or SMTP
const sendMailMessage = async ({ to, subject, html, text }) => {
  const defaultFrom = process.env.EMAIL_FROM || '"DURGAS FIVE METAL JEWELLERY" <durgasjewellery20@gmail.com>';

  // 1. If RESEND_API_KEY is configured, send directly via Resend REST API
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: defaultFrom,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend API Error: ${res.statusText}`);
      }
      return { success: true, messageId: data.id, provider: 'resend-api' };
    } catch (apiErr) {
      console.warn('[Email Service - Resend API Warning]:', apiErr.message);
    }
  }

  // 2. Otherwise use SMTP transporter (e.g. smtp.resend.com or SendGrid/Gmail)
  const transporter = createTransporter();
  if (transporter) {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to,
      subject,
      html,
      text,
    });
    return { success: true, messageId: info.messageId, provider: 'smtp' };
  }

  return null;
};

const formatPriceINR = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const generateInvoiceHtml = (order, items = []) => {
  const businessName = process.env.BUSINESS_LEGAL_NAME || '[YOUR_REGISTERED_BUSINESS_NAME]';
  const gstin = process.env.BUSINESS_GSTIN || '[YOUR_GSTIN]';
  const address = process.env.BUSINESS_ADDRESS || '[YOUR_OFFICIAL_ADDRESS]';
  const contactEmail = process.env.SUPPORT_EMAIL || 'durgasjewellery20@gmail.com';
  const contactPhone = process.env.SUPPORT_PHONE || '+91 98765 43210';

  const subtotal = Number(order.subtotal_amount || 0);
  const totalTax = Number(order.tax_amount || 0);
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;
  const total = Number(order.total_amount || 0);

  const itemsRows = items.map((i, idx) => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px 8px; font-size: 13px;">${idx + 1}</td>
      <td style="padding: 10px 8px; font-size: 13px;">
        <strong>${i.product_name || i.name}</strong><br>
        <small style="color: #666;">${i.hallmark_details || 'BIS 916/750 Hallmark Certified'}</small>
      </td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: center;">${i.quantity}</td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: right;">${formatPriceINR(i.price)}</td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: right;">3%</td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: right;">${formatPriceINR(Number(i.price) * i.quantity)}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Tax Invoice - ${order.invoice_number || order.order_number}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f5; margin: 0; padding: 24px; color: #1a1a1a;">
    <div style="max-width: 650px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-top: 4px solid #C9A84C;">
      
      <!-- Header -->
      <table style="width: 100%; border-bottom: 2px solid #eee; padding-bottom: 16px; margin-bottom: 24px;">
        <tr>
          <td>
            <h1 style="margin: 0; font-family: serif; color: #111; font-size: 24px; letter-spacing: 0.1em;">DURGAS FIVE METAL JEWELLERY</h1>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">${businessName}</p>
            <p style="margin: 2px 0; font-size: 12px; color: #666;">GSTIN: <strong>${gstin}</strong></p>
            <p style="margin: 2px 0; font-size: 12px; color: #666;">${address}</p>
            <p style="margin: 2px 0; font-size: 12px; color: #666;">Email: ${contactEmail} | Tel: ${contactPhone}</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <h2 style="margin: 0; color: #C9A84C; font-size: 18px; text-transform: uppercase;">Tax Invoice</h2>
            <p style="margin: 4px 0; font-size: 12px; color: #333;"><strong>Invoice No:</strong> ${order.invoice_number || 'N/A'}</p>
            <p style="margin: 2px 0; font-size: 12px; color: #333;"><strong>Date:</strong> ${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN')}</p>
            <p style="margin: 2px 0; font-size: 12px; color: #333;"><strong>Order ID:</strong> ${order.order_number}</p>
            <p style="margin: 2px 0; font-size: 12px; color: #27ae60; font-weight: bold;">Status: ${order.payment_status === 'paid' ? 'PAID' : 'PENDING'}</p>
          </td>
        </tr>
      </table>

      <!-- Customer / Shipping Details -->
      <div style="background-color: #faf9f6; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #555;">Billed & Shipped To</h3>
        <p style="margin: 2px 0; font-size: 13px;"><strong>Phone:</strong> ${order.shipping_phone || 'N/A'}</p>
        <p style="margin: 2px 0; font-size: 13px;">${order.shipping_address}, ${order.shipping_city}, ${order.shipping_state} - ${order.shipping_pincode}</p>
        <p style="margin: 2px 0; font-size: 12px; color: #888;">Payment Method: <strong>${(order.payment_method || 'cod').toUpperCase()}</strong></p>
      </div>

      <!-- Itemized Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f5f2eb; border-bottom: 2px solid #ddd;">
            <th style="padding: 10px 8px; font-size: 12px; text-align: left; text-transform: uppercase;">#</th>
            <th style="padding: 10px 8px; font-size: 12px; text-align: left; text-transform: uppercase;">Item Description</th>
            <th style="padding: 10px 8px; font-size: 12px; text-align: center; text-transform: uppercase;">Qty</th>
            <th style="padding: 10px 8px; font-size: 12px; text-align: right; text-transform: uppercase;">Rate</th>
            <th style="padding: 10px 8px; font-size: 12px; text-align: right; text-transform: uppercase;">GST</th>
            <th style="padding: 10px 8px; font-size: 12px; text-align: right; text-transform: uppercase;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Summary / Tax Breakdown -->
      <table style="width: 100%; margin-bottom: 24px;">
        <tr>
          <td style="width: 50%; vertical-align: top; font-size: 11px; color: #777; line-height: 1.5;">
            <p style="margin: 0;"><strong>Declaration & BIS Hallmark:</strong></p>
            <p style="margin: 2px 0;">All precious jewellery sold complies with BIS hallmarking regulations. 100% insured transit.</p>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #666;">Taxable Subtotal:</td>
                <td style="padding: 4px 0; text-align: right;">${formatPriceINR(subtotal)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">CGST (1.5%):</td>
                <td style="padding: 4px 0; text-align: right;">${formatPriceINR(cgst)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">SGST (1.5%):</td>
                <td style="padding: 4px 0; text-align: right;">${formatPriceINR(sgst)}</td>
              </tr>
              <tr style="border-top: 1px solid #ddd; font-size: 15px; font-weight: bold;">
                <td style="padding: 8px 0; color: #111;">Total (INR):</td>
                <td style="padding: 8px 0; text-align: right; color: #C9A84C;">${formatPriceINR(total)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Footer Note -->
      <div style="border-top: 1px solid #eee; padding-top: 16px; font-size: 11px; color: #888; text-align: center;">
        <p style="margin: 0;">Thank you for your patronage with DURGAS FIVE METAL JEWELLERY.</p>
        <p style="margin: 4px 0;">This is a computer-generated tax invoice. For returns or inquiries, visit our support portal or email ${contactEmail}.</p>
      </div>

    </div>
  </body>
  </html>
  `;
};

const sendOrderConfirmation = async ({ order, items = [], customerEmail }) => {
  if (!customerEmail) return;

  const htmlContent = generateInvoiceHtml(order, items);

  const res = await sendMailMessage({
    to: customerEmail,
    subject: `Order Confirmation & Tax Invoice — #${order.order_number}`,
    html: htmlContent,
  });

  if (!res) {
    console.log(`[Email Service Simulated] Order confirmation invoice generated for ${customerEmail} (Order #${order.order_number}). Configure RESEND_API_KEY or SMTP in .env to send real emails.`);
    return;
  }

  console.log(`[Email Service] Order confirmation email sent to ${customerEmail} via ${res.provider}. Message ID: ${res.messageId}`);
  return res;
};

const sendOtpEmail = async ({ toEmail, otp, purpose = 'Login' }) => {
  if (!toEmail) return { success: false, message: 'Recipient email required' };

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; margin: 0; padding: 24px; color: #1a1a1a;">
    <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px 28px; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-top: 4px solid #D4AF37;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="font-family: 'Times New Roman', serif; font-size: 26px; color: #6B1D2F; margin: 0; letter-spacing: 2px;">DURGAS</h2>
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8B6914; margin: 4px 0 0;">Five Metal Jewellery</p>
      </div>
      <h3 style="font-size: 18px; color: #222; margin-top: 0;">Your Verification Code (OTP)</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #555;">Use the one-time code below to complete your ${purpose.toLowerCase()} on DURGAS FIVE METAL JEWELLERY:</p>
      <div style="background: #FAF6EF; border: 1px dashed #D4AF37; padding: 18px; text-align: center; border-radius: 4px; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6B1D2F;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #777; line-height: 1.5;">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone. If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0 16px;">
      <p style="font-size: 11px; color: #999; text-align: center; margin: 0;">© 2025 DURGAS FIVE METAL JEWELLERY. Handcrafted Traditional Panchaloha Creations.</p>
    </div>
  </body>
  </html>
  `;

  const isProd = process.env.NODE_ENV === 'production';

  try {
    const res = await sendMailMessage({
      to: toEmail,
      subject: `Your DURGAS Verification Code: ${otp}`,
      html: htmlContent,
    });

    if (res && res.success) {
      console.log(`[Email Service] OTP email sent to ${toEmail} via ${res.provider}. Message ID: ${res.messageId}`);
      return { success: true, messageId: res.messageId };
    }

    if (!isProd) {
      console.log(`[Email Service Simulated] OTP for ${toEmail}: ${otp} (valid for 10 min)`);
    } else {
      console.warn(`[Email Service Warning] Mail provider not configured. OTP not sent to ${toEmail}.`);
    }
    return { success: true, simulated: !isProd, otp: isProd ? undefined : otp };
  } catch (err) {
    console.warn(`[Email Service Delivery Error]: ${err.message}`);
    if (!isProd) {
      console.log(`[Email Service Fallback OTP] Verification code for ${toEmail} is: ${otp}`);
      return { success: true, fallback: true, otp };
    }
    return { success: false, message: 'Failed to deliver verification email.' };
  }
};

module.exports = {
  sendOrderConfirmation,
  generateInvoiceHtml,
  sendOtpEmail,
};
