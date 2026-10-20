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
  const name = String(req.body?.full_name || req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const rawPhone = String(req.body?.phone || '').replace(/\D/g, '');
  const phone = rawPhone ? rawPhone.slice(-10) : null;

  if (!name) {
    return res.status(400).json({ message: 'Full name is required.' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }
  if (phone && phone.length < 10) {
    return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }
  if (password.length > 72) {
    return res.status(400).json({ message: 'Password cannot exceed 72 characters.' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, phone, 'customer'],
      (err, result) => {
        if (err) {
          const errMsg = (err.message || '').toLowerCase();
          if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT' || errMsg.includes('unique') || errMsg.includes('already exists')) {
            return res.status(409).json({ message: 'An account with this email is already registered. Please sign in instead.' });
          }
          return res.status(500).json({ message: err.message });
        }

        const newId = result?.insertId || result?.rows?.[0]?.id || null;
        const user = { id: newId, user_id: newId, full_name: name, email, phone, role: 'customer' };
        const token = generateToken(user);
        setAuthCookie(res, token);
        res.status(201).json({
          message: 'Account created successfully',
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
  const { email, phone, email_or_phone, identifier, password } = req.body || {};
  const rawIdentifier = String(identifier || email_or_phone || email || phone || '').trim();

  if (!rawIdentifier) {
    return res.status(400).json({ message: 'Email address or 10-digit mobile number is required.' });
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Password is required.' });
  }

  const cleanIdent = rawIdentifier.toLowerCase();
  const digits = rawIdentifier.replace(/\D/g, '');
  const isPhone = !cleanIdent.includes('@') && digits.length >= 10;

  const querySql = isPhone
    ? 'SELECT * FROM users WHERE phone LIKE ? OR phone LIKE ?'
    : 'SELECT * FROM users WHERE LOWER(email) = LOWER(?)';
  const queryParams = isPhone
    ? [`%${digits.slice(-10)}%`, `%${digits}%`]
    : [cleanIdent];

  db.query(querySql, queryParams, async (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows || !rows.length) {
      return res.status(401).json({ message: 'No registered account found with these details. Please check or create an account.' });
    }

    const user = rows[0];

    try {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: 'Incorrect password. Please verify or use Instant OTP Sign-In.' });
      }

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
  const { email, phone, target, identifier, purpose = 'login' } = req.body || {};
  const rawTarget = String(target || identifier || email || phone || '').trim();

  if (!rawTarget) {
    return res.status(400).json({ message: 'A valid email address or 10-digit mobile number is required.' });
  }

  const isMail = isEmail(rawTarget);
  const digits = rawTarget.replace(/\D/g, '');
  const isMobile = !isMail && digits.length >= 10;

  if (!isMail && !isMobile) {
    return res.status(400).json({ message: 'Please enter a valid email address or 10-digit mobile number.' });
  }

  const targetKey = isMail ? rawTarget.toLowerCase() : digits.slice(-10);

  // Rate limiting / cooldown: allow resend only after 30 seconds
  const existing = otpStore.get(targetKey);
  if (existing && existing.createdAt && (Date.now() - existing.createdAt < 30 * 1000)) {
    const waitSecs = Math.ceil((30 * 1000 - (Date.now() - existing.createdAt)) / 1000);
    return res.status(429).json({ message: `Please wait ${waitSecs}s before requesting a new OTP.` });
  }

  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(targetKey, {
    hashedOtp: hashOtp(otp),
    expiresAt,
    createdAt: Date.now(),
    attempts: 0,
    purpose: purpose.toLowerCase(),
    targetKey,
    isMail,
  });

  // Non-blocking dispatch in background
  if (isMail) {
    emailService.sendOtpEmail({
      toEmail: targetKey,
      otp,
      purpose: purpose === 'reset' ? 'Password Reset' : 'Sign In',
    }).catch((err) => {
      console.warn('[sendOtp background email warning]', err ? err.message : err);
    });
  } else {
    console.log(`[SMS/WhatsApp OTP Simulated] Verification code for mobile +91-${targetKey}: ${otp}`);
  }

  return res.json({
    message: isMail
      ? `OTP sent to ${targetKey}. Valid for 10 minutes.`
      : `OTP sent to mobile +91-${targetKey}. Valid for 10 minutes.`,
    target: targetKey,
    isEmail: isMail,
    expiresIn: 600,
    otp: otp,
    simulatedOtp: otp
  });
};

exports.verifyOtp = async (req, res) => {
  const { email, phone, target, identifier, otp, new_password, purpose } = req.body || {};
  const rawTarget = String(target || identifier || email || phone || '').trim();
  const cleanOtp = String(otp || '').trim();

  if (!rawTarget) {
    return res.status(400).json({ message: 'Email or mobile number is required.' });
  }
  if (!/^\d{6}$/.test(cleanOtp)) {
    return res.status(400).json({ message: 'Please enter a valid 6-digit OTP code.' });
  }

  const isMail = isEmail(rawTarget);
  const digits = rawTarget.replace(/\D/g, '');
  const targetKey = isMail ? rawTarget.toLowerCase() : digits.slice(-10);

  const record = otpStore.get(targetKey);
  if (!record) {
    return res.status(400).json({ message: 'No active OTP found. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(targetKey);
    return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
  }

  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    otpStore.delete(targetKey);
    return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
  }

  if (hashOtp(cleanOtp) !== record.hashedOtp) {
    return res.status(401).json({ message: 'Incorrect OTP. Please check your code and try again.' });
  }

  // OTP verified successfully! Clear OTP
  const effectivePurpose = record.purpose || purpose;
  otpStore.delete(targetKey);

  // If purpose is password reset and new_password is provided:
  if ((effectivePurpose === 'reset' || purpose === 'reset') && new_password) {
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    const updateSql = isMail ? 'UPDATE users SET password = ? WHERE email = ?' : 'UPDATE users SET password = ? WHERE phone LIKE ?';
    const updateParam = isMail ? targetKey : `%${targetKey}%`;

    db.query(updateSql, [hashed, updateParam], (upErr, upRes) => {
      if (upErr) return res.status(500).json({ message: upErr.message });
      return res.json({ message: 'Password reset successful. You can now sign in with your new password.' });
    });
    return;
  }

  // Lookup existing user or auto-create customer account
  const lookupSql = isMail
    ? 'SELECT * FROM users WHERE email = ?'
    : 'SELECT * FROM users WHERE phone LIKE ?';
  const lookupParam = isMail ? targetKey : `%${targetKey}%`;

  db.query(lookupSql, [lookupParam], async (err, rows) => {
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
    const defaultName = isMail
      ? targetKey.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : `Patron (${targetKey.slice(-4)})`;
    const defaultEmail = isMail ? targetKey : `patron_${targetKey}@durgasjewellers.com`;
    const defaultPhone = isMail ? null : `+91 ${targetKey}`;
    const randomPass = await bcrypt.hash(Math.random().toString(36) + Date.now().toString(36), 10);

    db.query(
      'INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [defaultName, defaultEmail, randomPass, defaultPhone, 'customer'],
      (insErr, insRes) => {
        if (insErr) return res.status(500).json({ message: insErr.message });

        const newUser = {
          id: insRes.insertId,
          user_id: insRes.insertId,
          full_name: defaultName,
          email: defaultEmail,
          phone: defaultPhone,
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

exports.lookupAccount = (req, res) => {
  const { phone } = req.body || {};
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) {
    return res.status(400).json({ message: 'Please enter your 10-digit registered mobile number.' });
  }
  const last10 = digits.slice(-10);
  db.query('SELECT full_name, email, phone FROM users WHERE phone LIKE ?', [`%${last10}%`], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows.length) {
      return res.status(404).json({ message: `No account found with mobile ending in ${last10}. You can register a new account.` });
    }
    const user = rows[0];
    const parts = user.email.split('@');
    const maskedUser = parts[0].length > 2 ? parts[0][0] + '***' + parts[0].slice(-1) : parts[0][0] + '***';
    const maskedEmail = `${maskedUser}@${parts[1]}`;
    return res.json({
      message: 'Account found',
      full_name: user.full_name,
      masked_email: maskedEmail,
    });
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
