# 05. Socket AI Overview

## Purpose
This document explains how room AI works over Socket.IO, which events matter, and how state, storage, and broadcasts interact.

## Main Event
The AI room interaction is centered on:

- `trigger_ai`

The response side uses:

- `ai_thinking`
- `ai_response`
- `error_message`

## High-Level Event Flow
```mermaid
sequenceDiagram
    participant Caller as Triggering user
    participant Socket as Socket.IO handler
    participant Room as Room document
    participant Memory as Memory service
    participant Insight as Insight service
    participant AI as services/gemini.js
    participant Msg as Message collection
    participant Members as Room members

    Caller->>Socket: trigger_ai(roomId, prompt, modelId, attachment)
    Socket->>Members: ai_thinking(status=true)
    Socket->>Room: load room + membership check
    Socket->>Memory: retrieveRelevantMemories()
    Socket->>Insight: getRoomInsight()
    Socket->>Memory: upsertMemoryEntries()
    Socket->>AI: sendGroupMessage()
    AI-->>Socket: response
    Socket->>Room: append aiHistory + save
    Socket->>Msg: create AI Message
    Socket->>Memory: markMemoriesUsed()
    Socket->>Insight: refreshRoomInsight()
    Socket->>Members: ai_thinking(status=false)
    Socket->>Members: ai_response(message)
```

## Where Data Is Stored
The room AI flow writes to three separate persistence layers:

1. `Room.aiHistory`
2. `Message`
3. `ConversationInsight` for room scope

It may also update:

4. `MemoryEntry`

## Risks
- no transaction across room save and message save
- quota and room state are instance-local
- synchronous provider latency blocks the socket handler
- insight refresh happens inline, increasing end-to-end latency

## Rebuild Guidance
If rebuilding, keep the event model but consider:

- dedicated socket controller module
- shared orchestration service with REST chat
- queue-backed long-running AI work
- Redis-backed room presence, flood control, and quota

