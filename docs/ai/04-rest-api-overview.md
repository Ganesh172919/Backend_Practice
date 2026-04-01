# 04. REST API Overview

## Purpose

This document summarizes all AI-related REST endpoints in the live source tree, including auth, request patterns, and response shapes.

## Auth Model

All AI REST endpoints are authenticated with `middleware/auth.js`.

Additional guards:

- `aiLimiter` for `/api/ai/*`
- `aiQuotaMiddleware` for `/api/chat` and `/api/ai/*` feature routes
- `adminCheck` for prompt-management endpoints

## Endpoint Table

| Endpoint | Method | Auth | Rate/Quota | Purpose |
| --- | --- | --- | --- | --- |
| `/api/chat` | POST | yes | AI quota only | solo AI chat |
| `/api/ai/models` | GET | yes | no AI quota | list discoverable models plus `auto` |
| `/api/ai/smart-replies` | POST | yes | AI route limiter + quota | quick replies |
| `/api/ai/sentiment` | POST | yes | AI route limiter + quota | sentiment |
| `/api/ai/grammar` | POST | yes | AI route limiter + quota | grammar |
| `/api/conversations/:id/insights` | GET | yes | no AI quota | read or lazily generate conversation insight |
| `/api/conversations/:id/actions/:action` | POST | yes | no AI quota | force conversation insight refresh for summary/tasks/decisions |
| `/api/rooms/:id/insights` | GET | yes, room member | no AI quota | read or lazily generate room insight |
| `/api/rooms/:id/actions/:action` | POST | yes, room member | no AI quota | force room insight refresh |
| `/api/memory` | GET | yes | no AI quota | list memory |
| `/api/memory/:id` | PUT | yes | no AI quota | update memory |
| `/api/memory/:id` | DELETE | yes | no AI quota | delete memory |
| `/api/memory/import` | POST | yes | no AI quota | preview or import raw content |
| `/api/memory/export` | GET | yes | no AI quota | export conversations/insights/memory bundle |
| `/api/admin/prompts` | GET | yes, admin | no AI quota | list prompt templates |
| `/api/admin/prompts/:key` | PUT | yes, admin | no AI quota | update prompt template |
| `/api/uploads` | POST | yes | upload size limit | upload attachment file |
| `/api/uploads/:filename` | GET | no | file retrieval | serve uploaded file |
| `/api/projects/*` | mixed | yes | no AI quota | manage project context used by solo chat |

## Response Shape Reality

The live source does not wrap responses in `{ success, data }`. It mostly returns direct JSON objects such as:

- `{ content, conversationId, modelId, provider, ... }`
- `{ suggestions, model }`
- `{ sentiment, confidence, emoji, model }`
- `{ corrected, suggestions, model }`

## Example: Solo Chat Request

```json
{
  "message": "Summarize my release plan",
  "conversationId": "660af4d9e4a61cf2f7f47d01",
  "history": [
    { "role": "user", "content": "We ship on Friday" }
  ],
  "modelId": "auto",
  "projectId": "660af4d9e4a61cf2f7f47d90",
  "attachment": {
    "fileUrl": "/api/uploads/abc123.txt",
    "fileName": "notes.txt",
    "fileType": "text/plain",
    "fileSize": 120
  }
}
```

## Database Touchpoints By Endpoint

| Endpoint | Reads | Writes |
| --- | --- | --- |
| `/api/chat` | `Conversation`, `Project`, `MemoryEntry`, `ConversationInsight` | `Conversation`, `MemoryEntry`, `ConversationInsight` |
| `/api/ai/models` | none beyond in-memory catalog | none |
| `/api/ai/*` helper endpoints | `User`, `PromptTemplate` | none |
| `/api/conversations/:id/insights` | `ConversationInsight`, maybe `Conversation` on miss | maybe `ConversationInsight` on miss |
| `/api/rooms/:id/insights` | `ConversationInsight`, maybe `Message` on miss | maybe `ConversationInsight` on miss |
| `/api/memory/import` | parsing only for preview; many reads/writes for import | `ImportSession`, `Conversation`, `MemoryEntry`, `ConversationInsight` |
| `/api/admin/prompts/:key` | `PromptTemplate` | `PromptTemplate` |

## Risks

- `/api/chat` has no `aiLimiter`, only the in-memory AI quota middleware.
- insight refresh endpoints can trigger extra provider calls even for repeated actions.
- upload retrieval is public once a file URL is known.

## `dist/` Drift Notes

The compiled API layer differs materially:

- `dist/routes/ai.routes.js` expects `message`, not `text` or `messages`
- `dist/routes/chat.routes.js` validates UUIDs and wraps results in `{ success, data }`
- `dist/routes/memory.routes.js` imports structured entries, not raw chat transcripts

## Rebuild Notes

If rebuilding:

1. formalize request schemas
2. standardize response envelopes
3. keep insight-triggering endpoints explicit about whether they read cached state or force regeneration

