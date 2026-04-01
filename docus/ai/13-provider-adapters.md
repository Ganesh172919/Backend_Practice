# 13. Provider Adapters

## Purpose
This document explains how each AI provider is called from `services/gemini.js`.

## Relevant Files
- `services/gemini.js`

## Provider Functions
- `runOpenRouterRequest`
- `runGrokRequest`
- `runHuggingFaceRequest`
- `runTogetherRequest`
- `runGroqDirectRequest`
- `runGeminiRequest`

## Adapter Pattern
```mermaid
flowchart TD
    Exec["executeModelRequest(model, ...)"] --> Provider{"model.provider"}
    Provider -- openrouter --> O["runOpenRouterRequest"]
    Provider -- grok --> X["runGrokRequest"]
    Provider -- groq --> G["runGroqDirectRequest"]
    Provider -- together --> T["runTogetherRequest"]
    Provider -- huggingface --> H["runHuggingFaceRequest"]
    Provider -- gemini --> M["runGeminiRequest"]
```

