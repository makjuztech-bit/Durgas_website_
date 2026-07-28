const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Verify JWT and attach user object to req
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    // Attach minimal user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      full_name: decoded.full_name,
    };
    next();
  });
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
