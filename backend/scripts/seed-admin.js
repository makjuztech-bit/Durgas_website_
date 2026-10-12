require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (at least 12 characters) before seeding an administrator.');
  }
  const hashed = await bcrypt.hash(password, 10);

  db.query('SELECT id FROM users WHERE email = ?', [email], (err, rows) => {
    if (err) {
      console.error('Admin seed failed:', err.message);
      process.exit(1);
    }

    if (rows.length) {
      console.log('Super Admin already exists:', email);
      process.exit(0);
    }

    db.query(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Super Admin', email, hashed, 'superadmin'],

      (insErr) => {
        if (insErr) {
          console.error('Admin seed failed:', insErr.message);
          process.exit(1);
        }
        console.log('Administrator created successfully.');
        process.exit(0);
      }
    );
  });
}

seedAdmin();

