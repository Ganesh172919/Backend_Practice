# 12. Auto Routing and Model Selection

## Purpose
This document explains how the backend chooses a model when the caller requests `auto` or omits a model id.

## Relevant Files
- `services/gemini.js`

## Core Functions
- `estimatePromptComplexity`
- `rankModelsForTask`
- `resolveTaskModel`
- `resolveModel`

## Routing Flow
```mermaid
flowchart TD
    Input["requestedModelId + prompt context"] --> Models["getAvailableModels()"]
    Models --> Requested{"explicit model and not auto?"}
    Requested -- yes --> ReturnExplicit["use resolved explicit model"]
    Requested -- no --> Complexity["estimatePromptComplexity"]
    Complexity --> Rank["rankModelsForTask"]
    Rank --> Select["take rankedModels[0]"]
```

