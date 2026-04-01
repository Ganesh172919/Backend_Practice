# 09. Sentiment Flow

## Purpose

This document explains `POST /api/ai/sentiment`, including defaults, JSON parsing, and error handling.

## Relevant Files

- `routes/ai.js`
- `services/gemini.js`
- `services/promptCatalog.js`
- `models/User.js`

## Request Shape

```json
{
  "text": "I think the release is finally stable.",
  "modelId": "auto"
}
```

## Flow Summary

1. authenticate
2. apply AI route limiter
3. apply AI quota middleware
4. load user AI feature preferences
5. reject if `settings.aiFeatures.sentimentAnalysis === false`
6. validate `text`
7. fetch `sentiment` prompt template
8. call `getJsonFromModel(...)`
9. normalize output into `{ sentiment, confidence, emoji, model }`

## Prompt Shape

The route sends three sections:

- prompt-template content or default
- allowed sentiments list
- truncated message text up to 500 chars

## Default And Fallback Behavior

The fallback object is:

```json
{
  "sentiment": "neutral",
  "confidence": 0.5,
  "emoji": ":|"
}
```

If the provider call fails or JSON parsing falls back:

- a warning log is emitted
- the route still returns a valid neutral response

## No Persistence

Sentiment analysis does not create any stored record. It only reads:

- `User.settings`
- prompt template state

## Failure Cases

| Failure | Result |
| --- | --- |
| missing/non-string text | `400` |
| feature disabled | `403` |
| provider/JSON failure | neutral fallback still returned |
| unexpected route exception | `500` with `requestId` |

## Risks And Limitations

- no audit trail exists for what text was analyzed
- confidence is whatever the model returns, lightly normalized to number-or-default
- graceful fallback can hide provider instability from the client

## `dist/` Drift Notes

`dist/services/aiFeature.service.js` expects:

- input key `message`, not `text`
- output keys `label`, `confidence`, and `reason`
- settings key `sentiment`, not `sentimentAnalysis`

## Rebuild Notes

1. decide whether sentiment is best-effort UX sugar or a critical API
2. if critical, surface fallback provenance explicitly
3. standardize label vocabulary and downstream consumers

