const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const createSecurityMiddleware = ({
  apiLimit = parseInt(process.env.API_LIMIT || '500', 10),
  authLimit = parseInt(process.env.AUTH_LIMIT || (process.env.NODE_ENV === 'production' ? '20' : '500'), 10),
  windowMs = 15 * 60 * 1000
} = {}) => ({
  securityHeaders: helmet({
    contentSecurityPolicy: false,
    hsts: process.env.NODE_ENV === 'production' ? undefined : false,
  }),
  apiLimiter: rateLimit({
    windowMs,
    limit: apiLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' },
  }),
  authLimiter: rateLimit({
    windowMs,
    limit: authLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many authentication attempts. Please try again later.' },
  }),
});

module.exports = { createSecurityMiddleware };