# 06. Solo Chat Flow

## Purpose
This document explains the end-to-end solo AI chat flow implemented in `routes/chat.js`.

## Relevant Files
- `routes/chat.js`
- `services/gemini.js`
- `services/memory.js`
- `services/conversationInsights.js`
- `models/Conversation.js`
- `models/Project.js`

## End-to-End Flow
```mermaid
sequenceDiagram
    participant Client
    participant Route as routes/chat.js
    participant Memory as services/memory.js
    participant Insight as services/conversationInsights.js
    participant Project as models/Project.js
    participant AI as services/gemini.js
    participant Conv as models/Conversation.js

    Client->>Route: POST /api/chat
    Route->>Route: validate message and attachment
    Route->>Memory: retrieveRelevantMemories(userId, query)
    Route->>Insight: getConversationInsight(userId, conversationId)
    Route->>Project: load project if projectId is present
    Route->>AI: sendMessage(history, message, context)
    AI-->>Route: content + model metadata
    Route->>Conv: append user and assistant messages
    Route->>Memory: upsertMemoryEntries()
    Route->>Insight: refreshConversationInsight()
    Route-->>Client: JSON response
```

## Database Writes
`POST /api/chat` performs these writes:

- `Conversation.save()`
- `upsertMemoryEntries(...)`
- `markMemoriesUsed(...)`
- `refreshConversationInsight(...)`

## Failure Cases
| Failure | Behavior |
|---|---|
| invalid attachment | `400` |
| missing message | `400` |
| project not found | `404` |
| provider unavailable | `503` |
| other error | `500` |

