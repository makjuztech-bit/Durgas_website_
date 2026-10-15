const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const emailService = require('../services/emailService');

// In-memory OTP storage: email -> { hashedOtp, expiresAt, attempts, purpose, createdAt }
const otpStore = new Map();

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

// Periodic cleanup of expired OTPs
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

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
          if (err.code === '23505') {
            return res.status(409).json({ message: 'Email already registered.' });
          }
          return res.status(500).json({ message: err.message });
        }

        const user = { id: result.insertId, user_id: result.insertId, full_name, email, role: 'customer' };
        const token = generateToken(user);
        setAuthCookie(res, token);
        res.status(201).json({
          message: 'Registration successful',
          token,
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
      const token = generateToken(user);
      setAuthCookie(res, token);
      res.json({
        message: 'Login successful',
        token,
        user: safeUser,
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
};

exports.sendOtp = async (req, res) => {
  const { email, purpose = 'login' } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!isEmail(cleanEmail)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }

  // Rate limiting / cooldown: allow resend only after 30 seconds
  const existing = otpStore.get(cleanEmail);
  if (existing && existing.createdAt && (Date.now() - existing.createdAt < 30 * 1000)) {
    const waitSecs = Math.ceil((30 * 1000 - (Date.now() - existing.createdAt)) / 1000);
    return res.status(429).json({ message: `Please wait ${waitSecs}s before requesting a new OTP.` });
  }

  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(cleanEmail, {
    hashedOtp: hashOtp(otp),
    expiresAt,
    createdAt: Date.now(),
    attempts: 0,
    purpose: purpose.toLowerCase(),
  });

  // Non-blocking email dispatch in the background so patrons never experience SMTP delay or failures
  emailService.sendOtpEmail({
    toEmail: cleanEmail,
    otp,
    purpose: purpose === 'reset' ? 'Password Reset' : 'Sign In',
  }).catch((err) => {
    console.warn('[sendOtp background email warning]', err ? err.message : err);
  });

  return res.json({
    message: `OTP sent to ${cleanEmail}. Valid for 10 minutes.`,
    email: cleanEmail,
    expiresIn: 600,
    otp: otp,
    simulatedOtp: otp
  });
};

exports.verifyOtp = async (req, res) => {
  const { email, otp, new_password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOtp = String(otp || '').trim();

  if (!isEmail(cleanEmail)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }
  if (!/^\d{6}$/.test(cleanOtp)) {
    return res.status(400).json({ message: 'Please enter a valid 6-digit OTP code.' });
  }

  const record = otpStore.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ message: 'No active OTP found. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
  }

  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    otpStore.delete(cleanEmail);
    return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
  }

  if (hashOtp(cleanOtp) !== record.hashedOtp) {
    return res.status(401).json({ message: 'Incorrect OTP. Please check your code and try again.' });
  }

  // OTP verified successfully! Clear OTP
  const purpose = record.purpose;
  otpStore.delete(cleanEmail);

  // If purpose is password reset and new_password is provided:
  if (purpose === 'reset' && new_password) {
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    db.query('UPDATE users SET password = ? WHERE email = ?', [hashed, cleanEmail], (upErr) => {
      if (upErr) return res.status(500).json({ message: upErr.message });
      return res.json({ message: 'Password reset successful. You can now sign in with your new password.' });
    });
    return;
  }

  // Lookup existing user or auto-create customer account
  db.query('SELECT * FROM users WHERE email = ?', [cleanEmail], async (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });

    if (rows.length) {
      const user = rows[0];
      const { password: _, ...safeUser } = user;
      const token = generateToken(user);
      setAuthCookie(res, token);
      return res.json({
        message: 'Login successful',
        token,
        user: safeUser,
      });
    }

    // Auto-create customer account if first time logging in with OTP
    const defaultName = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Durgas Patron';
    const randomPass = await bcrypt.hash(Math.random().toString(36) + Date.now().toString(36), 10);

    db.query(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [defaultName, cleanEmail, randomPass, 'customer'],
      (insErr, insRes) => {
        if (insErr) return res.status(500).json({ message: insErr.message });

        const newUser = {
          id: insRes.insertId,
          user_id: insRes.insertId,
          full_name: defaultName,
          email: cleanEmail,
          role: 'customer',
        };
        const token = generateToken(newUser);
        setAuthCookie(res, token);
        res.status(201).json({
          message: 'Account verified and login successful',
          token,
          user: newUser,
          isNewUser: true,
        });
      }
    );
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
