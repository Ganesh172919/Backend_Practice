# 36. Inconsistencies And Code Drift

## Purpose

This document captures the most important AI-related differences between the editable source tree and `dist/`.

## Core Finding

`dist/` is not just compiled output of the same runtime shape. It reflects a materially different backend architecture.

## Major Drift Areas

### Data layer

- source: Mongoose + MongoDB ObjectIds
- `dist`: Prisma + UUID-style IDs

### Runtime entrypoint

- source: monolithic `index.js`
- `dist`: split `app.js`, `server.js`, `socket/index.js`

### Room AI implementation

- source: `trigger_ai` lives directly in `index.js`
- `dist`: `trigger_ai` lives in `dist/socket/index.js` and delegates to services

### REST payloads

- source helper routes expect `messages`, `text`, and direct JSON responses
- `dist` helper routes expect `message` and return wrapped `{ success, data }`

### Settings keys

- source: `sentimentAnalysis`, `grammarCheck`
- `dist`: `sentiment`, `grammar`

### Prompt templates

- source: one active template per `key` pattern
- `dist`: versioned `key_version` upserts and cached prompt catalog

### Room AI events

- source: `error_message`, `ai_response`, `status`
- `dist`: `socket_error`, `message_created`, `thinking`

## Concrete Drift Table

| Topic | Source | `dist` impact |
| --- | --- | --- |
| room history format | Gemini-style `{ role, parts }` in `Room.aiHistory` | prompt/response objects in Prisma room record |
| memory import | raw content parsing | structured entry import |
| attachment support | file URL + disk read | richer `textContent` and `base64` fields |
| insight service API | `getConversationInsight`, `getRoomInsight` | generic `getInsight(scopeType, scopeId)` |

## Documentation Rule

For this docs suite:

- source is the primary truth
- `dist` differences are called out explicitly as drift
- `dist` is never treated as authoritative when it disagrees with source

## Rebuild Notes

1. either regenerate `dist` from current source or remove it from the repo if it is archival
2. keep runtime contracts versioned so drift is easy to spot
3. avoid shipping two architectural stories in one repository

