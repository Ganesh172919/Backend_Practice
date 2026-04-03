# AI Helper Endpoints
# Feature Deep Dive

Primary source files:

1. `routes/ai.js`
2. `services/gemini.js`
3. `services/promptCatalog.js`
4. `middleware/aiQuota.js`
5. `middleware/rateLimit.js`
6. `models/User.js`

## What This Feature Is

This feature exposes smaller AI tools that are not full conversations.

Endpoints:

1. `GET /api/ai/models`
2. `POST /api/ai/smart-replies`
3. `POST /api/ai/sentiment`
4. `POST /api/ai/grammar`

These endpoints are useful because many products need small AI helpers without saving an entire conversation thread.

## Why This Feature Exists

It solves four practical UI needs:

1. show which models are available
2. generate suggested quick replies
3. classify tone or emotion
4. correct grammar

This keeps AI available in small focused tools instead of forcing everything through the main chat feature.

## Controller Flow

All helper endpoints use a similar pattern:

```text
auth
  -> route limiter
  -> AI quota
  -> user preference check
  -> input validation
  -> prompt template load
  -> getJsonFromModel()
  -> normalize response
  -> fallback if needed
```

## `GET /api/ai/models`

Purpose:

list available models and expose the `auto` routing option.

Important logic:

1. `refreshModelCatalogs()` refreshes provider catalogs
2. `getAvailableModels()` returns usable provider-backed models
3. `resolveModel(MODEL_NAME)` finds the backend default

Response includes:

1. model id
2. label
3. provider
4. file-support flag
5. default model id
6. empty-state message if nothing is configured

## `POST /api/ai/smart-replies`

Purpose:

generate exactly 3 short reply suggestions from recent messages.

Prompt inputs:

1. optional context string
2. up to 6 recent messages
3. prompt template content

Fallback:

If the AI call fails, the route uses simple deterministic replies based on whether the last message looks like a question.

Why this is good:

smart replies stay available even during provider issues.

## `POST /api/ai/sentiment`

Purpose:

classify a short message into sentiment with confidence and emoji.

Prompt strategy:

1. use a prompt template
2. restrict the allowed sentiment labels
3. cap user text length to 500 characters

Fallback:

neutral sentiment with medium confidence.

## `POST /api/ai/grammar`

Purpose:

return corrected text and improvement suggestions.

Prompt strategy:

1. JSON-only output
2. short input slice
3. small suggestion list

Fallback:

return original text with no suggestions.

## User Preferences

The feature reads AI settings from `models/User.js`:

1. `settings.aiFeatures.smartReplies`
2. `settings.aiFeatures.sentimentAnalysis`
3. `settings.aiFeatures.grammarCheck`

This matters because the system respects per-user AI controls instead of exposing everything to everyone.

## AI Model And Prompt Details

The helper feature does not call provider SDKs directly.

It uses `getJsonFromModel()` from `services/gemini.js`.

That means helper endpoints inherit:

1. shared model routing
2. shared fallback behavior
3. shared token handling
4. shared provider abstraction

## Data Flow

```text
[Request]
   |
   v
[routes/ai.js]
   |
   +--> load user AI preferences
   +--> load prompt template
   +--> call getJsonFromModel
   |
   v
[normalize JSON result]
   |
   v
[response]
```

## Example Requests

### Smart replies

```json
{
  "messages": [
    { "username": "alex", "content": "Can you send the updated draft today?" }
  ],
  "context": "work chat",
  "modelId": "auto"
}
```

### Sentiment

```json
{
  "text": "I am excited but also a little nervous about the launch.",
  "modelId": "auto"
}
```

### Grammar

```json
{
  "text": "he dont knows where the file are",
  "modelId": "auto"
}
```

## Example Responses

### Smart replies

```json
{
  "suggestions": [
    "Yes, I can send it today.",
    "I will share the updated draft shortly.",
    "Do you want the final or review version?"
  ],
  "model": "openai/gpt-5.4-mini"
}
```

### Sentiment

```json
{
  "sentiment": "excited",
  "confidence": 0.81,
  "emoji": "🤩",
  "model": "gemini-2.5-flash"
}
```

### Grammar

```json
{
  "corrected": "He doesn't know where the files are.",
  "suggestions": [
    "Use 'doesn't' instead of 'dont'.",
    "Use 'files are' for plural agreement."
  ],
  "model": "gemini-2.5-flash"
}
```

## Rate Limiting And Cost Protection

This feature uses two controls:

1. `aiLimiter` from `middleware/rateLimit.js`
2. `aiQuotaMiddleware` from `middleware/aiQuota.js`

Why both exist:

1. route limiter protects transport and abuse
2. quota protects AI spend and backend operations

## Failure And Edge Cases

1. feature disabled in user settings -> `403`
2. invalid body shape -> `400`
3. provider failure -> deterministic fallback when possible
4. no configured models -> model discovery endpoint explains the empty state

## Architecture Diagram

```text
[Client]
   |
   v
[routes/ai.js]
   |
   +--> [User settings]
   +--> [PromptTemplate lookup]
   +--> [services/gemini.js]
   |         |
   |         +--> model routing
   |         +--> provider call
   |         +--> JSON parsing
   v
[JSON response]
```

## Why This Design Works

These endpoints feel small on the outside, but they reuse the same strong AI platform as the larger chat features.

That keeps behavior consistent across the product while still giving the frontend cheap, focused AI tools.

## Endpoint Contract Details

### Model listing request contract

Request:

1. requires auth
2. has no body
3. always refreshes model catalogs before returning data

Important response fields:

1. `models`
2. `defaultModelId`
3. `hasConfiguredModels`
4. `emptyStateMessage`

Why these matter:

the frontend can use them to build a model selector and a clear empty state.

### Smart replies request contract

Required fields:

1. `messages`

Optional fields:

1. `context`
2. `modelId`

Behavior details:

1. only the most recent 6 messages are serialized
2. each message becomes `speaker: content`
3. the AI is asked for exactly 3 replies
4. results are normalized and padded to length 3 if needed

### Sentiment request contract

Required fields:

1. `text`

Optional fields:

1. `modelId`

Behavior details:

1. text is capped to 500 characters for the prompt
2. sentiment labels are constrained in the prompt itself
3. confidence is normalized to a number

### Grammar request contract

Required fields:

1. `text`

Optional fields:

1. `modelId`

Behavior details:

1. text must be at least 3 characters
2. response is normalized into `corrected` plus `suggestions`
3. fallback preserves original text if AI fails

## Internal Flow Per Endpoint

### Smart replies internal flow

```text
request
  ->
load user AI settings
  ->
validate messages array
  ->
serialize recent messages
  ->
load prompt template
  ->
call getJsonFromModel
  ->
normalize to 3 suggestions
  ->
response
```

### Sentiment internal flow

```text
request
  ->
load user AI settings
  ->
validate text
  ->
load sentiment prompt template
  ->
call getJsonFromModel
  ->
normalize sentiment payload
  ->
response
```

### Grammar internal flow

```text
request
  ->
load user AI settings
  ->
validate text length
  ->
load grammar prompt template
  ->
call getJsonFromModel
  ->
normalize corrected text
  ->
response
```

## Observability Notes

These routes use the shared logger for failure cases.

Important event names:

1. `SMART_REPLIES_FALLBACK`
2. `SMART_REPLIES_FAILED`
3. `SENTIMENT_FALLBACK`
4. `SENTIMENT_FAILED`
5. `GRAMMAR_FALLBACK`
6. `GRAMMAR_FAILED`

These logs help separate:

1. expected graceful fallback behavior
2. hard endpoint failures

## Debugging Checklist

If one helper endpoint behaves strangely, check:

1. whether the user disabled that feature in settings
2. whether `modelId` is valid
3. whether the selected prompt template was changed recently
4. whether the route is rate-limited
5. whether fallback responses are masking provider issues
6. whether the frontend is sending the expected JSON shape

## Design Trade-Offs

### Strength

The helper endpoints are cheap to integrate on the frontend.

### Strength

They reuse the same AI platform as bigger features.

### Trade-off

They do not persist a conversation record, so they cannot learn from repeated helper usage by themselves.

### Trade-off

They rely on prompt instructions for output structure instead of rigid schemas enforced by the provider.

## Extension Ideas

This feature could naturally grow to include:

1. title generation
2. rewrite tone changes
3. translation
4. short summarization
5. hashtag or keyword extraction

The current structure would support those additions easily because `getJsonFromModel()` is already reusable.
