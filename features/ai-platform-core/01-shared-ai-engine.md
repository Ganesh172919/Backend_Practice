# AI Platform Core
# Shared AI Engine Deep Dive

Primary source files:

1. `services/gemini.js`
2. `services/aiQuota.js`
3. `middleware/aiQuota.js`
4. `middleware/rateLimit.js`
5. `middleware/upload.js`
6. `middleware/socketAuth.js`
7. `helpers/logger.js`

## What This Layer Is

This is the shared foundation used by every AI feature in the backend.

It is not one public endpoint.

It is the internal AI platform that makes all the other AI features possible.

## Main Responsibilities

### Provider abstraction

`services/gemini.js` gives one common interface over:

1. Gemini
2. OpenRouter
3. Grok
4. Together
5. Groq
6. Hugging Face

### Model catalogs

The service can refresh model lists and expose available models to the app.

### Task-aware routing

It can auto-select a model based on:

1. operation type
2. prompt complexity
3. attachment presence

### Fallback retries

It can try alternate models when retryable failures happen.

### Usage normalization

It converts provider-specific usage fields into one stable token schema.

### Operational guardrails

Quota, HTTP rate limits, socket auth, upload validation, and structured logging all live around this layer.

## Provider Request Pipeline

```text
task request
   ->
resolve or auto-select model
   ->
build prompt and attachments
   ->
call provider-specific adapter
   ->
extract text
   ->
extract usage
   ->
normalize errors
   ->
retry if allowed
```

## Supported Operation Types

The AI engine behaves differently depending on operation:

1. `chat`
2. `group-chat`
3. `json`
4. `prompt`

Why this matters:

JSON helpers need smaller output budgets and stricter parsing, while chat operations need richer responses.

## Complexity Estimation

`estimatePromptComplexity()` uses simple heuristics:

1. attachments push complexity higher
2. group chat pushes complexity higher
3. very long prompts push complexity higher
4. JSON tasks are usually medium

This is a lightweight but useful strategy.

It keeps routing explainable.

## Fallback Logic

`runModelPromptWithFallback()` is one of the most important functions in the backend.

It:

1. builds the attempt chain
2. logs each attempt
3. runs the request
4. normalizes errors
5. retries only on retryable failure classes

Retryable examples:

1. rate limit
2. model unavailable
3. provider credit problem
4. timeout
5. transient server failure

Non-retryable examples:

1. hard malformed requests
2. invalid local logic

## Quota And Rate Limits

Two separate layers protect the system.

### `services/aiQuota.js`

In-memory per-key request budget for AI operations.

Default:

1. 20 requests
2. 15-minute window

### `middleware/rateLimit.js`

Express transport-level throttling for:

1. auth routes
2. general API
3. AI routes

Why both exist:

one protects cost, the other protects traffic and abuse.

## Upload And Attachment Safety

`middleware/upload.js` controls:

1. allowed MIME types
2. file size cap
3. stored filename policy
4. upload directory

Then `buildAttachmentPayload()` in `services/gemini.js` decides how attached files influence the prompt.

This separation is good:

1. upload layer handles file acceptance
2. AI layer handles prompt usage

## Socket Security

`middleware/socketAuth.js` verifies the JWT token from the socket handshake and attaches the user identity to the socket.

This makes room AI follow the same identity model as REST APIs.

## Logging

`helpers/logger.js` provides:

1. request ids
2. sensitive-value redaction
3. context serialization
4. error normalization

Why that matters in AI systems:

1. provider failures are messy
2. request debugging needs correlation ids
3. prompts and auth tokens can contain sensitive data

The logger helps observability without leaking secrets.

## Cost Optimization Built Into The Core

1. model auto-routing can prefer cheaper models
2. completion token budgets differ by task
3. prompt sections are truncated
4. recent history is clipped
5. project files are limited
6. helper endpoints use JSON-only small replies

## Shared Risks

1. in-memory quota resets on process restart
2. fallback can hide some provider instability from end users
3. provider APIs can change shape over time
4. attachment extraction is partial for PDFs in this build

## Example End-To-End Core Flow

```text
[REST or Socket event]
   |
   +--> auth / socketAuth
   +--> rate limit / quota
   +--> attachment validation
   +--> prompt build
   +--> model routing
   +--> provider call
   +--> token extraction
   +--> error normalization / fallback
   +--> response returned to feature route
```

## Why This Layer Matters

Without this shared core, every AI feature would duplicate:

1. provider integration
2. model logic
3. token parsing
4. fallback rules
5. logging
6. limits

That would be hard to maintain and very error-prone.

This layer is the reason the backend feels like one AI platform instead of several unrelated AI endpoints.

## Provider Adapter Notes

Each provider adapter hides differences in:

1. request URL
2. auth header style
3. model naming
4. message format
5. usage metadata format

The rest of the backend should not need to know those details.

That is the whole point of the adapter layer.

### OpenAI-like adapters

OpenRouter, Grok, Groq, Together, and Hugging Face all use similar chat-completions style payloads.

That lets the backend reuse:

1. `buildOpenAiMessages`
2. `extractTextFromOpenAiLikeResponse`
3. `extractUsageFromOpenAiLikeResponse`

### Gemini adapter

Gemini is handled differently because:

1. it uses `generateContent`
2. image input is sent as inline data
3. usage metadata fields have a different shape

The core layer normalizes those differences before any feature code sees them.

## Catalog Refresh Strategy

The backend can refresh live provider model catalogs.

Why this matters:

1. model availability changes
2. providers deprecate models
3. new models appear
4. feature flags like file support can change

The catalog cache also avoids hitting provider catalog endpoints on every request.

## Shared Failure Classification

The error normalization logic is one of the most important parts of the platform core.

It turns messy provider errors into useful categories:

1. `AI_RATE_LIMITED`
2. `AI_MODEL_UNAVAILABLE`
3. `AI_PROVIDER_CREDIT_EXHAUSTED`
4. `AI_REQUEST_FAILED`

This gives the route layer stable behavior even when provider APIs are inconsistent.

## Security Notes

### Token safety

The logger redacts sensitive values like:

1. access tokens
2. refresh tokens
3. API keys
4. cookies
5. secrets

### File safety

The upload layer:

1. restricts MIME types
2. restricts file size
3. generates unique filenames
4. stores uploads in a known directory

### Socket safety

The socket auth middleware rejects invalid or expired tokens before the user can reach AI events.

## Production Readiness Checklist

Before calling this layer production-ready, a team should confirm:

1. provider API keys exist for the intended environments
2. default model ids match currently available catalog entries
3. alerting exists for repeated fallback spikes
4. logs capture request ids and model ids
5. quota limits match expected traffic and budget
6. upload size limits match frontend expectations
7. prompt templates are reviewed by admins

## Common Operational Questions

### Why do users sometimes get a different model than the one they requested

Because:

1. they may have selected `auto`
2. the requested model may be missing
3. fallback may have replaced the original model after failure

### Why are some JSON helper calls still returning fallback output

Because:

1. provider output may not parse as JSON
2. the provider may have failed entirely
3. the route intentionally prefers graceful degradation for some features

### Why is PDF support limited

Because the current attachment logic preserves metadata text for PDFs but does not extract full PDF text in this build.

## Future Improvements

Logical next upgrades for this core layer would be:

1. persistent quota storage instead of in-memory counters
2. per-provider circuit breakers
3. richer metrics exports
4. prompt-version tracking in every AI response
5. true PDF text extraction
6. provider health scoring for routing decisions

## Final Practical Insight

If you understand this core layer, every other AI feature in the backend becomes much easier to understand.

That is because most feature-specific code is really just:

1. collecting context
2. calling the core
3. storing or displaying the result

## Quick Mental Model

If you want the simplest way to think about this layer, think of it as a translator and coordinator.

It translates:

1. app-level AI tasks into provider requests
2. provider responses into app-level results
3. provider failures into stable backend errors

## Final Tiny FAQ

### Is this layer only for Gemini

No.

Despite the filename, it is a multi-provider orchestration layer.

### Do feature routes call providers directly

No.

They should go through this shared core.
