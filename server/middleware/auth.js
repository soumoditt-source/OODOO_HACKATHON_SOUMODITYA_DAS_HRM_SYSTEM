// ─────────────────────────────────────────────────────────────────────────────
// auth.middleware.js — JWT verification & role guards
// Author: Soumoditya Das
// ─────────────────────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'hrms-soumoditya-odoo-2026-secret';

/**
 * Verifies the Bearer JWT token in Authorization header.
 * Attaches decoded payload to req.user.
 */
function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: 'UNAUTHORIZED', message: msg });
  }
}

/**
 * Role-based access guard factory.
 * Usage: requireRole('ADMIN', 'HR') — allows ADMIN or HR.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.portal_role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: `Requires one of: ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, JWT_SECRET };
