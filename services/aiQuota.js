/**
 * File Overview: In-memory AI quota accounting service.
 * WHY: Prevents unbounded model usage and controls operational AI spend.
 * WHAT: Tracks request counts in a fixed time window and returns allow/deny metadata.
 * HOW: Maintains keyed counters with reset timestamps and remaining budget calculations.
 */
const AI_WINDOW_MS = 15 * 60 * 1000;
const AI_MAX_REQUESTS = 20;
const quotaMap = new Map();

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements consume ai quota for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function consumeAiQuota(key, maxRequests = AI_MAX_REQUESTS, windowMs = AI_WINDOW_MS) {
  const now = Date.now();
  const existing = quotaMap.get(key);

  if (!existing || existing.resetAt <= now) {
    quotaMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterMs: 0,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterMs: 0,
  };
}

module.exports = {
  AI_WINDOW_MS,
  AI_MAX_REQUESTS,
  consumeAiQuota,
};
