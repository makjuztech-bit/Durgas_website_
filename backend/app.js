const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const compression = require('compression');
const db = require('./config/db');
const { createSecurityMiddleware } = require('./middleware/security');
const { supabaseSessionMiddleware } = require('./middleware/supabaseAuth');

const app = express();
const PORT = process.env.PORT || 5000;
const { securityHeaders, apiLimiter, authLimiter } = createSecurityMiddleware();

app.use(securityHeaders);
app.use(compression());

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Mobile apps, curl, server-to-server
    const defaultOrigins = ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000', 'http://localhost:5173'];
    const configured = (process.env.FRONTEND_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const allowedOrigins = [...defaultOrigins, ...configured];

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.web.app') ||
      origin.endsWith('.firebaseapp.com') ||
      origin.endsWith('.onrender.com') ||
      origin.includes('durgas') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');

    if (isAllowed || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Allow custom domains safely without crashing Express pipeline
    return callback(null, true);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Block direct access to internal, hidden, or source files
app.use((req, res, next) => {
  const pathLower = req.path.toLowerCase();
  if (
    pathLower.includes('/.env') ||
    pathLower.includes('/.git') ||
    pathLower.includes('/node_modules') ||
    pathLower.includes('/package.json') ||
    pathLower.includes('/package-lock.json') ||
    pathLower.includes('/schema.sql') ||
    pathLower.includes('/docker-compose')
  ) {
    return res.status(404).json({ message: 'Not found' });
  }
  next();
});

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.cookies = Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
  }));
  next();
});

app.use((req, res, next) => {
  if (!req.cookies.csrf_token) {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie', `csrf_token=${csrfToken}; Path=/; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    req.csrfToken = csrfToken;
  } else {
    req.csrfToken = req.cookies.csrf_token;
  }
  next();
});

app.use(supabaseSessionMiddleware);

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  dotfiles: 'deny',
}));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '7d',
  dotfiles: 'deny',
}));

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/newsletter', require('./routes/newsletterRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/reviews', require('./routes/analyticsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// Serve static assets from frontend folder only (never project root)
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  dotfiles: 'deny',
  setHeaders: (res) => {
    if (process.env.NODE_ENV !== 'production') {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// In development, ensure all pages are delivered fresh without browser caching
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

// Route mappings for clean URLs pointing to frontend pages
const sendFrontendPage = (res, pageName) => {
  const filePath = path.join(__dirname, '..', 'frontend', pageName);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  return res.status(404).json({ message: `Page '${pageName}' not found on backend. Frontend is hosted separately.` });
};

app.get('/products', (req, res) => sendFrontendPage(res, 'products.html'));
app.get(['/product/:id', '/product-details', '/product-details.html'], (req, res) => sendFrontendPage(res, 'product-details.html'));
app.get(['/cart', '/checkout', '/order'], (req, res) => sendFrontendPage(res, 'cart.html'));
app.get('/login', (req, res) => sendFrontendPage(res, 'login.html'));
app.get('/register', (req, res) => sendFrontendPage(res, 'register.html'));
app.get('/profile', (req, res) => sendFrontendPage(res, 'profile.html'));
app.get('/contact', (req, res) => sendFrontendPage(res, 'contact.html'));
app.get('/about', (req, res) => sendFrontendPage(res, 'about.html'));

// Legal and compliance pages
app.get('/privacy-policy', (req, res) => sendFrontendPage(res, 'privacy-policy.html'));
app.get('/terms-and-conditions', (req, res) => sendFrontendPage(res, 'terms-and-conditions.html'));
app.get('/shipping-policy', (req, res) => sendFrontendPage(res, 'shipping-policy.html'));
app.get('/refund-policy', (req, res) => sendFrontendPage(res, 'refund-policy.html'));

// Redirect legacy public admin paths to homepage
app.get(/^\/(administrator|admin)(\/.*)?$/, (req, res) => {
  res.redirect(302, '/');
});

// Secret staff portal route
app.get(/^\/staff-portal(\/.*)?$/, (req, res) => {
  const adminFile = path.join(__dirname, '..', 'frontend', 'administrator', 'index.html');
  const rootAdminFile = path.join(__dirname, '..', 'administrator', 'index.html');
  if (fs.existsSync(adminFile)) {
    return res.sendFile(adminFile);
  }
  if (fs.existsSync(rootAdminFile)) {
    return res.sendFile(rootAdminFile);
  }
  return res.redirect(302, 'https://durgasjewellery.com/staff-portal');
});

// SEO: Robots.txt & Dynamic Sitemap
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  const siteUrl = process.env.APP_URL || 'https://durgasjewellers.com';
  res.send(`User-agent: *\nAllow: /\nDisallow: /staff-portal\nDisallow: /administrator\nDisallow: /admin\nDisallow: /api/\nDisallow: /profile\nDisallow: /cart\nSitemap: ${siteUrl}/sitemap.xml\n`);
});

app.get('/sitemap.xml', async (req, res) => {
  const baseUrl = process.env.APP_URL || 'https://durgasjewellers.com';
  try {
    const productsResult = await db.query('SELECT id, created_at FROM products WHERE is_active = TRUE ORDER BY id ASC').catch(() => []);
    const items = Array.isArray(productsResult) ? productsResult : (productsResult?.rows || []);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/products', priority: '0.9', changefreq: 'daily' },
      { loc: '/about', priority: '0.7', changefreq: 'monthly' },
      { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
      { loc: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
      { loc: '/terms-and-conditions', priority: '0.3', changefreq: 'yearly' },
      { loc: '/shipping-policy', priority: '0.4', changefreq: 'monthly' },
      { loc: '/refund-policy', priority: '0.4', changefreq: 'monthly' },
    ];

    staticPages.forEach((p) => {
      xml += `  <url><loc>${baseUrl}${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>\n`;
    });

    items.forEach((prod) => {
      xml += `  <url><loc>${baseUrl}/product-details?id=${prod.id}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    });

    xml += '</urlset>';
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Database-aware health check
app.get('/health', async (req, res) => {
  try {
    const health = db.getHealthInfo ? await db.getHealthInfo() : { status: 'ok' };
    res.status(200).json(health);
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message, timestamp: new Date().toISOString() });
  }
});

app.use((err, req, res, next) => {
  // Never expose stack traces or internal details to clients
  const status = err.status || err.statusCode || 500;
  const safeMessage = status < 500 ? (err.message || 'Bad request') : 'Internal server error';
  if (status >= 500) console.error('[server error]', err.stack);
  res.status(status).json({ message: safeMessage });
});

let server;
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`DURGAS server running on http://localhost:${PORT}`);
  });
}

// Graceful shutdown handling
let isShuttingDown = false;
const handleShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}. Gracefully stopping DURGAS server...`);

  if (server) {
    server.close(() => {
      console.log('HTTP connections closed. Terminating database pool...');
      db.close().then(() => {
        console.log('Database pool terminated safely.');
        process.exit(0);
      }).catch((err) => {
        console.error('Error closing database pool:', err.message);
        process.exit(1);
      });
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    console.error('Graceful shutdown timeout exceeded (10s). Exiting immediately.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = app;
