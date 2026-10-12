const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

const formatPriceINR = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const generateInvoiceHtml = (order, items = []) => {
  const businessName = process.env.BUSINESS_LEGAL_NAME || '[YOUR_REGISTERED_BUSINESS_NAME]';
  const gstin = process.env.BUSINESS_GSTIN || '[YOUR_GSTIN]';
  const address = process.env.BUSINESS_ADDRESS || '[YOUR_OFFICIAL_ADDRESS]';
  const contactEmail = process.env.SUPPORT_EMAIL || 'support@durgasjewellers.com';
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
            <h1 style="margin: 0; font-family: serif; color: #111; font-size: 24px; letter-spacing: 0.1em;">DURGAS FINE JEWELLERY</h1>
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
        <p style="margin: 0;">Thank you for your patronage with DURGAS Fine Jewellery.</p>
        <p style="margin: 4px 0;">This is a computer-generated tax invoice. For returns or inquiries, visit our support portal or email ${contactEmail}.</p>
      </div>

    </div>
  </body>
  </html>
  `;
};

const sendOrderConfirmation = async ({ order, items = [], customerEmail }) => {
  if (!customerEmail) return;

  const transporter = createTransporter();
  const htmlContent = generateInvoiceHtml(order, items);

  if (!transporter) {
    console.log(`[Email Service Simulated] Order confirmation invoice generated for ${customerEmail} (Order #${order.order_number}). Configure SMTP in .env to send real emails.`);
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"DURGAS Fine Jewellery" <orders@durgasjewellers.com>`,
    to: customerEmail,
    subject: `Order Confirmation & Tax Invoice — #${order.order_number}`,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Order confirmation email sent to ${customerEmail}. Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email Service Error] Failed to send order email to ${customerEmail}:`, err.message);
  }
};

module.exports = {
  sendOrderConfirmation,
  generateInvoiceHtml,
};
