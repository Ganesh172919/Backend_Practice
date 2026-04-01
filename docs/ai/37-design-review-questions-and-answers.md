# 37. Design Review Questions And Answers

## Purpose

This file contains exactly 10 design-oriented evaluator questions with grounded answers.

1. Why is memory hybrid deterministic plus AI-assisted instead of AI-only?
   Deterministic extraction in `services/memory.js` gives cheap, high-confidence capture for patterns like names, locations, workplaces, and preferences even when providers fail. AI-assisted extraction broadens coverage beyond regexes. The hybrid design keeps memory creation partially resilient and lowers dependence on provider availability.

2. Why does room AI use both `Room.aiHistory` and persisted `Message` rows?
   They serve different consumers. `Room.aiHistory` is compact prompt-facing state seeded by `buildInitialRoomHistory()` and trimmed aggressively in `index.js`. `Message` is the user-facing room transcript with moderation, reactions, pins, exports, and read-state support. The cost is dual-write complexity and possible drift between the two.

3. Why is AI quota in memory, and what breaks in multi-instance deploys?
   The current quota implementation in `services/aiQuota.js` is the simplest process-local map keyed by user or IP. It works on a single instance with no external dependency. In multi-instance deployments, each node tracks quota separately, so users can exceed intended limits by hitting different instances, and support teams cannot inspect a single authoritative quota state.

4. Why are prompt templates DB-overridable?
   Prompt overrides let operators change behavior without redeploying code. `services/promptCatalog.js` falls back to source defaults but will use active `PromptTemplate` rows when present. That improves operational agility, but it also means prompt regressions can ship instantly and without tests if admins edit templates carelessly.

5. Why does response storage differ between solo and room flows?
   Solo chat already models history as an embedded `Conversation.messages` array, so assistant responses naturally live there with rich telemetry. Rooms already use a `Message` collection for transcript features, but AI prompting also needs compact history, so room AI writes both `Message` and `Room.aiHistory`. The product semantics differ, so storage semantics differ too.

6. Why is attachment handling text/image/PDF asymmetric?
   `buildAttachmentPayload()` can cheaply read text-like files, can inline small images as base64 for multimodal providers, but does not implement PDF text extraction. The system accepts PDFs because uploads support them, yet only adds a metadata note during prompting. That asymmetry reflects implementation limits, not a fully deliberate capability model.

7. Why does auto-routing use heuristics instead of measured routing?
   The router in `services/gemini.js` uses prompt length, task type, and attachment presence because the repo has no measured latency/cost/quality telemetry loop. Heuristics are fast to implement and deterministic, but they are brittle and cannot adapt automatically when provider quality or pricing changes.

8. How can insights become stale even though the backend refreshes them often?
   Reads use cached `ConversationInsight` rows if they already exist. Solo chat reads the existing insight before generating a new answer and only refreshes afterward. Room and conversation insights also depend on refresh calls succeeding. If refresh fails or the read happens before a new refresh, the prompt can use older summaries.

9. Where can race conditions or duplicate writes happen today?
   Solo chat has no idempotency key, so client retries can append duplicate assistant messages. Room AI can duplicate `Message` writes or `Room.aiHistory` appends if the same `trigger_ai` payload is retried. Insight refreshes can also overlap with message writes, and memory upserts happen before room AI provider success is known, so failed AI requests can still create durable memory entries.

10. How can this system scale safely without changing product semantics?
   Preserve the same APIs and storage contracts first, then move quota/presence/flood state to shared infrastructure, isolate provider calls behind queues or worker pools, keep `Room.aiHistory` and message writes consistent, and add observability for retries, insight freshness, and write amplification. The safe path is operational hardening, not changing user-visible semantics.

