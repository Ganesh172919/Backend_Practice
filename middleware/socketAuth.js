/**
 * File Overview: Socket.IO authentication middleware.
 * WHY: Applies authentication boundaries to real-time channels.
 * WHAT: Verifies handshake token and attaches user context to socket.
 * HOW: Parses auth token from handshake metadata and validates JWT claims.
 */
const jwt = require('jsonwebtoken');

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements socket auth middleware for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    socket.user = { id: decoded.id, username: decoded.username, email: decoded.email };
    next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
}

module.exports = socketAuthMiddleware;
