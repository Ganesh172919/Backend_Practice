# 35. Caching And State Analysis

## Purpose

This document describes the actual caching and in-memory state present in the live source, plus what is missing.

## Existing Caches And State

| State | Location | Persistence |
| --- | --- | --- |
| model catalog | `runtimeModelCatalog` in `services/gemini.js` | process memory only |
| AI quota | `quotaMap` in `services/aiQuota.js` | process memory only |
| room user map | `roomUsers` in `index.js` | process memory only |
| global online users | `globalOnlineUsers` in `index.js` | process memory only |
| typing map | `typingUsers` in `index.js` | process memory only |
| socket flood state | `socketFlood` in `index.js` | process memory only |

## What Is Not Cached

- prompt templates in source are not cached; each lookup can hit MongoDB
- memories are not cached across requests
- insights are cached only by being stored in MongoDB, not in process memory
- uploaded attachment content is read from disk on demand

## Why This Matters

- process restarts clear quotas and presence immediately
- multi-instance deployments see divergent state
- repeated prompt-template reads cost DB queries
- catalog state can differ between instances depending on refresh timing

## Missing Layers

Useful but absent today:

- shared distributed quota store
- shared socket presence/state store
- prompt-template cache with invalidation
- optional memory retrieval cache for hot users
- background queue for insight refreshes

## Rebuild Notes

1. decide which state must be globally consistent
2. keep only ephemeral UX state in process memory
3. push correctness-sensitive state into shared infrastructure

