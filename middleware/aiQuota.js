/**
 * File Overview: HTTP middleware for AI quota checks.
 * WHY: Limits costly model operations per user or client key.
 * WHAT: Consumes quota allowance and blocks when the request budget is exhausted.
 * HOW: Calls quota service and returns retry metadata to clients when denied.
 */
const { consumeAiQuota } = require('../services/aiQuota');

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements ai quota middleware for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function aiQuotaMiddleware(req, res, next) {
  const key = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
  const result = consumeAiQuota(key);

  if (!result.allowed) {
    return res.status(429).json({
      error: 'AI request limit reached. Please wait a few minutes.',
      retryAfterMs: result.retryAfterMs,
    });
  }

  res.locals.aiQuota = result;
  return next();
}

module.exports = aiQuotaMiddleware;
