# 04. Memory, Import, Export, And Portability

## Files you should know first

- `services/memory.js`
- `services/importExport.js`
- `routes/memory.js`
- `routes/export.js`
- `models/MemoryEntry.js`
- `models/ImportSession.js`
- `models/Conversation.js`
- `models/ConversationInsight.js`

## What memory means in this project

Memory is long-lived user context used to personalize future AI responses.

Examples:

- user's name
- preferences
- job/company
- favorite tools
- stable project facts

Memory is stored per user in `MemoryEntry`.

## Memory extraction pipeline

### Source 1: deterministic extraction

`services/memory.js -> extractDeterministicMemories(text)`

This uses regex patterns like:

- `my name is ...`
- `i live in ...`
- `i work at ...`
- `my favorite X is ...`
- `i like/love/prefer ...`

### Source 2: AI extraction

`extractAiMemories(text)` asks a model to return JSON with an `items` array containing:

- `summary`
- `details`
- `confidenceScore`
- `importanceScore`
- `tags`

If AI extraction fails, the code falls back to deterministic extraction only.

### Merge step

`buildMemoryCandidates(text)` combines deterministic and AI candidates, then normalizes:

- summary
- details
- tags
- confidence score
- importance score

## Memory deduplication

Each memory entry gets a fingerprint:

- SHA-1 of normalized summary

If the same fact already exists:

- summary/details are refreshed
- tags are merged
- stronger confidence/importance are kept
- recency resets to fresh

So the system does not keep endless duplicates of the same stable fact.

## Memory scoring for retrieval

When the user sends a new prompt, `retrieveRelevantMemories(...)`:

1. loads up to 100 recent memory rows
2. tokenizes the current query
3. computes score for each memory
4. keeps memories above threshold or pinned memories
5. returns top results

Scoring formula uses:

- text overlap
- importance score
- confidence score
- recency
- usage count
- pinned bonus

This is why memory is relevant but not semantic.

## How memories affect personalized response

In solo chat and room AI:

- backend retrieves memory before model call
- memory summaries are injected into prompt text
- used memories are marked with usage count and last used time

This creates a loop:

1. user says useful fact
2. fact becomes memory
3. later prompt retrieves relevant memory
4. model answer becomes more personalized

## Memory CRUD API

### List memory

`GET /api/memory`

Supports:

- text search through local substring filtering
- pinned-only filter
- limit

### Update memory

`PUT /api/memory/:id`

Allows editing:

- `summary`
- `details`
- `tags`
- `pinned`
- `confidenceScore`
- `importanceScore`

### Delete memory

`DELETE /api/memory/:id`

## Import flow

### Supported import styles

`services/importExport.js` can detect and parse:

- ChatGPT JSON-like exports
- Claude JSON or `Human:` / `Assistant:` text
- generic markdown
- plain text fallback

### Preview mode

`POST /api/memory/import` with `mode = "preview"`

Returns:

- detected source type
- conversations preview
- candidate memories
- parsing errors

### Import mode

`POST /api/memory/import` with `mode = "import"`

What happens:

1. entire content gets a fingerprint
2. existing imported session may be reused
3. conversations are parsed
4. each conversation gets its own fingerprint
5. duplicates are skipped
6. new `Conversation` rows are created
7. memories are extracted from user turns
8. conversation insight is generated
9. `ImportSession` is updated

## Export flow

There are two related APIs:

- `GET /api/memory/export`
- `GET /api/export/conversations`

Both use `exportUserBundle(...)`.

### Export formats

#### `normalized`

Full JSON:

- all conversations
- all insights
- all memories

#### `markdown`

Human-readable export:

- memory summaries
- conversation titles
- optional insight summary
- all messages

#### `adapter`

Portable structure for other AI systems:

- memory summaries and tags
- conversations
- messages
- attached insight per conversation

This is the format most aligned with your requirement:

"user can download user memories to other AI models"

## Important limitations

- memory extraction is not guaranteed correct
- there is no extra encryption layer for memory content
- `adapter` export includes conversations too, not only memory
- imported text can generate memory automatically

