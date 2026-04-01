# 32. Sequence And Architecture Diagrams

## Purpose

This document collects the highest-value architecture diagrams in one place.

## Solo Chat Sequence

```mermaid
sequenceDiagram
  participant C as Client
  participant R as /api/chat
  participant M as Memory
  participant I as Insight
  participant G as Gemini service
  participant DB as MongoDB

  C->>R: POST /api/chat
  R->>M: retrieveRelevantMemories
  R->>I: getConversationInsight
  R->>G: sendMessage
  G-->>R: AI result
  R->>DB: save Conversation
  R->>M: upsertMemoryEntries + markMemoriesUsed
  R->>I: refreshConversationInsight
  R-->>C: response
```

## Room AI Sequence

```mermaid
sequenceDiagram
  participant U as User socket
  participant S as trigger_ai
  participant Q as AI quota
  participant M as Memory
  participant I as Room insight
  participant G as sendGroupMessage
  participant DB as MongoDB
  participant Peers as Room peers

  U->>S: trigger_ai
  S->>Peers: ai_thinking(true)
  S->>Q: consumeAiQuota
  S->>M: retrieveRelevantMemories
  S->>I: getRoomInsight
  S->>G: sendGroupMessage
  G-->>S: AI result
  S->>DB: save Room.aiHistory
  S->>DB: save Message
  S->>M: markMemoriesUsed
  S->>I: refreshRoomInsight
  S->>Peers: ai_thinking(false)
  S->>Peers: ai_response
```

## Data Relationship Diagram

```mermaid
erDiagram
  USER ||--o{ CONVERSATION : owns
  USER ||--o{ MEMORY_ENTRY : owns
  USER ||--o{ PROJECT : owns
  CONVERSATION ||--o| CONVERSATION_INSIGHT : summarizes
  ROOM ||--o{ MESSAGE : contains
  ROOM ||--o| CONVERSATION_INSIGHT : summarizes
  PROJECT ||--o{ CONVERSATION : links
```

## Prompt Construction Diagram

```mermaid
flowchart TD
  History["serializeHistory"] --> Prompt["buildPrompt"]
  Memory["buildMemoryContext"] --> Prompt
  Insight["buildInsightContext"] --> Prompt
  Attachment["buildAttachmentPayload.promptText"] --> Prompt
  Project["buildProjectContext"] --> Prompt
  Current["current request"] --> Prompt
```

## Rebuild Notes

1. keep diagrams close to code ownership boundaries
2. version diagrams when storage semantics change
3. prefer one diagram per real runtime path over generic “AI platform” drawings

