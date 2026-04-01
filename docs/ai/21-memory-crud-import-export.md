# 21. Memory CRUD Import Export

## Purpose

This document explains the user-facing memory APIs plus import/export side effects.

## Relevant Files

- `routes/memory.js`
- `services/importExport.js`
- `models/MemoryEntry.js`
- `models/ImportSession.js`
- `models/Conversation.js`
- `models/ConversationInsight.js`

## CRUD Endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/memory` | GET | list memory entries |
| `/api/memory/:id` | PUT | update summary/details/tags/pin/scores |
| `/api/memory/:id` | DELETE | delete one memory |
| `/api/memory/import` | POST | preview or import raw content |
| `/api/memory/export` | GET | export bundle |

## List Behavior

- filters by `userId`
- optional `q` search is applied in-memory after query
- optional `pinned=true`
- max limit `100`
- sort order: `pinned desc`, `updatedAt desc`

## Update Behavior

The route allows direct updates to:

- `summary`
- `details`
- `tags`
- `pinned`
- `confidenceScore`
- `importanceScore`

It clamps numeric scores between `0` and `1`.

## Import Preview

`mode: "preview"` parses raw content and returns:

- detected source type
- preview conversation list
- candidate memories
- parse errors

No DB writes happen in preview mode.

## Import Mode

`mode: "import"`:

1. hashes raw content
2. reuses a prior imported `ImportSession` if fingerprint already exists
3. parses imported conversations
4. creates `Conversation` rows for new conversations
5. extracts/upserts memories from imported user text
6. refreshes conversation insights
7. updates the `ImportSession` with imported IDs and counts

## Export Modes

`GET /api/memory/export?format=` supports:

- `normalized`
- `markdown`
- `adapter`

The export includes conversations, insights, and memories, not just memory rows.

## Risks

- import is not transactional across conversations, memory rows, and insights
- a partially failed import can still create some records
- export reads room insights too because `exportUserBundle()` selects `{ $or: [{ userId }, { scopeType: 'room' }] }`

## Rebuild Notes

1. split “memory import” from “conversation import” if product semantics allow it
2. add explicit transaction or resumable job behavior for larger imports
3. keep preview mode because it prevents blind destructive imports

