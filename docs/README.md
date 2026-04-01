# ChatSphere Backend AI Docs

This documentation set explains the AI-specific backend behavior in `backend/` as it exists in the editable source tree today. The source files are the primary truth. AI-relevant `dist/` files are referenced only when they expose architectural drift, stale behavior, or implementation detail that does not exist in source.

## What This Docs Set Covers

- Solo AI chat at `POST /api/chat`
- Room AI over Socket.IO via `trigger_ai`
- Smart replies, sentiment, and grammar endpoints under `POST /api/ai/*`
- Model discovery, automatic routing, provider adapters, and fallback handling
- Memory extraction, retrieval, CRUD, import/export, and usage tracking
- Conversation and room insights
- Upload handling and prompt-time attachment/project context injection
- User settings and admin-managed prompt template overrides
- MongoDB write paths, response storage locations, caching/state, failure modes, and scaling limits
- Source vs `dist/` drift where it matters to understanding the live backend

## Source-First Rules

1. Treat `index.js`, `routes/*.js`, `services/*.js`, `middleware/*.js`, and `models/*.js` as the live runtime.
2. Treat `dist/` as secondary evidence only.
3. When source and `dist/` disagree, these docs label the `dist/` behavior as drift unless a matching source implementation exists.
4. Capacity guidance in this set is architecture-based estimation, not measured throughput.

## Suggested Reading Order

1. `docs/ai/01-ai-scope-and-file-map.md`
2. `docs/ai/02-runtime-entrypoints.md`
3. `docs/ai/03-ai-feature-overview.md`
4. `docs/ai/06-solo-chat-flow.md`
5. `docs/ai/07-room-ai-flow.md`
6. `docs/ai/18-memory-system-overview.md`
7. `docs/ai/22-conversation-insights-overview.md`
8. `docs/ai/11-model-catalog-and-discovery.md`
9. `docs/ai/14-fallback-and-error-normalization.md`
10. `docs/ai/34-scaling-and-capacity-analysis.md`
11. `docs/ai/36-inconsistencies-and-code-drift.md`
12. `docs/ai/38-how-to-rebuild-this-architecture.md`
13. `docs/ai/39-improvement-roadmap.md`

## AI Feature Map

| Feature | Entry point | Main source files | Storage | Primary risks |
| --- | --- | --- | --- | --- |
| Solo AI chat | `POST /api/chat` | `routes/chat.js`, `services/gemini.js`, `services/memory.js`, `services/conversationInsights.js` | `Conversation`, `MemoryEntry`, `ConversationInsight` | sync provider latency, duplicate insight refresh, prompt bloat |
| Room AI chat | Socket `trigger_ai` | `index.js`, `services/gemini.js`, `services/memory.js`, `services/conversationInsights.js` | `Room.aiHistory`, `Message`, `MemoryEntry`, `ConversationInsight` | socket fan-out, duplicate writes, in-memory state loss |
| Smart replies | `POST /api/ai/smart-replies` | `routes/ai.js`, `services/gemini.js`, `services/promptCatalog.js` | none | settings gate mismatch, weak fallback quality |
| Sentiment | `POST /api/ai/sentiment` | `routes/ai.js`, `services/gemini.js` | none | schema drift, permissive JSON parsing |
| Grammar | `POST /api/ai/grammar` | `routes/ai.js`, `services/gemini.js` | none | fallback hides provider failures |
| Memory extraction | chat flow, room AI flow, import | `services/memory.js`, `services/importExport.js` | `MemoryEntry` | duplicate upserts, naive regex coverage |
| Conversation insights | chat route and room route/action | `services/conversationInsights.js`, `routes/conversations.js`, `routes/rooms.js` | `ConversationInsight` | stale summaries, extra writes |
| Prompt templates | runtime prompt lookup and admin APIs | `services/promptCatalog.js`, `routes/admin.js`, `models/PromptTemplate.js` | `PromptTemplate` | unsafe edits, missing version discipline |
| Attachments and project context | chat route and provider service | `routes/uploads.js`, `services/gemini.js`, `routes/projects.js` | uploaded files on disk, project metadata in MongoDB | asymmetric file handling, prompt explosion |

## Document Index

| Doc | Topic |
| --- | --- |
| `docs/ai/01-ai-scope-and-file-map.md` | Exact AI file inventory |
| `docs/ai/02-runtime-entrypoints.md` | Boot flow, route mounting, socket setup |
| `docs/ai/03-ai-feature-overview.md` | Feature matrix |
| `docs/ai/04-rest-api-overview.md` | AI REST surface |
| `docs/ai/05-socket-ai-overview.md` | Room AI socket lifecycle |
| `docs/ai/06-solo-chat-flow.md` | `/api/chat` end to end |
| `docs/ai/07-room-ai-flow.md` | `trigger_ai` end to end |
| `docs/ai/08-smart-replies-flow.md` | Smart replies |
| `docs/ai/09-sentiment-flow.md` | Sentiment |
| `docs/ai/10-grammar-flow.md` | Grammar |
| `docs/ai/11-model-catalog-and-discovery.md` | Provider catalogs and TTL refresh |
| `docs/ai/12-auto-routing-and-model-selection.md` | Complexity heuristics and ranking |
| `docs/ai/13-provider-adapters.md` | Provider request implementations |
| `docs/ai/14-fallback-and-error-normalization.md` | Retry chain and normalized errors |
| `docs/ai/15-prompt-construction.md` | Prompt assembly |
| `docs/ai/16-prompt-template-system.md` | Default and DB prompts |
| `docs/ai/17-admin-prompt-management.md` | Admin prompt APIs |
| `docs/ai/18-memory-system-overview.md` | Memory subsystem map |
| `docs/ai/19-memory-extraction.md` | Deterministic and AI-assisted extraction |
| `docs/ai/20-memory-retrieval-and-scoring.md` | Retrieval and scoring |
| `docs/ai/21-memory-crud-import-export.md` | CRUD and import/export |
| `docs/ai/22-conversation-insights-overview.md` | Insight lifecycle |
| `docs/ai/23-conversation-insight-generation.md` | Prompt and persistence details |
| `docs/ai/24-attachments-and-upload-context.md` | Upload pipeline and attachment prompt behavior |
| `docs/ai/25-project-context-injection.md` | Project metadata in prompts |
| `docs/ai/26-ai-quota-and-rate-limiting.md` | Quotas, Express limiters, socket throttling |
| `docs/ai/27-database-write-paths.md` | Exact MongoDB writes |
| `docs/ai/28-response-storage-and-history.md` | Where AI output lives |
| `docs/ai/29-data-model-reference.md` | AI-relevant models |
| `docs/ai/30-api-reference.md` | Concise endpoint reference |
| `docs/ai/31-socket-event-reference.md` | Concise socket event reference |
| `docs/ai/32-sequence-and-architecture-diagrams.md` | Consolidated diagrams |
| `docs/ai/33-failure-modes.md` | Failure analysis |
| `docs/ai/34-scaling-and-capacity-analysis.md` | Estimated limits and bottlenecks |
| `docs/ai/35-caching-and-state-analysis.md` | Runtime state and missing cache layers |
| `docs/ai/36-inconsistencies-and-code-drift.md` | Source vs `dist/` mismatches |
| `docs/ai/37-design-review-questions-and-answers.md` | Exactly 10 evaluator Q&A items |
| `docs/ai/38-how-to-rebuild-this-architecture.md` | Rebuild guide |
| `docs/ai/39-improvement-roadmap.md` | Prioritized next steps |

## Glossary

- `solo chat`: direct user-to-AI conversation stored in a `Conversation` document.
- `room AI`: group-room AI response triggered by a Socket.IO event and stored as a `Message` plus `Room.aiHistory`.
- `memory`: durable user-specific fact stored in `MemoryEntry`.
- `insight`: synthesized summary of a conversation or room stored in `ConversationInsight`.
- `prompt template`: default prompt text or DB override fetched by key.
- `auto route`: model-selection mode where the backend chooses a provider/model using heuristics.

