# 26. AI Quota And Rate Limiting

## Purpose

This document explains the actual limiter and quota layers applied to AI traffic, including gaps.

## Relevant Files

- `services/aiQuota.js`
- `middleware/aiQuota.js`
- `middleware/rateLimit.js`
- `index.js`
- `routes/ai.js`
- `routes/chat.js`

## HTTP Layers

### General API limiter

`apiLimiter` applies to all `/api` routes except:

- `/health`
- `/auth*`

Default max: `1000` requests per 15 minutes per user/IP.

### AI route limiter

`aiLimiter` applies to:

- `/api/ai/smart-replies`
- `/api/ai/sentiment`
- `/api/ai/grammar`

Default max: `80` per 15 minutes per user/IP.

### In-memory AI quota

`aiQuotaMiddleware` applies to:

- `/api/chat`
- the `/api/ai/*` helper POST routes

Default quota from `services/aiQuota.js`:

- `20` requests
- per `15` minutes
- keyed by `user:<id>` or `ip:<ip>`

## Socket Layers

Room AI uses:

- socket flood guard: 30 events per 10 seconds per socket
- direct call to `consumeAiQuota('user:<id>')` inside `trigger_ai`

It does not use `express-rate-limit`, because it is not HTTP.

## Gaps

- `/api/chat` does not use `aiLimiter`
- quota state is in process memory only
- socket flood control is per socket, not per user across sockets
- none of these counters are shared across instances

## Multi-Instance Failure Mode

In a multi-instance deployment:

- each instance has its own quota map
- each instance has its own socket flood state
- users can exceed intended limits by being routed across instances

## Rebuild Notes

1. move quota state to Redis or another shared store
2. unify HTTP and socket AI quotas behind one service
3. make quota counters observable for support and operations

