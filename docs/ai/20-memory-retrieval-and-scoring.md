# 20. Memory Retrieval And Scoring

## Purpose

This document explains how memory retrieval works at query time, including tokenization, score calculation, pinned behavior, and usage signals.

## Relevant Files

- `services/memory.js`
- `models/MemoryEntry.js`

## Retrieval Flow

`retrieveRelevantMemories({ userId, query, limit })`:

1. loads up to 100 memories for the user
2. sorts by `pinned` then `updatedAt`
3. tokenizes the query
4. scores each entry
5. keeps entries with `score > 0.08` or `pinned`
6. sorts by descending score
7. returns up to `limit`

## Tokenization

Tokenization is simple:

- lowercase
- strip non-alphanumeric characters
- split on spaces
- discard tokens shorter than 3 chars

No stemming or embeddings are used.

## Score Formula

`scoreMemory()` combines:

- text overlap: `0.45`
- `importanceScore`: `0.2`
- `confidenceScore`: `0.15`
- recency: `0.1`
- usage bonus up to `0.1`
- pinned bonus of `0.15`

## Recency

`computeRecencyScore()` uses age buckets:

- <= 1 day: `1`
- <= 7 days: `0.85`
- <= 30 days: `0.65`
- <= 90 days: `0.45`
- older: `0.25`

## Pinned Behavior

Pinned memories matter in two ways:

- they receive a bonus in the score formula
- they bypass the minimum-score filter because `entry.pinned` is enough to keep them

## Usage Signals

After a memory is used in a prompt, `markMemoriesUsed()`:

- increments `usageCount`
- sets `lastUsedAt`

Future retrieval gives a small usage-based boost via `Math.min(0.1, usageCount * 0.01)`.

## Risks

- lexical overlap misses paraphrases
- older but still-true memories decay in recency score even if still relevant
- scoring is hand-tuned and untested against real relevance metrics

## Rebuild Notes

1. keep pinned bypass semantics because product users often want manual control
2. log retrieval scores to tune weighting safely
3. consider hybrid lexical + embedding retrieval only if the corpus grows substantially

