# 30. API Reference

## Purpose

This is the concise AI endpoint reference for the live source tree.

## Core Endpoints

| Endpoint | Method | Body highlights | Response highlights |
| --- | --- | --- | --- |
| `/api/chat` | POST | `message`, `conversationId?`, `history?`, `modelId?`, `attachment?`, `projectId?` | `content`, `conversationId`, `memoryRefs`, `insight`, model metadata |
| `/api/ai/models` | GET | none | `models`, `defaultModelId`, `hasConfiguredModels` |
| `/api/ai/smart-replies` | POST | `messages[]`, `context?`, `modelId?` | `suggestions`, `model` |
| `/api/ai/sentiment` | POST | `text`, `modelId?` | `sentiment`, `confidence`, `emoji`, `model` |
| `/api/ai/grammar` | POST | `text`, `modelId?` | `corrected`, `suggestions`, `model` |
| `/api/conversations/:id/insights` | GET | `modelId?` query | insight object or `null` |
| `/api/conversations/:id/actions/:action` | POST | optional `modelId` | summary/tasks/decisions plus `insight` |
| `/api/rooms/:id/insights` | GET | `modelId?` query | room insight or `null` |
| `/api/rooms/:id/actions/:action` | POST | optional `modelId` | summary/tasks/decisions plus `insight` |
| `/api/memory` | GET | `q?`, `pinned?`, `limit?` | array of memory entries |
| `/api/memory/import` | POST | `content`, `filename?`, `mode` | preview or import result |
| `/api/memory/export` | GET | `format?` | normalized JSON, markdown, or adapter export |
| `/api/admin/prompts/:key` | PUT | `content`, `version?`, `description?` | updated prompt template |
| `/api/uploads` | POST | multipart `file` | `fileUrl`, `fileName`, `fileType`, `fileSize` |

## Common Error Patterns

- `400` validation failures
- `403` AI feature disabled or room access denied
- `404` project/conversation/room/memory not found
- `429` AI quota or route limiter
- `503` provider/model unavailable for solo chat
- `500` generic server failure

## Example Action Endpoints

Valid `:action` values for conversations and rooms:

- `summarize`
- `extract-tasks`
- `extract-decisions`

## Rebuild Notes

1. standardize envelopes
2. publish explicit schemas
3. keep storage side effects documented next to endpoint definitions

