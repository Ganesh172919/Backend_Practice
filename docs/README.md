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
14. `docs/ai/40-production-system-deep-dive.md`

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
| `docs/ai/40-production-system-deep-dive.md` | End-to-end production deep-dive with architecture, API inventory, AI flow analysis, and file/function catalog |

## Glossary

- `solo chat`: direct user-to-AI conversation stored in a `Conversation` document.
- `room AI`: group-room AI response triggered by a Socket.IO event and stored as a `Message` plus `Room.aiHistory`.
- `memory`: durable user-specific fact stored in `MemoryEntry`.
- `insight`: synthesized summary of a conversation or room stored in `ConversationInsight`.
- `prompt template`: default prompt text or DB override fetched by key.
- `auto route`: model-selection mode where the backend chooses a provider/model using heuristics.


## Implementation Deepening Appendix

This appendix adds implementation-focused explanation to README. The goal is to make the code easier to learn by focusing on execution order, data transformations, control points, and the practical reasoning behind the current implementation choices.

### Implementation Focus 1: Entry Boundary
- Implementation note 1 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 2 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 3 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 4 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 5 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 6 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 7 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 8 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 9 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 10 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 11 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.
- Implementation note 12 for README: identify the real boundary where work starts, then explain what the code validates immediately, what it defers, and why that ordering affects correctness, latency, and failure visibility.

### Implementation Focus 2: Control Flow
- Control-flow note 1 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 2 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 3 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 4 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 5 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 6 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 7 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 8 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 9 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 10 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 11 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.
- Control-flow note 12 for README: trace the exact branch conditions in C:\Users\RAVIPRAKASH\Downloads\backend\docs\README.md and explain which conditions are business rules, which are safety checks, and which are fallback behavior added for robustness rather than product semantics.

### Implementation Focus 3: Data Shaping
- Data-shaping note 1 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 2 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 3 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 4 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 5 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 6 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 7 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 8 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 9 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 10 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 11 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.
- Data-shaping note 12 for README: explain how the implementation converts incoming payloads, database rows, provider outputs, or socket payloads into the smaller structures used later in the flow, and why those shape changes matter.

### Implementation Focus 4: Storage Semantics
- Storage note 1 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 2 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 3 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 4 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 5 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 6 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 7 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 8 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 9 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 10 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 11 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.
- Storage note 12 for README: describe exactly when this topic reads from MongoDB, when it writes, which fields are durable, which are derived, and how partial success could leave the stored state slightly ahead of or behind the intended architecture.

### Implementation Focus 5: Small Coding Explanations
- Coding explanation 1 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 2 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 3 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 4 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 5 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 6 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 7 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 8 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 9 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 10 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 11 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.
- Coding explanation 12 for README: pick a small helper, condition, loop, or mapping step tied to this topic and explain what it is doing in plain language, what assumption it relies on, and how a new engineer should read it without overcomplicating it.

### Implementation Focus 6: Error Paths
- Error-path note 1 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 2 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 3 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 4 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 5 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 6 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 7 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 8 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 9 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 10 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 11 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.
- Error-path note 12 for README: explain how the implementation reports failure for this topic, whether the failure is user-visible, whether logs preserve enough context, and whether the code retries, degrades, or simply aborts.

### Implementation Focus 7: Refactor Reading Guide
- Refactor guide 1 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 2 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 3 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 4 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 5 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 6 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 7 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 8 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 9 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 10 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 11 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.
- Refactor guide 12 for README: if this part of the code were to be refactored, explain which lines are true domain logic, which lines are orchestration, and which lines should likely move into a narrower service, helper, or adapter boundary.

### Implementation Focus 8: Step-By-Step Review Checklist
- Review checklist item 1 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 2 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 3 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 4 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 5 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 6 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 7 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 8 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 9 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 10 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 11 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.
- Review checklist item 12 for README: when reviewing this implementation, verify the validation order, the read-before-write sequence, the response shape, the fallback path, the storage side effects, and the assumptions about single-process or multi-process deployment.

### Implementation Focus 9: Teaching Notes
- Teaching note 1 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 2 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 3 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 4 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 5 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 6 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 7 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 8 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 9 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 10 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 11 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
- Teaching note 12 for README: explain this topic to a new engineer as a sequence of small decisions rather than a wall of code, and call out the one place where the implementation is clever, the one place where it is practical, and the one place where it is fragile.
