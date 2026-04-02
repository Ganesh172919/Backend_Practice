/**
 * File Overview: JWT bearer authentication middleware for REST APIs.
 * WHY: Enforces authentication before protected handlers execute.
 * WHAT: Extracts and verifies access tokens, then attaches user claims to req.user.
 * HOW: Parses Authorization header and validates token with server secret and expiry checks.
 */
const jwt = require('jsonwebtoken');

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements auth middleware for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Only access tokens are accepted here; refresh tokens are handled in auth routes.
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id, username: decoded.username, email: decoded.email };
    next();
  } catch (err) {
    // Expired tokens are mapped to a distinct code so clients can trigger refresh flow.
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
