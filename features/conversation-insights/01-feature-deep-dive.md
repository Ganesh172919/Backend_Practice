# Conversation Insights
# Feature Deep Dive

Primary source files:

1. `models/ConversationInsight.js`
2. `services/conversationInsights.js`
3. `routes/conversations.js`
4. `routes/rooms.js`

## What This Feature Does

This feature converts long chat histories into compact structured summaries.

Supported scopes:

1. solo conversations
2. rooms

Each insight can contain:

1. title
2. summary
3. intent
4. topics
5. decisions
6. action items

## Why This Feature Exists

Long chat history is expensive to reread and hard for users to scan.

Insight records solve that by storing a smaller structured version of the conversation.

That helps with:

1. quick review
2. task extraction
3. decision extraction
4. prompt compression
5. analytics

## Data Model

`models/ConversationInsight.js` stores:

1. `scopeKey`
2. `scopeType`
3. `scopeId`
4. optional `userId`
5. optional `conversationId`
6. optional `roomId`
7. summary fields
8. `messageCount`
9. `lastGeneratedAt`
10. `promptVersion`

The most important field is `scopeKey`.

It uniquely identifies one insight record per conversation or room.

## Insight Generation Flow

`generateInsightPayload()` in `services/conversationInsights.js`:

1. takes the most recent messages
2. serializes them into a speaker/content transcript
3. builds a JSON-only prompt
4. calls `getJsonFromModel()`
5. clamps field lengths
6. falls back deterministically if provider output fails

## Deterministic Fallback

If the AI call fails, the service still returns a basic insight.

Fallback behavior:

1. title uses fallback title
2. summary uses first 320 chars of combined text
3. intent becomes simple question-answering or discussion
4. topics are extracted from normalized words

This is a very useful resilience pattern.

It means the insight feature does not disappear just because a provider is temporarily down.

## Save Strategy

`saveInsight()` performs an upsert:

```js
ConversationInsight.findOneAndUpdate(
  { scopeKey },
  { $set: ... },
  { new: true, upsert: true }
)
```

Why this is good:

1. one stable record per scope
2. repeat refreshes do not create duplicates
3. latest insight replaces stale insight

## Solo Conversation Endpoints

In `routes/conversations.js`:

1. `GET /api/conversations/:id/insights`
2. `POST /api/conversations/:id/actions/:action`

Supported actions:

1. `summarize`
2. `extract-tasks`
3. `extract-decisions`

## Room Endpoints

In `routes/rooms.js`:

1. `GET /api/rooms/:id/insights`
2. `POST /api/rooms/:id/actions/:action`

These mirror the solo feature but use room scope.

## Real Example

If a long conversation contains:

1. discussion of project goals
2. a decision to ship on Friday
3. action items for two teammates

The stored insight may look like:

```json
{
  "title": "Launch planning",
  "summary": "The team reviewed launch readiness and agreed to ship on Friday.",
  "intent": "planning",
  "topics": ["launch", "testing", "release"],
  "decisions": ["Ship on Friday after final QA."],
  "actionItems": [
    { "text": "Finish QA checklist", "owner": "Alex", "done": false },
    { "text": "Prepare release notes", "owner": "Ravi", "done": false }
  ]
}
```

## AI Prompt Strategy

The prompt is intentionally structured:

1. JSON only
2. explicit schema
3. recent message window only
4. concise topics and actions

Why:

1. easier parsing
2. smaller cost
3. more stable frontend contracts

## Query Explanation

### Get cached insight

```js
ConversationInsight.findOne({ scopeKey }).lean()
```

Purpose:

reuse already-generated insight when available.

### Load source conversation

```js
Conversation.findOne({ _id: conversationId, userId }).lean()
```

Purpose:

load the transcript and enforce ownership.

### Load room messages

```js
Message.find({ roomId }).sort({ createdAt: -1 }).limit(40).lean()
```

Purpose:

generate a recent room summary without reading the entire room history.

## Risks And Edge Cases

1. AI can miss important decisions
2. stale insight can diverge from latest messages
3. very long rooms may lose older decisions because only recent messages are read
4. over-compression can hide nuance

Current protections:

1. refresh endpoints
2. deterministic fallback
3. field length limits
4. recent-history window for cost control

## Architecture Diagram

```text
[Conversation or Room transcript]
   |
   v
[services/conversationInsights.js]
   |
   +--> build JSON prompt
   +--> call getJsonFromModel
   +--> clamp and normalize output
   +--> upsert ConversationInsight
   |
   v
[REST insight endpoints]
```

## Why This Design Works

The feature turns messy chat logs into a reusable structured layer.

That helps both humans and the AI system itself, because summaries can be reused as context instead of rereading huge histories.

## Insight Field Semantics

### `title`

Short label for the conversation or room summary.

Useful for:

1. UI cards
2. exported summaries
3. quick browsing

### `summary`

Human-readable compressed explanation of what happened.

Useful for:

1. fast review
2. prompt injection as compressed context
3. handoff between users

### `intent`

High-level category such as planning, discussion, question-answering, or review.

Useful for:

1. routing future actions
2. analytics
3. UI grouping

### `topics`

Short subject tags extracted from the conversation.

Useful for:

1. filtering
2. display chips
3. quick context loading

### `decisions`

Statements of what was decided.

Useful for:

1. project history
2. audits
3. avoiding repeated debates

### `actionItems`

Structured tasks with optional owners.

Useful for:

1. task extraction
2. checklists
3. next-step reminders

## When Insights Are Refreshed

### In solo chat

Insight refresh usually happens after a successful AI response is saved.

### In rooms

Insight refresh can happen after:

1. AI replies
2. message edits
3. message deletes
4. some room actions

### On-demand

Clients can also explicitly call the action endpoints to regenerate summaries.

## Why Recent Windows Are Used

For room insight generation, the service reads only a recent slice of messages.

Why:

1. lower token cost
2. faster response
3. less provider load
4. more stable summaries focused on recent state

Trade-off:

older but important decisions can be missed unless preserved elsewhere.

## Debugging Checklist

If an insight looks wrong, check:

1. whether the underlying conversation or room transcript is correct
2. whether the room window was too short
3. whether a prompt template was edited recently
4. whether fallback logic ran
5. whether action items exceeded the stored field limits

## Example End-To-End Room Insight Flow

```text
messages in room
  ->
Message.find(...limit 40)
  ->
serialize to role/content form
  ->
build JSON prompt
  ->
getJsonFromModel
  ->
normalize and clamp
  ->
upsert ConversationInsight
  ->
return through room insight endpoint
```

## Design Alternatives

This feature could have been implemented with:

1. deterministic summarization only
2. summaries generated on the client
3. one plain text summary field only

The current design is stronger because it keeps structured output on the server side and makes it reusable across many clients.

## Extension Ideas

1. insight confidence score
2. historical versions of insights
3. explicit decision timestamps
4. due dates for action items
5. separate long summary and short summary fields

## Quick Mental Model

This feature is the backend's note-taker.

It reads a longer conversation and writes down the parts most likely to matter later.

That makes it useful both for user-facing summaries and for future AI context compression.

## Very Short Closing Reminder

Good insights do not replace the transcript.

They make the transcript easier to work with.
