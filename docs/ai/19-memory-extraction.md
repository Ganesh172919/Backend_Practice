# 19. Memory Extraction

## Purpose

This document explains how new memory candidates are extracted from text using both deterministic rules and AI assistance.

## Relevant Files

- `services/memory.js`
- `services/importExport.js`
- `routes/chat.js`
- `index.js`

## Deterministic Extraction

`extractDeterministicMemories(text)` uses regex-based patterns such as:

- `my name is ...`
- `i live in ...`
- `i work at/for ...`
- `my favorite X is ...`
- `i like/love/prefer ...`

Each rule emits:

- `summary`
- `details`
- `tags`
- `confidenceScore`
- `importanceScore`

## AI-Assisted Extraction

`extractAiMemories(text)` sends a JSON-only prompt that asks for up to 5 stable user memories and expects:

```json
{
  "items": [
    {
      "summary": "",
      "details": "",
      "confidenceScore": 0.0,
      "importanceScore": 0.0,
      "tags": [""]
    }
  ]
}
```

If the AI call fails, extraction continues with deterministic results only.

## Candidate Build Pipeline

1. run deterministic extraction
2. try AI-assisted extraction
3. merge both lists
4. normalize tags and score ranges
5. drop summaries shorter than 6 chars

## Upsert Behavior

`upsertMemoryEntries()`:

- fingerprints each candidate by normalized summary
- updates an existing row if `(userId, fingerprint)` already exists
- otherwise creates a new `MemoryEntry`

When updating an existing row, source:

- keeps the max confidence and importance
- resets `recencyScore` to `1`
- updates `lastObservedAt`
- merges tags

## Source Attachments

Memory extraction can be triggered from:

- solo chat user message with `sourceType: 'conversation'`
- room AI prompt with `sourceType: 'room'`
- imports with `sourceType: 'import'`

## Risks

- summaries that change wording slightly can create new fingerprints instead of updating old facts
- failed room AI calls can still create memories because upsert happens before provider generation completes
- regex extraction favors English phrasing and simple declarative statements

## Rebuild Notes

1. keep deterministic rules for high-confidence personal facts
2. add conflict resolution for contradicting memories
3. consider explicit user confirmation for low-confidence AI-extracted memories

