const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.register = async (req, res) => {
  const { full_name, email, password, phone } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, hashed, phone || null, 'customer'],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email already registered.' });
          }
          return res.status(500).json({ message: err.message });
        }

        const user = { id: result.insertId, full_name, email, role: 'customer' };
        res.status(201).json({
          message: 'Registration successful',
          token: generateToken(user),
          user,
        });
      }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows.length) return res.status(401).json({ message: 'Invalid email or password.' });

    const user = rows[0];

    try {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: 'Invalid email or password.' });

      const { password: _, ...safeUser } = user;
      res.json({
        message: 'Login successful',
        token: generateToken(user),
        user: safeUser,
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
};

exports.getProfile = (req, res) => {
  db.query(
    'SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows.length) return res.status(404).json({ message: 'User not found' });
      res.json(rows[0]);
    }
  );
};

exports.getCustomers = (req, res) => {
  db.query(
    "SELECT id, full_name, email, phone, role, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    }
  );
};
