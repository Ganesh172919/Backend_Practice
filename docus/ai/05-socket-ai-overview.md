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

    Caller->>Socket: trigger_ai(roomId, prompt, modelId, attachment)
    Socket->>Room: load room + membership check
    Socket->>Memory: retrieveRelevantMemories()
    Socket->>Insight: getRoomInsight()
    Socket->>Memory: upsertMemoryEntries()
    Socket->>AI: sendGroupMessage()
    AI-->>Socket: response
    Socket->>Room: append aiHistory + save
    Socket->>Msg: create AI Message
    Socket->>Insight: refreshRoomInsight()
```

## Risks
- no transaction across room save and message save
- quota and room state are instance-local
- synchronous provider latency blocks the socket handler

