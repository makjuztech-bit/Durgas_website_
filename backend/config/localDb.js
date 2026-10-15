const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'durgas_local.db');
const sqlite = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');

// Initialize schema
sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tamil_name TEXT,
  slug TEXT UNIQUE,
  image TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tamil_name TEXT,
  description TEXT,
  category_id INTEGER,
  material TEXT,
  purity TEXT,
  metal_composition TEXT,
  available_sizes TEXT,
  weight REAL,
  price REAL NOT NULL,
  old_price REAL,
  stock INTEGER NOT NULL DEFAULT 10,
  badge TEXT,
  sku TEXT UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  image_path TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cart (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  customer_name TEXT,
  customer_email TEXT,
  customer_notes TEXT,
  order_source TEXT DEFAULT 'website',
  order_number TEXT UNIQUE,
  subtotal_amount REAL NOT NULL DEFAULT 0.0,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL,
  invoice_number TEXT UNIQUE,
  invoice_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_pincode TEXT,
  shipping_phone TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT UNIQUE,
  tracking_number TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  tax_rate REAL NOT NULL DEFAULT 3.00,
  tax_amount REAL NOT NULL DEFAULT 0.00,
  huid TEXT,
  hallmark_details TEXT
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  amount_paise INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id INTEGER,
  reviewer_name TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  review_text TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Dynamically sync missing columns and ensure user_id is nullable for guest/COD checkouts
try {
  const existingOrderCols = sqlite.prepare("PRAGMA table_info(orders)").all();
  const colNames = existingOrderCols.map((c) => c.name);
  if (!colNames.includes('customer_name')) sqlite.exec("ALTER TABLE orders ADD COLUMN customer_name TEXT;");
  if (!colNames.includes('customer_email')) sqlite.exec("ALTER TABLE orders ADD COLUMN customer_email TEXT;");
  if (!colNames.includes('customer_notes')) sqlite.exec("ALTER TABLE orders ADD COLUMN customer_notes TEXT;");
  if (!colNames.includes('order_source')) sqlite.exec("ALTER TABLE orders ADD COLUMN order_source TEXT DEFAULT 'website';");

  const userIdCol = existingOrderCols.find((c) => c.name === 'user_id');
  if (userIdCol && userIdCol.notnull === 1) {
    sqlite.exec(`
      CREATE TABLE orders_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT,
        customer_email TEXT,
        customer_notes TEXT,
        order_source TEXT DEFAULT 'website',
        order_number TEXT UNIQUE,
        subtotal_amount REAL NOT NULL DEFAULT 0.0,
        tax_amount REAL NOT NULL DEFAULT 0.0,
        total_amount REAL NOT NULL,
        invoice_number TEXT UNIQUE,
        invoice_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        shipping_address TEXT,
        shipping_city TEXT,
        shipping_state TEXT,
        shipping_pincode TEXT,
        shipping_phone TEXT,
        payment_method TEXT NOT NULL DEFAULT 'cod',
        payment_status TEXT NOT NULL DEFAULT 'pending',
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT UNIQUE,
        tracking_number TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO orders_v2 SELECT id, user_id, customer_name, customer_email, customer_notes, order_source, order_number, subtotal_amount, tax_amount, total_amount, invoice_number, invoice_url, status, shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, tracking_number, created_at FROM orders;
      DROP TABLE orders;
      ALTER TABLE orders_v2 RENAME TO orders;
    `);
  }
} catch (e) {
  console.warn('Orders column sync warning:', e.message);
}

// Pre-seed admin and test accounts
const seedUsers = [
  {
    name: 'DURGAS Administrator',
    email: 'admin@durgas.com',
    passwordHash: '$2b$10$dhCkykanfA6p4v9hLSce7.4jEd1AUlUdrlsgnHbDYeMF1W3kQV3XG', // admin123456
    phone: '+91 7448882444',
    role: 'admin',
  },
  {
    name: 'DURGAS Jewellery Admin',
    email: 'admin@durgasjewellery.com',
    passwordHash: '$2b$10$dhCkykanfA6p4v9hLSce7.4jEd1AUlUdrlsgnHbDYeMF1W3kQV3XG', // admin123456
    phone: '+91 7448882444',
    role: 'admin',
  },
  {
    name: 'Super Admin',
    email: 'durgasjewellery20@gmail.com',
    passwordHash: '$2b$10$Wul4FvGB7YgwrTY5nInRTuKCVY7Mn2HWXaoTtF5xJ0VOXrOvbI3.C', // Durgas@Admin2024
    phone: '+91 7448882444',
    role: 'superadmin',
  },
  {
    name: 'Priya Sharma (Patron)',
    email: 'customer@durgas.com',
    passwordHash: '$2b$10$ySH1TTQ4E8AoJq3GJLpP5u4CKP.uv6ZYSvjQIr1GtSJV9U6yCpNUq', // customer123
    phone: '+91 9876543210',
    role: 'customer',
  },
];

const checkUserStmt = sqlite.prepare('SELECT id FROM users WHERE email = ?');
const insertUserStmt = sqlite.prepare('INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)');

for (const u of seedUsers) {
  const existing = checkUserStmt.get(u.email);
  if (!existing) {
    insertUserStmt.run(u.name, u.email, u.passwordHash, u.phone, u.role);
  }
}

// Pre-seed categories
const seedCategories = [
  { id: 1, name: 'Five Metals Jewellery (Panchaloha)', tamil: 'ஐம்பொன் பஞ்சலோக நகைகள்', slug: 'panchaloha-jewellery', img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80', desc: 'Authentic traditional Panchaloha five-metal jewellery crafted with classical auspicious metal alloy.' },
  { id: 2, name: 'Iypponnu / Aimpon Jewellery', tamil: 'ஐம்பொன் ஆபரணங்கள்', slug: 'iypponnu-jewellery', img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80', desc: 'Traditional Iypponnu jewellery with micro-gold polish and verified metal alloy composition.' },
  { id: 3, name: 'Traditional Collections', tamil: 'பாரம்பரிய நகைகள்', slug: 'traditional-collections', img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80', desc: 'South Indian temple jewellery and heritage ornaments for festivals and auspicious occasions.' },
  { id: 4, name: 'Panchaloha Rings', tamil: 'ஐம்பொன் மோதிரங்கள்', slug: 'panchaloha-rings', img: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80', desc: 'Traditional Panchaloha Navaratna, Om, and classical signet rings for daily wear.' },
  { id: 5, name: 'Pendants & Thaali', tamil: 'டாலர் மற்றும் தாலி', slug: 'pendants', img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80', desc: 'Auspicious temple pendants, deity lockets, and sacred Iypponnu thaali pieces.' },
  { id: 6, name: 'Chains & Malai', tamil: 'ஐம்பொன் சங்கிலிகள்', slug: 'chains', img: 'https://images.unsplash.com/photo-1573408301185-9519f94815f2?w=800&q=80', desc: 'Heavy duty, traditional rope, mugappu, and classical chains made in five metals.' },
  { id: 7, name: 'Bracelets & Kappu', tamil: 'ஐம்பொன் காப்பு மற்றும் வளையல்கள்', slug: 'bracelets-kappu', img: 'https://images.unsplash.com/photo-1611591475152-477711209351?w=800&q=80', desc: 'Protective traditional five-metal kappu, kada, and engraved auspicious bangles.' },
];

const checkCatStmt = sqlite.prepare('SELECT id FROM categories WHERE slug = ?');
const insertCatStmt = sqlite.prepare('INSERT INTO categories (id, name, tamil_name, slug, image, description) VALUES (?, ?, ?, ?, ?, ?)');

for (const c of seedCategories) {
  const existing = checkCatStmt.get(c.slug);
  if (!existing) {
    insertCatStmt.run(c.id, c.name, c.tamil, c.slug, c.img, c.desc);
  }
}

// Pre-seed sample products
const checkProdCount = sqlite.prepare('SELECT COUNT(*) as count FROM products').get();
if (checkProdCount.count === 0) {
  const insertProdStmt = sqlite.prepare(`
    INSERT INTO products (name, tamil_name, sku, category_id, material, purity, metal_composition, available_sizes, weight, price, old_price, stock, badge, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertImgStmt = sqlite.prepare('INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, ?)');

  const sampleProducts = [
    {
      name: 'Panchaloha Traditional Navaratna Ring',
      tamil_name: 'ஐம்பொன் நவரத்தின மோதிரம்',
      sku: 'DJ-PN-001',
      category_id: 4,
      material: 'Panchaloha (Five Metals)',
      purity: 'Traditional 5-Metal Alloy with 24K Micron Gold Wash',
      metal_composition: 'Panchaloha Alloy: Copper (70%), Brass/Zinc (15%), Iron (5%), Silver (5%), Gold (5%).',
      available_sizes: '12, 14, 16, 18, 20, 22',
      weight: 6.8,
      price: 2499,
      old_price: 3200,
      stock: 25,
      badge: 'Best Seller',
      description: 'Classical Panchaloha Navaratna ring handcrafted with the traditional five sacred metals.',
      image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
    },
    {
      name: 'Iypponnu Traditional Temple Kasu Mala',
      tamil_name: 'ஐம்பொன் காசு மாலை',
      sku: 'DJ-KM-002',
      category_id: 1,
      material: 'Iypponnu (Aimpon Alloy)',
      purity: 'Panchaloha Base with Micro-Gold Polish',
      metal_composition: 'Classical Five Metals composition with Laxmi engraved kasu coins.',
      available_sizes: '24 inch length',
      weight: 42.5,
      price: 8999,
      old_price: 11500,
      stock: 12,
      badge: 'Heritage',
      description: 'Handcrafted traditional Kasu Mala adorned with Goddess Lakshmi embossed coins.',
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
    },
    {
      name: 'Panchaloha Sacred Om Kada / Kappu',
      tamil_name: 'ஐம்பொன் ஓம் காப்பு',
      sku: 'DJ-KP-003',
      category_id: 7,
      material: 'Panchaloha (Five Metals)',
      purity: 'Pure 5-Metal Alloy Agamic Casting',
      metal_composition: 'Copper, Brass, Silver, Lead/Iron, Gold.',
      available_sizes: '2.4, 2.6, 2.8',
      weight: 28.0,
      price: 4499,
      old_price: 5800,
      stock: 18,
      badge: 'Auspicious',
      description: 'Sturdy auspicious Panchaloha Kappu engraved with sacred Om and Trishul motifs.',
      image: 'https://images.unsplash.com/photo-1611591475152-477711209351?w=800&q=80',
    },
  ];

  for (const p of sampleProducts) {
    const res = insertProdStmt.run(
      p.name, p.tamil_name, p.sku, p.category_id, p.material, p.purity,
      p.metal_composition, p.available_sizes, p.weight, p.price, p.old_price,
      p.stock, p.badge, p.description
    );
    const prodId = Number(res.lastInsertRowid);
    insertImgStmt.run(prodId, p.image, 1);
  }
}

// Helper to adapt PostgreSQL queries to SQLite
function adaptSqlForSqlite(sql, params = []) {
  let cleanSql = sql
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    .replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now')")
    .replace(/\bSTART\s+TRANSACTION\b/gi, 'BEGIN')
    .replace(/\bFOR\s+UPDATE\b/gi, '')
    .replace(/\bRETURNING\s+id\b/gi, '')
    .replace(/\b(is_active|is_primary)\s*=\s*TRUE\b/gi, '$1 = 1')
    .replace(/\b(is_active|is_primary)\s*=\s*FALSE\b/gi, '$1 = 0')
    .replace(/\bJSONB\b/gi, 'TEXT')
    .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
    .replace(/\bBIGSERIAL\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .trim();

  // If placeholders are $1, $2 etc., convert to ?
  if (/\$\d+/.test(cleanSql)) {
    cleanSql = cleanSql.replace(/\$\d+/g, '?');
  }

  // Flatten nested arrays if passed for IN clauses
  const flatParams = [];
  for (const p of params) {
    if (Array.isArray(p)) {
      flatParams.push(...p);
    } else {
      flatParams.push(p);
    }
  }

  return { sql: cleanSql, params: flatParams };
}

function executeLocalQuery(sql, params = [], callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const { sql: adaptedSql, params: cleanParams } = adaptSqlForSqlite(sql, params);
  const isSelect = /^\s*(SELECT|WITH|PRAGMA)\b/i.test(adaptedSql);

  try {
    const stmt = sqlite.prepare(adaptedSql);
    if (isSelect) {
      const rows = stmt.all(...cleanParams);
      if (callback) return callback(null, rows);
      return Promise.resolve(rows);
    } else {
      const info = stmt.run(...cleanParams);
      const result = {
        insertId: info.lastInsertRowid ? Number(info.lastInsertRowid) : null,
        affectedRows: info.changes || 0,
        rows: [],
      };
      if (callback) return callback(null, result);
      return Promise.resolve(result);
    }
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE constraint') || err.code === 'SQLITE_CONSTRAINT_UNIQUE')) {
      err.code = '23505';
    }
    if (callback) return callback(err, null);
    return Promise.reject(err);
  }
}

const localDb = {
  query: executeLocalQuery,
  getConnection: (callback) => {
    const conn = {
      query: (sql, params, queryCallback) => {
        executeLocalQuery(sql, params, queryCallback);
      },
      release: () => {},
    };
    callback(null, conn);
  },
  ping: () => Promise.resolve([{ '?column?': 1 }]),
  close: () => {},
};

module.exports = localDb;
