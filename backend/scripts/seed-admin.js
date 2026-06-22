require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedAdmin() {
  const email = 'admin@durgas.com';
  const password = 'Admin@123';
  const hashed = await bcrypt.hash(password, 10);

  db.query('SELECT id FROM users WHERE email = ?', [email], (err, rows) => {
    if (err) {
      console.error('Err0r:', err.message);
      process.exit(1);
    }

    if (rows.length) {
      console.log('Super Admin already exists:', email);
      process.exit(0);
    }

    db.query(
      'INSERT INTO users ( user_id, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [null, 'Super Admin', email, hashed, 'superadmin'],
      (insErr) => {
        if (insErr) {
          console.error('Err0r:', insErr.message);
          process.exit(1);
        }
        console.log('Super Admin created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
        process.exit(0);
      }
    );
  });
}

seedAdmin();
