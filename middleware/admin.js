/**
 * File Overview: Admin-only authorization middleware.
 * WHY: Protects privileged admin APIs at a centralized guard point.
 * WHAT: Verifies the authenticated user has admin privileges.
 * HOW: Reads req.user from auth middleware and denies non-admin requests.
 */
const User = require('../models/User');

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements admin check for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
async function adminCheck(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('isAdmin').lean();
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Auth check failed' });
  }
}

module.exports = adminCheck;
