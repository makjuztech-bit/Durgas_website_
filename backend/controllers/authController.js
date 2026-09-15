const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const cookieOptions = `Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const setAuthCookie = (res, token) => res.append('Set-Cookie', `auth_token=${encodeURIComponent(token)}; ${cookieOptions}`);
const clearAuthCookie = (res) => res.append('Set-Cookie', `auth_token=; ${cookieOptions}; Max-Age=0`);

const generateToken = (user) => {
  return jwt.sign(
    { id: user.user_id ?? user.id, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.register = async (req, res) => {
  const { full_name, email, password, phone } = req.body || {};

  if (!full_name?.trim() || !isEmail(email) || typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return res.status(400).json({ message: 'Name, valid email and a password of 8 to 72 characters are required.' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [full_name.trim(), email.trim().toLowerCase(), hashed, phone?.trim() || null, 'customer'],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email already registered.' });
          }
          return res.status(500).json({ message: err.message });
        }

        const user = { id: result.insertId, user_id: result.insertId, full_name, email, role: 'customer' };
        setAuthCookie(res, generateToken(user));
        res.status(201).json({
          message: 'Registration successful',
          user,
        });
      }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = (req, res) => {
  const { email, password } = req.body || {};

  if (!isEmail(email) || typeof password !== 'string' || !password) {
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
      setAuthCookie(res, generateToken(user));
      res.json({
        message: 'Login successful',
        user: safeUser,
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
};

exports.csrf = (req, res) => res.json({ csrfToken: req.cookies?.csrf_token || null });

exports.logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
};

exports.getProfile = (req, res) => {
  db.query(
    'SELECT id, full_name, email, phone, address, city, state, pincode, role, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows.length) return res.status(404).json({ message: 'User not found' });
      res.json(rows[0]);
    }
  );
};

exports.updateProfile = (req, res) => {
  const { full_name, phone, address, city, state, pincode } = req.body || {};
  if (!full_name?.trim()) return res.status(400).json({ message: 'Full name is required.' });
  if (pincode && !/^\d{6}$/.test(String(pincode).trim())) return res.status(400).json({ message: 'Pincode must be 6 digits.' });

  db.query(
    'UPDATE users SET full_name = ?, phone = ?, address = ?, city = ?, state = ?, pincode = ? WHERE id = ?',
    [full_name.trim(), phone?.trim() || null, address?.trim() || null, city?.trim() || null, state?.trim() || null, pincode?.trim() || null, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(404).json({ message: 'User not found.' });
      exports.getProfile(req, res);
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
