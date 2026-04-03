# Room AI Realtime
# Feature Deep Dive

Primary source files:

1. `index.js`
2. `models/Room.js`
3. `models/Message.js`
4. `routes/rooms.js`
5. `services/gemini.js`
6. `services/memory.js`
7. `services/conversationInsights.js`
8. `middleware/socketAuth.js`

## What This Feature Does

This feature lets a user trigger AI inside a collaborative room through Socket.IO.

Main event:

`trigger_ai`

Unlike solo chat, this feature is realtime and shared.

The answer is broadcast to everyone in the room.

## Why This Feature Exists

It solves a different product problem than personal AI chat.

Instead of helping one user privately, it lets a group use AI as a room participant.

That means the backend must handle:

1. realtime auth
2. room membership
3. flood control
4. group-visible thinking state
5. room prompt history
6. persisted AI room messages

## Core Storage Design

This feature stores AI state in two places:

### `Room.aiHistory`

Stored in `models/Room.js`.

Purpose:

keep a compact prompt-ready history for the model.

### `Message`

Stored in `models/Message.js`.

Purpose:

persist chat messages for the UI, export, reactions, edits, deletes, and search.

This dual-write design is important.

It improves product behavior, but it also creates consistency complexity.

## Socket Flow

```text
[Socket Client]
   |
   v
[socketAuthMiddleware]
   |
   v
[join_room]
   |
   v
[trigger_ai]
   |
   +--> flood control
   +--> quota check
   +--> room membership check
   +--> attachment validation
   +--> memory retrieval
   +--> room insight retrieval
   +--> sendGroupMessage()
   +--> update Room.aiHistory
   +--> save AI Message
   +--> mark memories used
   +--> refresh room insight
   |
   v
[emit ai_response]
```

## `trigger_ai` Step By Step

### 1. Validate prompt and attachment

The event rejects:

1. empty prompts
2. prompts longer than 4000 characters
3. invalid attachment payloads

### 2. Emit `ai_thinking`

The backend broadcasts a temporary "thinking" state so clients can show room AI typing indicators.

### 3. Quota check

`consumeAiQuota()` prevents room AI from becoming an unlimited cost surface.

### 4. Membership check

`loadRoomForMember()` confirms:

1. valid room id
2. room exists
3. caller belongs to the room

### 5. Read memory and insight

The code loads these in parallel:

1. `retrieveRelevantMemories`
2. `getRoomInsight`

This is a good optimization because both are independent reads.

### 6. Store new memory from the prompt

The prompt itself is added to the user's room-based memory source.

### 7. AI generation

`sendGroupMessage()` builds a group-chat prompt using:

1. room AI history
2. memory context
3. room insight
4. triggering username
5. attachment context
6. model choice

### 8. Update room AI history

The backend pushes:

1. a user-style AI-history turn such as `[username asks]: prompt`
2. the model response

It also trims the history window to keep the prompt bounded.

### 9. Save a visible AI message

A `Message` document is created with:

1. `isAI: true`
2. `triggeredBy`
3. `modelId`
4. `provider`
5. `memoryRefs`

### 10. Post-processing

The backend:

1. marks memories as used
2. refreshes room insight
3. clears thinking state
4. emits `ai_response`

## Room Routes That Support AI

`routes/rooms.js` adds AI-related REST support:

1. `GET /api/rooms/:id/insights`
2. `POST /api/rooms/:id/actions/:action`

These let clients fetch summaries, task lists, and decisions for a room outside the socket stream.

## Real Example

Socket payload:

```json
{
  "roomId": "67f300000000000000000001",
  "prompt": "Summarize what we decided and list next actions",
  "modelId": "auto"
}
```

Broadcast flow:

```text
ai_thinking(status=true)
   ->
AI generates response
   ->
Message saved
   ->
ai_thinking(status=false)
   ->
ai_response(message)
```

## Data Model Insight

### Why `Room.aiHistory` exists

It is faster and smaller for prompt assembly than rebuilding context from the full room transcript every time.

### Why `Message` still exists

The product needs a complete room transcript for:

1. display
2. exports
3. pinned messages
4. reactions
5. edits and deletes
6. moderation

## AI Guardrails

1. socket auth is required
2. user must join the room
3. flood control prevents spam
4. quota limits AI usage
5. attachment validation blocks malformed file metadata
6. error replies still create an AI-style fallback room message

## Failure Scenarios

1. provider failure -> an error AI message is still persisted so the conversation remains understandable
2. user is not in room -> request is rejected
3. quota exhausted -> request is rejected before model call
4. insight or memory lookup fails indirectly -> the whole AI path can still fail safely and emit an error

## Important Trade-Offs

### Strength

The feature feels fast and collaborative because it uses socket events and room-wide broadcasts.

### Complexity

It writes AI state in both `Room` and `Message`.

If one write succeeds and the other fails, the system can drift.

### Scaling

Room AI history trimming is a useful protection against prompt growth.

Without it, room prompts would become too large and expensive.

## Architecture Diagram

```text
[Socket Client]
   |
   v
[socketAuthMiddleware]
   |
   v
[index.js trigger_ai handler]
   |
   +--> [Room]
   +--> [Message]
   +--> [Memory service]
   +--> [Insight service]
   +--> [Gemini service / provider router]
   |
   v
[broadcast ai_response]
```

## Bottom Line

This feature is not just "AI in a room."

It is a realtime orchestration flow that mixes websockets, persistence, personalization, and shared room state in one operation.

## Event Contract Details

Main AI-related socket events in this feature:

1. `trigger_ai`
2. `ai_thinking`
3. `ai_response`
4. `error_message`

### `trigger_ai`

Input fields:

1. `roomId`
2. `prompt`
3. optional `modelId`
4. optional `attachment`

### `ai_thinking`

Broadcast fields:

1. `roomId`
2. `status`

Purpose:

let all clients know whether room AI is currently processing.

### `ai_response`

Broadcast payload:

the saved AI `Message`, formatted for client use.

## Why Dual Writes Matter

The feature writes to:

1. `Room.aiHistory`
2. `Message`

Why both are needed:

1. `aiHistory` is optimized for the next prompt
2. `Message` is optimized for the product UI and room transcript

Possible downside:

if one write fails after the other succeeds, state can drift.

That is one of the most important backend trade-offs in this feature.

## Room AI Prompt Shape

The group prompt usually contains:

1. recent room AI history
2. triggering user name
3. retrieved user memories
4. room insight summary
5. attachment prompt text

This is different from solo chat because the AI must answer in a shared public-chat style.

## Debugging Checklist

If room AI is failing, check:

1. whether the socket authenticated successfully
2. whether the user joined the room
3. whether `ai_thinking` is emitted but `ai_response` never arrives
4. whether quota is exhausted
5. whether the requested model is unavailable
6. whether room history trimming is behaving correctly

## Scaling Notes

Room AI is usually more operationally expensive than solo chat because:

1. it is realtime
2. it broadcasts to multiple clients
3. it updates room insight frequently
4. it stores both message and room prompt history

Current protections:

1. socket flood control
2. quota control
3. trimmed `aiHistory`
4. room membership checks

## Practical Product Insight

This feature makes the AI behave like a room participant rather than a private assistant.

That is why its backend design has to balance:

1. model quality
2. room UX
3. shared state consistency
4. prompt cost

## Extra Debugging Hint

If users say the room AI is "thinking forever," check whether:

1. `ai_thinking(status=true)` was emitted
2. an exception happened before `status=false`
3. the provider call timed out
4. the socket client missed the final event

That symptom usually points to the realtime lifecycle, not the text-generation logic alone.

## Practical Rule

Room AI should always optimize for clear shared-room behavior, not private long-form assistant behavior.

## Extra Operational Questions

### Why save an AI error message in the room

Because shared chats need a visible record that the AI request happened and failed.

### Why emit room-wide thinking state

Because the AI is a room participant, and the whole room should see its transient status.

## Closing Insight

This feature is where backend AI orchestration meets collaborative realtime product design.

## Tiny FAQ

### Is room AI the same as solo AI

No.

The shared core is similar, but the product behavior and storage pattern are different.

### Why does that matter

Because shared realtime UX needs different backend choices than private request-response chat.

## Final Mini Checklist

When validating this feature end to end:

1. authenticate socket
2. join room
3. trigger AI
4. observe thinking state
5. confirm AI message save
6. confirm broadcast delivery

That sequence covers most realtime failure points.

## Final Closing Thought

The quality of room AI depends not only on model output, but also on timing, broadcasts, and visible shared-state behavior.

That is why this feature deserves both AI and realtime-systems attention.

## Extra Closing Checklist

1. auth succeeds
2. room join succeeds
3. quota check passes
4. AI call succeeds
5. `ai_thinking` clears
6. `ai_response` arrives

That is the fastest end-to-end health check for this feature.
