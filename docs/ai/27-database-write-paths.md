# 27. Database Write Paths

## Purpose

This document lists the exact MongoDB writes that happen across AI flows.

## Relevant Files

- `routes/chat.js`
- `index.js`
- `services/memory.js`
- `services/conversationInsights.js`
- `services/importExport.js`
- `routes/admin.js`
- `routes/projects.js`
- `routes/settings.js`

## Solo Chat Writes

| Step | Write |
| --- | --- |
| create conversation if needed | `new Conversation(...); save()` |
| append user message | embedded push into `conversation.messages` |
| append assistant message | embedded push into `conversation.messages` |
| memory extraction | `MemoryEntry.create()` or existing row `save()` |
| memory usage | `MemoryEntry.updateMany()` |
| insight refresh | `ConversationInsight.findOneAndUpdate(..., { upsert: true })` |

## Room AI Writes

| Step | Write |
| --- | --- |
| prompt memory extraction | `MemoryEntry.create()` or existing row `save()` |
| AI history update | `room.save()` after appending to `aiHistory` |
| AI transcript message | `new Message(...); save()` |
| memory usage | `MemoryEntry.updateMany()` |
| insight refresh | `ConversationInsight.findOneAndUpdate(..., { upsert: true })` |

## Non-AI Room Message Writes That Affect AI

Normal `send_message` and `reply_message` flows:

- create `Message`
- call `refreshRoomInsight(roomId)`

That means human-only room traffic still drives AI-derived insight writes.

## Memory CRUD And Import Writes

- `PUT /api/memory/:id` -> `findOneAndUpdate`
- `DELETE /api/memory/:id` -> `findOneAndDelete`
- import preview -> no writes
- import mode -> `ImportSession`, `Conversation`, `MemoryEntry`, `ConversationInsight`

## Prompt And Settings Writes

- admin prompt update -> `PromptTemplate.findOneAndUpdate(..., { upsert: true })`
- settings update -> `User.findByIdAndUpdate({ $set: updateData })`
- project create/update/delete -> `Project` writes and `Conversation.updateMany()` when deleting a project

## Risks

- many flows perform multiple writes without transactions
- room AI writes memory before provider success is known
- insight refresh is an extra write on top of successful chat/message flows

## Rebuild Notes

1. classify which writes are primary and which are derived
2. consider transactions or outbox jobs for derived writes
3. log write batches with one correlation ID

