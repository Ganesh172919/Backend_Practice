/**
 * File Overview: Express rate limiter definitions for auth/API/AI paths.
 * WHY: Provides transport-level abuse protection independent from business quota logic.
 * WHAT: Exports configured limiters and retry response helpers.
 * HOW: Builds per-user/per-ip limiter keys and standardized limit exceeded payloads.
 */
const rateLimit = require('express-rate-limit');

/**
 * WHY: Keeps payload construction reusable and consistent across call sites.
 * WHAT: Implements build rate limit key for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function buildRateLimitKey(req) {
  return req.user?.id ? `user:${req.user.id}` : rateLimit.ipKeyGenerator(req.ip);
}

/**
 * WHY: Keeps payload construction reusable and consistent across call sites.
 * WHAT: Implements build retry payload for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function buildRetryPayload(req, message, retryAfterMs = 0) {
  return {
    error: message,
    retryAfterMs,
    requestId: req.requestId || null,
  };
}

// Auth routes: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI routes: higher ceiling, keyed by authenticated user when available.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AI_ROUTE_RATE_LIMIT_MAX || 80),
  keyGenerator: buildRateLimitKey,
  handler: (req, res) => {
    const retryAfterMs = Number(res.getHeader('Retry-After') || 0) * 1000;
    res.status(429).json(buildRetryPayload(req, 'AI request limit reached. Please wait a few minutes.', retryAfterMs));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: user-aware and more forgiving for active sessions. Auth routes use their own limiter.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 1000),
  keyGenerator: buildRateLimitKey,
  skip: (req) => {
    const path = req.path || req.originalUrl || '';
    return path === '/health'
      || path.startsWith('/auth');
  },
  handler: (req, res) => {
    const retryAfterMs = Number(res.getHeader('Retry-After') || 0) * 1000;
    res.status(429).json(buildRetryPayload(req, 'Too many requests. Please slow down.', retryAfterMs));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, aiLimiter, apiLimiter };
