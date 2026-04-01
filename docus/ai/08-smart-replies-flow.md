# 08. Smart Replies Flow

## Purpose
This document explains the `/api/ai/smart-replies` helper feature.

## Relevant Files
- `routes/ai.js`
- `services/gemini.js`
- `services/promptCatalog.js`
- `models/User.js`

## Execution Logic
1. load user AI settings
2. reject if `smartReplies` is disabled
3. normalize the last six messages into a compact transcript
4. load prompt template `smart-replies`
5. call `getJsonFromModel(...)`
6. if parsing fails, use deterministic fallback replies
7. normalize to exactly three strings

## Flow Diagram
```mermaid
flowchart TD
    Req["POST /api/ai/smart-replies"] --> Settings["Load user settings"]
    Settings --> Gate{"smartReplies enabled?"}
    Gate -- no --> Forbidden["403"]
    Gate -- yes --> Prompt["Build recentMessages transcript"]
    Prompt --> Template["Load prompt template"]
    Template --> Model["getJsonFromModel"]
    Model --> Normalize["trim, filter, slice 3"]
```

