# 22. Conversation Insights Overview

## Purpose

This document explains why insights exist, what scopes they cover, and when they refresh.

## Relevant Files

- `services/conversationInsights.js`
- `routes/conversations.js`
- `routes/rooms.js`
- `routes/chat.js`
- `index.js`
- `models/ConversationInsight.js`

## Why Insights Exist

Insights give the system a compact summary of prior conversation state that is cheaper to inject than full history and more structured than raw transcript text.

## Supported Scopes

| Scope | Stored as |
| --- | --- |
| solo conversation | `scopeType: 'conversation'` |
| room | `scopeType: 'room'` |

## What An Insight Stores

- `title`
- `summary`
- `intent`
- `topics`
- `decisions`
- `actionItems`
- `messageCount`
- `lastGeneratedAt`

## Refresh Triggers

| Trigger | Scope |
| --- | --- |
| successful solo chat response | conversation |
| `GET /api/conversations/:id/insights` on cache miss | conversation |
| `POST /api/conversations/:id/actions/:action` | conversation |
| normal room messages and replies | room |
| successful room AI response | room |
| `GET /api/rooms/:id/insights` on cache miss | room |
| `POST /api/rooms/:id/actions/:action` | room |

## Why Staleness Still Exists

Insights refresh often, but they can still become stale because:

- reads may use existing insight without checking transcript freshness
- failed refreshes fall back to old stored insight
- chat route reads existing insight before generating a new answer, then refreshes only after the answer

## Scope Key

The unique key format is:

```text
conversation:<conversationId>:<userId>
room:<roomId>:global
```

This is how the source isolates user-specific conversation insights from shared room insights.

## Risks

- room insights are global to the room, not personalized
- action-item extraction quality depends on prompt and recent-message window
- frequent refreshes increase provider cost and write volume

## Rebuild Notes

1. define explicit freshness semantics instead of “refresh sometimes”
2. keep conversation and room scopes separate
3. record which transcript version an insight summarizes

