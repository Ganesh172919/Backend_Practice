# 28. Response Storage And History

## Purpose

This document explains where AI responses are stored and why solo chat and room AI use different storage patterns.

## Relevant Files

- `models/Conversation.js`
- `models/Message.js`
- `models/Room.js`
- `routes/chat.js`
- `index.js`

## Solo Chat Storage

Solo AI responses are stored inside `Conversation.messages` as embedded assistant messages.

They include:

- text content
- timestamp
- `memoryRefs`
- file metadata if attached to the user message
- model/provider/routing/token metadata on assistant messages

## Room AI Storage

Room AI responses are stored in two places:

1. `Message` collection for user-visible room transcript
2. `Room.aiHistory` for future prompt context

## Why They Differ

Solo conversations are already an embedded history model. Rooms are not:

- room transcript is a top-level `Message` collection
- room AI prompt history needs a compact format
- room prompt history starts with seeded prompt messages

## History Windows

| Store | Retention behavior |
| --- | --- |
| `Conversation.messages` | full embedded history unless user deletes conversation |
| `Room.aiHistory` | trimmed to 42 entries max in source |
| room `Message` collection | persistent until deleted |
| insight generation window | 20 messages for conversation, 40 messages for room refresh |

## Stored AI Telemetry Differences

| Field | Solo chat | Room AI |
| --- | --- | --- |
| `modelId` | yes | yes |
| `provider` | yes | yes |
| `requestedModelId` | yes | no |
| `processingMs` | yes | no |
| token counts | yes | no |
| `autoMode` / `autoComplexity` / `fallbackUsed` | yes | no |

## Error Responses In Storage

- solo chat failures do not create stored assistant records
- room AI failures do create a stored generic AI error message in the room transcript

## Rebuild Notes

1. decide whether room AI should store full telemetry like solo chat
2. consider a shared response envelope model across both paths
3. keep prompt-facing history separate only if it materially improves performance or correctness

