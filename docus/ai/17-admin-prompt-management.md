# 17. Admin Prompt Management

## Purpose
This document explains how administrators inspect and modify prompt templates.

## Relevant Files
- `routes/admin.js`
- `services/promptCatalog.js`
- `models/PromptTemplate.js`

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/prompts` | list templates |
| `PUT` | `/api/admin/prompts/:key` | update or create template content |

## Write Path
```mermaid
sequenceDiagram
    participant Admin
    participant Route as routes/admin.js
    participant Catalog as services/promptCatalog.js
    participant Model as models/PromptTemplate.js

    Admin->>Route: PUT /api/admin/prompts/:key
    Route->>Catalog: upsertPromptTemplate(key, payload)
    Catalog->>Model: findOneAndUpdate(..., upsert: true)
```

