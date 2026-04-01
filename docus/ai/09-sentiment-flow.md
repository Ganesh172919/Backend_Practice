# 09. Sentiment Flow

## Purpose
This document explains the `/api/ai/sentiment` feature.

## Relevant Files
- `routes/ai.js`
- `services/gemini.js`
- `services/promptCatalog.js`
- `models/User.js`

## Execution Path
```mermaid
sequenceDiagram
    participant Client
    participant Route as routes/ai.js
    participant User as User settings
    participant Prompt as Prompt template
    participant Model as getJsonFromModel

    Client->>Route: POST /api/ai/sentiment
    Route->>User: loadAiPreferences
    Route->>Prompt: getPromptTemplate('sentiment')
    Route->>Model: getJsonFromModel(prompt, fallback)
    Model-->>Route: JSON or throw
    Route-->>Client: sentiment, confidence, emoji, model
```

## Fallback
If generation or parsing fails, the route falls back to:

- `sentiment: neutral`
- `confidence: 0.5`
- `emoji: :|`

