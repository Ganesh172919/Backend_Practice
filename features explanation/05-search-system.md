# 05. Search System

## Short answer first

The active search system is not semantic search.

It is:

- MongoDB text search for room messages
- regex search for solo conversations

There is no embedding generation, vector index, cosine similarity, ANN search, or RAG-style semantic retriever in the running backend.

## Files you should know

Backend:

- `routes/search.js`
- `models/Message.js`
- `models/Conversation.js`
- `helpers/validate.js`

Frontend:

- `..\ChatSphere\frontend\src\pages\SearchPage.tsx`
- `..\ChatSphere\frontend\src\api\search.ts`

## Message search

### Route

`GET /api/search/messages`

### How it works

Backend flow in `routes/search.js`:

1. require search query `q`
2. load rooms the current user belongs to
3. optionally validate room filter
4. build Mongo filter using:
   - `$text: { $search: searchQuery }`
   - `roomId` membership restriction
   - `isDeleted != true`
5. apply optional filters:
   - `userId`
   - `isAI`
   - `isPinned`
   - `hasFile`
   - `fileType`
   - date range
6. exclude blocked users
7. sort by Mongo text score, then by newest first
8. return paginated results

### Why this is not semantic

Mongo `$text` search uses text index matching, not meaning-based vector similarity.

If the user searches `car`, the system does not truly understand `vehicle` or `automobile` unless those words also appear in indexed text.

## Conversation search

### Route

`GET /api/search/conversations`

### How it works

This search is simpler than message search.

It builds:

- `safeRegex = new RegExp(escapedQuery, 'i')`

Then it searches only the user's conversations with:

- title regex match
- `messages.content` regex match

Returned snippets are built from matching messages only.

## Search indexes

The important index is in `models/Message.js`:

```js
messageSchema.index({ content: 'text', username: 'text' });
```

That is what powers room message search.

`Conversation.js` does not define a text index for message content in the active backend.

## Search filters supported

Message search supports:

- query text
- room filter
- user filter
- start/end date
- AI-only
- pinned-only
- attachment-only
- specific file type
- page and limit

Conversation search supports:

- query text
- page
- limit

## Frontend search flow

`SearchPage.tsx` sends both searches in parallel:

1. `searchMessages(...)`
2. `searchConversations(...)`

So one search screen shows:

- room message matches
- solo conversation matches

## Strengths of current search

- simple to understand
- access control is enforced
- blocked users are filtered
- useful filters for message search

## Weaknesses of current search

- not semantic
- conversation search is regex-based
- no ranking by meaning
- no typo tolerance layer
- no synonym expansion
- no embeddings for memory or conversation retrieval

## If someone asks you in a meeting

Use this answer:

"The current search is traditional search, not semantic search. Room message search uses Mongo text index, and solo conversation search uses regex over titles and stored messages."

