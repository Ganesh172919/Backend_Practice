# 01. Runtime Map

## Goal of this document

Before understanding features, you need to know which code is actually running.

This project has two backend shapes:

- the active root Node/Express/Mongoose app
- a `dist/` build from a different service-oriented structure

The active runtime is the root app because `package.json` uses:

- `node index.js`

That means these are the main runtime files:

- `index.js`
- `routes/chat.js`
- `routes/conversations.js`
- `routes/search.js`
- `routes/memory.js`
- `routes/export.js`
- `routes/ai.js`
- `services/gemini.js`
- `services/memory.js`
- `services/importExport.js`
- `services/conversationInsights.js`
- `services/promptCatalog.js`
- `services/messageFormatting.js`
- `models/Conversation.js`
- `models/Message.js`
- `models/MemoryEntry.js`
- `models/ConversationInsight.js`
- `models/Room.js`
- `models/User.js`

## Main architecture

### REST API

`index.js` mounts the main HTTP routes:

- `/api/chat` for solo AI chat
- `/api/conversations` for saved solo chat history
- `/api/search` for room message and solo conversation search
- `/api/memory` for memory CRUD, import, export
- `/api/export` for conversation/room export
- `/api/ai` for model listing and helper AI features
- `/api/rooms` for room detail and room insight loading

### Socket.IO

`index.js` also handles real-time group chat:

- `join_room`
- `leave_room`
- `send_message`
- `reply_message`
- `trigger_ai`
- `typing_start`
- `typing_stop`
- `mark_read`
- `add_reaction`
- `edit_message`
- `delete_message`
- `pin_message`
- `unpin_message`

### Data models

There are two different chat-storage patterns:

- solo chat uses `Conversation`
- group chat uses `Room` + `Message`

That difference is important:

- solo chat keeps the whole thread inside one `Conversation.messages` array
- group chat stores each room message as its own `Message` document

## Why this matters for your contribution

Your contribution areas touch almost every layer:

- frontend page or hook sends request
- route validates and gathers context
- service builds prompt and routes to model
- database saves conversation/message/memory/insight
- frontend store updates UI from response or socket event

So when you debug a feature, do not only read one file. Read one vertical slice:

1. frontend caller
2. backend route
3. backend service
4. model/schema
5. frontend state update

## Matching frontend used for explanation

To explain response loading, these frontend files were also traced:

- `..\ChatSphere\frontend\src\pages\SoloChat.tsx`
- `..\ChatSphere\frontend\src\hooks\useChat.ts`
- `..\ChatSphere\frontend\src\store\chatStore.ts`
- `..\ChatSphere\frontend\src\pages\GroupChat.tsx`
- `..\ChatSphere\frontend\src\hooks\useSocket.ts`
- `..\ChatSphere\frontend\src\store\roomStore.ts`
- `..\ChatSphere\frontend\src\pages\SearchPage.tsx`
- `..\ChatSphere\frontend\src\api\chat.ts`
- `..\ChatSphere\frontend\src\api\rooms.ts`
- `..\ChatSphere\frontend\src\api\search.ts`
- `..\ChatSphere\frontend\src\api\ai.ts`

## Important frontend-backend mismatch

The nearby frontend is useful for understanding UI loading flow, but it is not perfectly aligned with the active backend snapshot in this folder.

The clearest example is group room access:

- frontend calls routes like `/rooms/:id/access` and `/rooms/:id/private-key`
- the active root backend here does not implement those routes
- the active root `Room` model also does not store `visibility`

So for group chat, trust these parts as confirmed runtime behavior:

- `GET /api/rooms/:id`
- Socket.IO room events in `index.js`
- room AI flow through `trigger_ai`

Treat private-room access/loading code in the nearby frontend as a newer or separate contract, not as guaranteed active backend behavior in this folder.

## Mental model you should keep

Use this shortcut when reading the system:

- solo AI chat = HTTP request/response + optimistic frontend placeholder
- group AI chat = socket events + room message persistence + AI thinking state
- memory = extracted facts saved per user and re-injected into later prompts
- personalization = retrieved memory + conversation insight + optional project context
- search = Mongo text/regex search, not semantic search
- provider switching = frontend chooses model ID, backend resolves provider from that model
