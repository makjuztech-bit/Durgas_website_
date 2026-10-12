const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { supabase, supabaseAdmin } = require('../config/supabaseClient');

// Verify JWT and attach user object to req
async function verifyToken(req, res, next) {
  // If user was already authenticated by session middleware
  if (req.user && req.user.id) {
    if (req.cookies?.auth_token && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const csrfHeader = req.headers['x-csrf-token'];
      if (!csrfHeader || csrfHeader !== req.cookies.csrf_token) return res.status(403).json({ message: 'CSRF validation failed' });
    }
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.auth_token || req.cookies?.['sb-access-token'];
  if (!token) return res.status(401).json({ message: 'Access token missing' });

  // 1. Try local jwt verification first (for existing app tokens)
  if (process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        full_name: decoded.full_name,
      };
      if (req.cookies?.auth_token && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const csrfHeader = req.headers['x-csrf-token'];
        if (!csrfHeader || csrfHeader !== req.cookies.csrf_token) return res.status(403).json({ message: 'CSRF validation failed' });
      }
      return next();
    } catch (localJwtErr) {
      // If local JWT verify fails, fall through to Supabase verification
    }
  }

  // 2. Try Supabase verification
  if (supabase || supabaseAdmin) {
    try {
      const client = supabaseAdmin || supabase;
      const { data: { user }, error } = await client.auth.getUser(token);
      if (user && !error) {
        req.supabaseUser = user;
        req.user = {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || user.role || 'customer',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        };
        return next();
      }
    } catch (sbErr) {
      // Supabase verification error
    }
  }

  return res.status(403).json({ message: 'Invalid token' });
}

// Ensure the user has admin privileges (customer, superadmin, admin)
function requireAdmin(req, res, next) {
  const role = req.user && req.user.role;
  if (role === 'superadmin' || role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Admin access required' });
}

module.exports = { verifyToken, requireAdmin, auth: verifyToken, adminOnly: requireAdmin };
