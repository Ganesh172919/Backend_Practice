# 23. Conversation Insight Generation

## Purpose

This document explains the insight prompt shape, fallback logic, and persistence model.

## Relevant Files

- `services/conversationInsights.js`
- `services/memory.js`
- `services/gemini.js`
- `models/ConversationInsight.js`

## Prompt Shape

`generateInsightPayload()` builds a prompt with:

- `Return JSON only.`
- a schema example including `title`, `summary`, `intent`, `topics`, `decisions`, `actionItems`
- a fallback title
- serialized recent conversation text

Only the last 20 messages are included for conversation insights.

## Fallback Logic

If AI generation fails:

- `buildFallbackInsight()` is used
- summary becomes the first `320` chars of joined message text
- `intent` becomes `question-answering` if any `?` exists, else `discussion`
- topics are inferred from normalized words longer than 4 chars

## Persistence

`saveInsight()` writes via `findOneAndUpdate(..., { upsert: true })` and stores:

- `scopeKey`
- `scopeType`
- `scopeId`
- `userId`
- `conversationId` or `roomId`
- generated fields
- `messageCount`
- `lastGeneratedAt`

## Room Insight Generation

Room insight generation differs slightly:

- loads last 40 `Message` rows
- reverses them to chronological order
- serializes `assistant` for AI messages and `username` for user messages

## Risks

- room insights and conversation insights use different message windows
- fallback topic extraction is weak and often noisy
- source does not store prompt version even though the model has a `promptVersion` field default in the schema

## Rebuild Notes

1. persist prompt version and model metadata on insight writes
2. add freshness checks based on source message count or last message timestamp
3. make fallback generation deterministic but more semantically meaningful

