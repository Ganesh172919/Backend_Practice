# ChatSphere Feature Explanations

This folder documents the parts of the project most relevant to your contribution area:

- solo AI chat and conversation continuity
- memory extraction, personalization, and export
- search across chats and conversations
- prompt structure, safety, and current validation gaps
- model switching and provider routing
- how the frontend loads solo and group AI responses

## Very important first note

This repository contains two backend code paths:

1. `index.js` + `routes/` + `services/` + `models/`
2. `dist/` compiled files from a newer architecture

The active runtime used by this repo is the root JavaScript app, because `package.json` runs:

```json
"start": "node index.js"
```

So this documentation is based on the root source files, not on `dist/`.

## Frontend scope used in these docs

There is no frontend source inside this backend folder, but there is a matching frontend nearby at:

- `..\ChatSphere\frontend\src`

I used that frontend too for the "how the response is loading" sections, because your question needs both backend and frontend flow.

## Recommended reading order

1. `01-runtime-map.md`
2. `02-solo-chat-personalization.md`
3. `03-group-chat-loading.md`
4. `04-memory-import-export.md`
5. `05-search-system.md`
6. `06-model-provider-routing.md`
7. `07-prompt-safety-validation.md`

## Short answer to your biggest questions

### Is search semantic search?

No.

The active backend uses:

- MongoDB text search for room messages in `routes/search.js`
- regex search for solo conversations in `routes/search.js`

There is no embedding store, vector database, semantic ranking model, or hybrid semantic retrieval in the running backend.

### Are personalized responses based on user history?

Yes, but in a lightweight retrieval-based way.

The backend:

- stores user memory in `MemoryEntry`
- retrieves relevant memories using token overlap + scoring
- optionally loads conversation insight summary
- injects both into the prompt before sending the request to the model

So personalization exists, but it is not deep semantic personalization. It is memory retrieval plus prompt injection of prior context.

### Is there strong prompt injection and hallucination validation right now?

Not really.

The current code has:

- input length/type checks
- attachment validation
- membership/auth checks
- JSON-only instructions for structured tasks
- fallback parsing and field clamping

But it does not have:

- dedicated prompt injection detection
- hallucination verification
- citation checking
- strict schema validation with hard rejection
- trust-boundary separation for imported file text vs user instructions

That is explained in detail in `07-prompt-safety-validation.md`.

