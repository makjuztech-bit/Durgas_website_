require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/newsletter', require('./routes/newsletterRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Serve static assets from frontend folder first
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(express.static(path.join(__dirname, '..')));

// Route mappings for clean URLs pointing to the split HTML pages
app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'products.html'));
});
app.get('/product-details', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'product-details.html'));
});
app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'cart.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'login.html'));
});
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'register.html'));
});
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'contact.html'));
});
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'about.html'));
});

app.get('/administrator', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'administrator', 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`DURGAS server running on http://localhost:${PORT}`);
});
