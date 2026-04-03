# 03. Group Chat, AI In Rooms, And Frontend Loading

## Files you should know first

Backend:

- `index.js`
- `routes/rooms.js`
- `routes/groups.js`
- `services/gemini.js`
- `services/memory.js`
- `services/conversationInsights.js`
- `services/messageFormatting.js`
- `models/Room.js`
- `models/Message.js`

Frontend:

- `..\ChatSphere\frontend\src\pages\GroupChat.tsx`
- `..\ChatSphere\frontend\src\hooks\useSocket.ts`
- `..\ChatSphere\frontend\src\store\roomStore.ts`
- `..\ChatSphere\frontend\src\api\rooms.ts`

## Big difference from solo chat

Solo chat is request/response HTTP.

Group chat is mostly real-time Socket.IO.

That means group AI responses are loaded through socket events, not through one normal REST response.

## How a room loads in the frontend

Important note before this section:

- `GroupChat.tsx` in the nearby frontend includes room access and private-room UI logic
- the active backend in this folder does not currently expose every one of those room-access endpoints
- the confirmed group runtime path in this backend is `GET /api/rooms/:id` plus Socket.IO events in `index.js`

### Step 1: room access check

`GroupChat.tsx` first calls:

- `fetchRoomAccess(roomId)`

That is what the nearby frontend expects.

But in the active backend snapshot here, the confirmed room detail endpoint is:

- `GET /api/rooms/:id`

So the safest interpretation is:

- frontend code is trying to do an access pre-check first
- active backend definitely supports room detail loading with `GET /api/rooms/:id`
- access/private-room APIs appear to belong to a newer or separate contract

After access or membership is resolved, the frontend then calls:

- `fetchRoomById(roomId)`

That request hits `GET /api/rooms/:id`.

Backend response includes:

- room summary
- last 50 messages
- room insight

So initial room render is HTTP-based.

### Step 2: socket join

After the room details are loaded, frontend `useSocket()` calls:

- `join_room`

The backend then starts sending real-time events for:

- new messages
- AI responses
- typing indicators
- read receipts
- reactions
- pin/unpin
- user joined/left

## Normal group message flow

When the user sends a normal room message:

1. `GroupChat.tsx` calls `useSocket().sendMessage(roomId, content)`
2. `useSocket.ts` emits `send_message`
3. backend `index.js` validates membership and payload
4. backend saves a `Message` document
5. backend emits `receive_message`
6. frontend listens to `receive_message`
7. `roomStore.addMessageToCurrentRoom()` appends it to the room message list

So normal chat messages appear through the socket event named:

- `receive_message`

## AI in group chat

The room AI flow is special.

The frontend uses an `@ai` mention pattern:

- if message contains `@ai`, frontend sends the user message as a normal room message
- then it separately triggers room AI through `trigger_ai`

### Why it is done in two steps

This design makes the user's AI request visible inside the room as a normal message first.
Then the bot answer appears afterward as a separate AI message.

## Detailed `@ai` flow

### Frontend side

In `GroupChat.tsx`:

1. user types something like:

```text
@ai summarize today's discussion
```

2. frontend sends the visible user message through `send_message`
3. frontend checks `@ai` pattern
4. frontend strips `@ai` and creates the AI prompt
5. frontend calls:

- `triggerAi(roomId, aiPrompt, selectedModelId, attachment?)`

### Backend side

In `index.js`, `socket.on('trigger_ai', ...)` does:

1. validate prompt and attachment
2. emit `ai_thinking` with `status: true`
3. consume AI quota
4. confirm room membership
5. load relevant memories for the triggering user
6. load room insight
7. upsert new memories from the prompt
8. call `sendGroupMessage(...)`
9. append both user prompt and model answer to `room.aiHistory`
10. save AI answer as a `Message` document with `isAI: true`
11. mark used memories
12. refresh room insight
13. emit `ai_thinking` with `status: false`
14. emit `ai_response`

## How room AI response loads in the frontend

The important events are:

- `ai_thinking`
- `ai_response`

### Thinking state

Frontend `GroupChat.tsx` listens for:

```ts
socket.on('ai_thinking', handleAiThinking)
```

That updates `roomStore.aiThinking`.

So the UI can show a loader or AI typing indicator before the real answer arrives.

### Final response

Frontend listens for:

```ts
socket.on('ai_response', handleAiResponse)
```

`handleAiResponse` calls:

- `addMessageToCurrentRoom(message)`

So the final bot answer is appended as a regular room message object.

Unlike solo chat, there is no local "Thinking..." assistant placeholder inserted into the chat list.
Instead, room AI uses a separate boolean thinking state and waits for the server event.

## AI history in rooms

`models/Room.js` stores `aiHistory`.

This is not the same as full room messages.
It is a compact AI conversation history used for future bot calls.

The room keeps:

- initial prompt seed from `buildInitialRoomHistory(room.name)`
- user AI requests
- model responses

When history gets too long, `index.js` trims it to keep the initial seed plus the newest window.

This gives continuity for room AI without sending the entire room archive every time.

## What data is stored on AI room messages

Saved AI `Message` documents include:

- `roomId`
- `userId: "ai"`
- `username: AI bot name`
- `content`
- `isAI: true`
- `triggeredBy`
- `modelId`
- `provider`
- `memoryRefs`

That means your UI can later show:

- who triggered the AI
- which model answered
- which memories were used

## Real example

### User writes in room

```text
@ai list the decisions made today
```

### What users see

1. the human message appears in the room through `receive_message`
2. room shows AI thinking state through `ai_thinking`
3. AI answer appears through `ai_response`

### What backend stores

- user message as normal `Message`
- AI answer as `Message` with `isAI: true`
- room insight refreshed
- prompt added into `room.aiHistory`

## Group chat response object shape

The frontend `GroupMessage` type expects fields like:

- `id`
- `userId`
- `username`
- `content`
- `timestamp`
- `reactions`
- `replyTo`
- `isAI`
- `triggeredBy`
- `status`
- `isPinned`
- `isEdited`
- attachment fields
- `memoryRefs`
- `modelId`
- `provider`

That shape comes from backend `formatMessage()` in `services/messageFormatting.js`.

## Important limitation

Group AI also uses retrieval-based personalization, but only for the triggering user.

The group prompt template explicitly says:

- use retrieved memory only about the triggering user

So room AI is personalized, but it is not a shared long-term memory of the whole room.
