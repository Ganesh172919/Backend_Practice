# 18. Memory System Overview

## Purpose
This document explains why the backend has a memory layer, what kind of data it stores, and where it participates in AI flows.

## Relevant Files
- `services/memory.js`
- `routes/chat.js`
- `index.js`
- `routes/memory.js`
- `services/importExport.js`
- `models/MemoryEntry.js`

## Memory Lifecycle
```mermaid
flowchart TD
    Input["User text or imported content"] --> Extract["buildMemoryCandidates"]
    Extract --> Upsert["upsertMemoryEntries"]
    Upsert --> Store["MemoryEntry"]
    Query["New AI prompt"] --> Retrieve["retrieveRelevantMemories"]
    Retrieve --> Prompt["inject memory summaries into prompt"]
```

## Risks
- regex extraction can miss subtle memories
- AI extraction can hallucinate
- retrieval is lexical, not semantic

