# Memory Personalization
# File 02: Import And Export Deep Dive

Primary source files:

1. `routes/memory.js`
2. `services/importExport.js`
3. `models/ImportSession.js`
4. `models/Conversation.js`
5. `models/MemoryEntry.js`
6. `models/ConversationInsight.js`
7. `routes/export.js`

## Why This File Exists

The memory feature is not only about storing new memories from live chat.

It also supports:

1. importing existing chat history
2. previewing what import would create
3. extracting memory from imported text
4. exporting conversations, insights, and memories back out

This makes the AI system portable and reusable.

## Core Endpoints

### `POST /api/memory/import`

Modes:

1. `preview`
2. `import`

Input fields:

1. `content`
2. `filename`
3. `mode`

### `GET /api/memory/export`

Formats:

1. `normalized`
2. `markdown`
3. `adapter`

### Related export endpoints

1. `GET /api/export/conversations`
2. `GET /api/export/rooms/:roomId`
3. `GET /api/export/conversation/:id`

## Import Flow

```text
raw content
   ->
detect format
   ->
parse conversations
   ->
preview or import
   ->
create ImportSession
   ->
create Conversation rows
   ->
extract MemoryEntry rows
   ->
refresh insights
   ->
return ids and stats
```

## Format Detection

`detectAndParseImport()` uses a fallback cascade:

1. ChatGPT JSON
2. Claude
3. markdown
4. plain text

This is a practical parser strategy because external exports vary a lot.

## Preview Mode

`previewImport(content, filename)` returns:

1. detected source type
2. parsed conversation titles
3. message counts
4. preview snippets
5. candidate memories
6. parser errors

Why preview matters:

users can inspect what the backend understood before anything is permanently stored.

## Import Mode

`importConversationBundle({ userId, content, filename })` does the real write path.

For each conversation:

1. compute conversation fingerprint
2. skip duplicates if already imported
3. create `Conversation`
4. gather user-side text
5. call `upsertMemoryEntries`
6. call `refreshConversationInsight`

This means one import operation can generate:

1. conversation history
2. user memories
3. structured summaries

## Duplicate Protection

There are two fingerprint layers.

### Session fingerprint

Built from whole import content.

Purpose:

avoid importing the exact same file again.

### Conversation fingerprint

Built from normalized conversation message content.

Purpose:

avoid repeated insertion of the same conversation inside or across import sessions.

## Import Session Model

`ImportSession` stores:

1. `userId`
2. `sourceType`
3. `sourceName`
4. `fingerprint`
5. `status`
6. preview stats
7. imported conversation ids
8. imported memory ids

This gives the import feature auditability and reuse.

## Export Flow

`exportUserBundle()` loads three datasets in parallel:

1. `Conversation`
2. `ConversationInsight`
3. `MemoryEntry`

Then it formats the result into:

1. normalized JSON
2. markdown
3. adapter JSON

## Markdown Export

`buildMarkdownExport()` creates a human-readable document with:

1. memories
2. conversation titles
3. optional summary blocks
4. chat messages

This is useful for manual review and archival reading.

## Adapter Export

`buildAdapterExport()` creates a generic AI-tool-friendly structure with:

1. memories
2. conversations
3. attached insights

This is useful when another system wants a simple machine-friendly export.

## Room Export

`GET /api/export/rooms/:roomId` exports room messages, including AI replies.

The route:

1. validates room id
2. checks room membership
3. loads messages in chronological order
4. returns a structured room transcript

That is important because room AI is also part of the backend's AI surface.

## Example Import Request

```json
{
  "filename": "chatgpt-export.json",
  "mode": "preview",
  "content": "[{\"title\":\"Planning\",\"messages\":[{\"role\":\"user\",\"content\":\"My name is Ravi\"}]}]"
}
```

## Example Preview Response

```json
{
  "sourceType": "chatgpt",
  "conversations": [
    {
      "title": "Planning",
      "messageCount": 1
    }
  ],
  "candidateMemories": [
    {
      "summary": "The user says their name is Ravi."
    }
  ],
  "errors": []
}
```

## Example Import Response

```json
{
  "reused": false,
  "importSessionId": "67f900000000000000000001",
  "importedConversationIds": ["67f900000000000000000101"],
  "importedMemoryIds": ["67f900000000000000000201"]
}
```

## Example Export Response

```json
{
  "exportedAt": "2026-04-03T08:00:00.000Z",
  "format": "normalized",
  "conversations": [],
  "insights": [],
  "memories": []
}
```

## Security Notes

1. all import/export endpoints require auth
2. exports are scoped to `req.user.id`
3. room exports require room membership
4. import content is parsed as data, not executed

## Failure Scenarios

1. empty import content -> `400`
2. malformed JSON -> parser falls back or reports errors
3. duplicate import -> previously imported session is reused
4. export load issue -> `500`
5. room export by non-member -> `403`

## Debugging Checklist

If import/export seems wrong, check:

1. detected `sourceType`
2. parser branch actually used
3. `ImportSession` contents
4. duplicate fingerprints
5. generated conversation ids
6. generated memory ids
7. whether insights refreshed successfully

## Architecture Diagram

```text
[External chat history]
   |
   v
[POST /api/memory/import]
   |
   +--> detectAndParseImport
   +--> previewImport / importConversationBundle
   |         |
   |         +--> Conversation
   |         +--> MemoryEntry
   |         +--> ConversationInsight
   |         +--> ImportSession
   v
[Portable internal AI state]
```

## Final Understanding

This feature is important because it lets users bring useful history into the backend's AI system and take that data back out later.

That improves both AI quality and user trust.
