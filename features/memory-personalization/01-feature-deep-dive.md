# Memory Personalization
# Feature Deep Dive

Primary source files:

1. `models/MemoryEntry.js`
2. `services/memory.js`
3. `routes/memory.js`
4. `services/importExport.js`
5. `models/ImportSession.js`
6. `routes/export.js`

## What This Feature Does

This feature gives the AI long-term memory about each user.

Instead of treating every request as brand new, the backend can remember stable user facts and preferences.

Examples:

1. user's name
2. where the user lives
3. workplace
4. preferences
5. repeated goals

## Why This Feature Exists

Without memory, every AI reply is stateless.

With memory, the system can:

1. personalize responses
2. avoid asking the same thing repeatedly
3. carry user context across different chats
4. import external chat history and preserve useful facts

## Core Model

`models/MemoryEntry.js` stores:

1. `userId`
2. `summary`
3. `details`
4. `tags`
5. `fingerprint`
6. source pointers
7. confidence score
8. importance score
9. recency score
10. pin state
11. usage count
12. timestamps

The most important index is:

```js
{ userId: 1, fingerprint: 1 }
```

This prevents the same memory from being stored repeatedly for one user.

## Extraction Strategy

`services/memory.js` uses two extraction paths.

### 1. Deterministic extraction

Regex rules catch obvious stable facts such as:

1. "my name is ..."
2. "I live in ..."
3. "I work at ..."
4. "my favorite ... is ..."
5. "I like ..."

Why this path is useful:

1. fast
2. cheap
3. predictable
4. works even if AI extraction fails

### 2. AI extraction

`extractAiMemories()` asks the model to return structured JSON with stable memory items.

Why this path exists:

Regex can only catch obvious patterns.

AI extraction can catch more natural language facts.

## Retrieval Strategy

`retrieveRelevantMemories()` loads recent memory candidates, then scores each one.

Scoring uses:

1. text overlap with the query
2. importance score
3. confidence score
4. recency
5. usage count
6. pinned bonus

This is a practical ranking formula.

It is not full vector search, but it is strong enough for many personal-chat use cases.

## Upsert Strategy

`upsertMemoryEntries()` prevents duplicates by building a SHA-1 fingerprint from normalized memory summary text.

If the memory already exists:

1. stronger confidence wins
2. stronger importance wins
3. tags are merged
4. recency is refreshed
5. source pointers are updated when missing

If it does not exist:

1. a new memory entry is created

## Routes

### `GET /api/memory`

Lists a user's stored memories with optional search and pin filtering.

### `PUT /api/memory/:id`

Lets the user manually fix or pin memory entries.

### `DELETE /api/memory/:id`

Deletes one memory entry.

### `POST /api/memory/import`

Supports preview and import modes for external chat history.

### `GET /api/memory/export`

Exports user data in:

1. normalized JSON
2. markdown
3. adapter format

## Import Pipeline

`services/importExport.js` supports several input styles:

1. ChatGPT JSON
2. Claude exports
3. markdown-like conversation text
4. generic text

Import flow:

```text
raw file/text
   ->
detect format
   ->
preview conversations
   ->
create ImportSession
   ->
create Conversation records
   ->
extract and upsert memories
   ->
refresh insights
   ->
save imported ids
```

`ImportSession` exists so imports are observable and duplicate-safe.

## Export Pipeline

`exportUserBundle()` collects:

1. conversations
2. insights
3. memories

Then it formats them as:

1. normalized JSON
2. markdown
3. generic adapter output

`routes/export.js` adds download-friendly endpoints for conversations and room transcripts.

## Real Example

User says:

`My name is Ravi and I prefer concise answers.`

Memory flow:

1. deterministic extractor finds name and preference pattern
2. AI extractor may also produce a structured preference memory
3. fingerprints are built
4. entries are upserted
5. future requests can retrieve these memories and inject them into prompts

Later user asks:

`Can you explain this quickly?`

The retrieval system may return:

1. "The user says their name is Ravi."
2. "The user prefers concise answers."

That improves the next AI reply.

## Query Explanation

### Retrieve candidates

```js
MemoryEntry.find({ userId }).sort({ pinned: -1, updatedAt: -1 }).limit(100).lean()
```

Purpose:

get the best recent pool for scoring.

### Update usage

```js
MemoryEntry.updateMany(
  { _id: { $in: ids } },
  { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
)
```

Purpose:

track which memories are actually influencing AI responses.

## AI-Specific Risks

1. AI memory extraction can hallucinate facts
2. stored memories can become stale
3. overly broad retrieval can inject irrelevant details
4. imported content can create noisy memory entries

Existing protections:

1. deterministic fallback
2. stable-fact prompt instructions
3. manual editing routes
4. pin and delete support
5. score thresholds

## Scaling And Alternatives

Current approach:

lexical scoring plus metadata scores.

Possible future upgrade:

embedding search or hybrid retrieval.

Trade-off:

the current design is cheaper, easier to reason about, and easier to debug.

## Architecture Diagram

```text
[User text]
   |
   v
[memory extraction]
   |
   +--> deterministic rules
   +--> AI JSON extraction
   |
   v
[MemoryEntry upsert]
   |
   v
[future AI request]
   |
   v
[retrieveRelevantMemories]
   |
   v
[prompt context]
```

## Bottom Line

This feature is the personalization layer of the backend.

It turns past user information into reusable AI context while still giving the user control over what is kept.

## Memory Scoring Example

Imagine the user asks:

`Can you keep this explanation short?`

Assume the system has three memories:

1. "The user prefers concise answers."
2. "The user lives in Chennai."
3. "The user works at Example Corp."

The first memory will likely score highest because:

1. the query overlaps with preference language
2. it is highly relevant to reply style
3. it may have been used successfully before

The other memories may remain below the response threshold unless pinned.

## Why Fingerprints Matter

The fingerprint is built from normalized summary text.

This solves a common AI-memory problem:

the same fact can be extracted multiple times from different chats.

Without fingerprints:

1. memory storage would bloat
2. retrieval would become noisy
3. users would see repeated nearly identical entries

## Manual Control Is Important

A good memory system should not be fully automatic.

This backend already supports:

1. listing memories
2. editing memories
3. deleting memories
4. pinning memories

That is important because AI-generated memories can be wrong, stale, or too personal.

## Privacy Considerations

This feature stores durable user facts.

That means teams should think carefully about:

1. consent
2. deletion requests
3. export support
4. internal access controls
5. retention policies

The current backend already supports export and deletion at the feature level, which is a strong starting point.

## Import Preview Benefits

The preview step is not just a convenience.

It is a safety layer.

It lets the user see:

1. detected format
2. parsed conversations
3. candidate memories
4. parse errors

before permanent import happens.

That reduces accidental bad imports.

## Debugging Checklist

If memory quality feels weak, inspect:

1. whether deterministic patterns are too narrow
2. whether AI extraction is failing silently
3. whether fingerprints are merging things too aggressively
4. whether scoring thresholds are filtering too much
5. whether old memories are dominating because of pinning

## Scale Notes

Current retrieval uses lexical overlap and metadata.

That is easier to debug than embeddings, but at very large scale you may want:

1. vector similarity
2. hybrid lexical plus vector search
3. decay rules for stale memories
4. category-specific memory retrieval

## Practical Design Strength

The best part of this feature is not just that it remembers things.

It remembers things in a way that is:

1. inspectable
2. editable
3. exportable
4. partially deterministic

That makes it much safer and easier to maintain than a black-box memory layer.

## Extra Examples Of Good Memory Candidates

Good memory examples:

1. "The user prefers concise answers."
2. "The user works in finance."
3. "The user is preparing for a product launch."
4. "The user likes step-by-step explanations."

Bad memory examples:

1. "The user asked a temporary question."
2. "The user said hello."
3. "The user requested a one-time rewrite."

Why this distinction matters:

the memory layer should keep durable context, not every temporary chat action.

## Operational Summary

This feature works best when it behaves like a careful notebook, not an indiscriminate recorder.

## Extra Maintenance Notes

Teams maintaining this feature should periodically review:

1. whether stored memories are too noisy
2. whether users need easier cleanup tools
3. whether important memories are being missed
4. whether imported memory quality matches native memory quality

## Quick Rule Of Thumb

If a fact would still matter in a future conversation, it is a better candidate for memory.
