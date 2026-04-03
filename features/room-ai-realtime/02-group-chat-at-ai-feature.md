# Room AI Realtime
# File 02: Group Chat `@ai` Feature Deep Dive

Primary source files:

1. `index.js`
2. `services/gemini.js`
3. `models/Room.js`
4. `models/Message.js`
5. `services/memory.js`
6. `services/conversationInsights.js`
7. `middleware/socketAuth.js`

## Important Clarification

The backend does not literally parse normal room messages for the string `@ai`.

What it does expose is a dedicated socket event:

`trigger_ai`

Inference from the backend comments:

the comments in `index.js` strongly suggest the frontend treats `@ai` as a special command and then emits `trigger_ai`.

So the backend documentation should describe this as the group-chat `@ai` feature path, while being clear that the visible `@ai` syntax is most likely a frontend convention.

## What This Feature Does

This is the backend flow that turns a group-chat AI mention into a shared room AI response.

It:

1. validates the request
2. checks quota
3. checks room membership
4. retrieves memory
5. retrieves room insight
6. calls the AI model
7. stores the AI output
8. broadcasts the result

## Main Entry Point

`index.js`:

`socket.on('trigger_ai', async ({ roomId, prompt, modelId, attachment }, callback) => { ... })`

This is the controller for group AI invocation.

## End-To-End Flow

```text
user types @ai in frontend
   ->
frontend emits trigger_ai
   ->
server validates prompt and attachment
   ->
server emits ai_thinking=true
   ->
quota and membership checks
   ->
retrieve memories + room insight
   ->
sendGroupMessage()
   ->
update Room.aiHistory
   ->
save AI Message
   ->
refresh room insight
   ->
emit ai_thinking=false
   ->
emit ai_response
```

## Validation Rules

The feature rejects:

1. empty prompt
2. prompt longer than 4000 chars
3. malformed attachment payload
4. callers who are not actually in the room
5. callers who exceeded AI quota

This is important because room AI is both expensive and public to other room members.

## Why `ai_thinking` Exists

Before running the model, the server broadcasts:

```json
{
  "roomId": "...",
  "status": true
}
```

This lets clients show a room-level AI typing indicator.

That is a UX improvement, but it also makes the room state easier to understand during slower model calls.

## Memory And Insight Reads

The handler loads these in parallel:

1. `retrieveRelevantMemories`
2. `getRoomInsight`

Why parallel:

these are independent reads and do not need to block each other.

## Group Prompt Strategy

`sendGroupMessage()` in `services/gemini.js` builds a room-aware prompt using:

1. room AI history
2. memory context
3. insight context
4. room name
5. triggering username
6. attachment context

The triggering username matters because the AI needs to know who asked the question inside the room.

## What Gets Stored

### `Room.aiHistory`

The room keeps a compact AI prompt history:

1. a user-style turn like `[username asks]: prompt`
2. a model turn containing the AI response

This is used for future AI context.

### `Message`

A full room-visible `Message` is also saved with:

1. `isAI: true`
2. `triggeredBy`
3. `modelId`
4. `provider`
5. `memoryRefs`

This is used for the room transcript and client display.

## Why There Are Two Writes

This feature writes both:

1. prompt history state
2. room transcript state

Why:

they solve different problems.

`Room.aiHistory` is optimized for prompt assembly.

`Message` is optimized for room UX and room persistence.

## History Trimming

The handler trims `Room.aiHistory` to keep:

1. the initial two seed turns
2. the latest conversational window

Why:

otherwise room AI context would become too large, too slow, and too expensive.

## Success Flow

On success:

1. room AI response is generated
2. `Room.aiHistory` is updated
3. AI `Message` is saved
4. memories are marked used
5. room insight is refreshed
6. `ai_thinking` is cleared
7. `ai_response` is broadcast

## Failure Flow

On failure:

1. `ai_thinking` is cleared
2. an AI-style error `Message` is still saved
3. `ai_response` is still broadcast with that error message
4. the requesting client receives structured error metadata

This is a very good design for shared rooms because silent AI failure would confuse everyone in the room.

## Real Example

Likely frontend UX:

`@ai summarize what we decided and list next actions`

Likely backend event payload:

```json
{
  "roomId": "67fa00000000000000000001",
  "prompt": "summarize what we decided and list next actions",
  "modelId": "auto"
}
```

## Example Success Broadcast

```json
{
  "id": "67fa00000000000000000099",
  "userId": "ai",
  "username": "Gemini",
  "content": "Here is a summary of the discussion and the next steps...",
  "isAI": true,
  "triggeredBy": "raviprakash",
  "modelId": "gemini-2.5-flash",
  "provider": "gemini"
}
```

## Data Flow Diagram

```text
[group chat AI request]
   |
   v
[trigger_ai socket event]
   |
   +--> [memory retrieval]
   +--> [room insight retrieval]
   +--> [group prompt assembly]
   +--> [provider call]
   |
   v
[Room.aiHistory update]
   |
   v
[Message save]
   |
   v
[room broadcast]
```

## Query And Write Explanation

### Room read

Confirms:

1. room exists
2. user belongs to room
3. AI history is available

### Memory read

Returns user-specific memory relevant to the current room AI prompt.

### Insight read

Returns compact room summary state.

### Room write

Updates `aiHistory`.

### Message write

Stores the final AI reply as a chat message.

### Insight refresh

Keeps room summary up to date after the AI reply changes room state.

## Security And Guardrails

1. socket auth required
2. flood control required
3. room membership required
4. active room join required
5. AI quota required
6. attachment validation required

These are all important because the feature mixes realtime traffic with paid AI work.

## Debugging Checklist

If the group-chat `@ai` feature looks broken, check:

1. did the frontend emit `trigger_ai`
2. did socket auth succeed
3. did the room join happen first
4. did `ai_thinking` turn on and off
5. which `modelId` and `provider` were used
6. was a fallback error message saved
7. did `Room.aiHistory` update
8. did `Message` save correctly

## Important Design Insight

The backend keeps normal group messaging and AI group actions separate.

That is a good design because it keeps:

1. ordinary chat cheap
2. AI intent explicit
3. quota enforcement straightforward
4. room AI behavior easier to reason about

## Final Understanding

The group-chat `@ai` feature is really a dedicated realtime AI command flow built on sockets.

It combines:

1. mention-like frontend UX
2. backend AI orchestration
3. shared room persistence
4. personalization
5. realtime broadcasting

That makes it one of the most important AI features in the backend.
