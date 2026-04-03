# AI Feature Documentation Map

This folder groups the backend's AI-related features as independent modules.

Current AI feature folders:

1. `solo-ai-chat`
2. `ai-helper-endpoints`
3. `room-ai-realtime`
4. `memory-personalization`
5. `conversation-insights`
6. `project-context`
7. `prompt-template-management`
8. `ai-platform-core`

## How To Read This Set

If you want the full backend AI story in a clean order, read it like this:

1. `ai-platform-core`
2. `solo-ai-chat`
3. `room-ai-realtime`
4. `ai-helper-endpoints`
5. `memory-personalization`
6. `conversation-insights`
7. `project-context`
8. `prompt-template-management`

## What Each Folder Covers

### `solo-ai-chat`

Primary source files:

1. `routes/chat.js`
2. `models/Conversation.js`
3. `services/gemini.js`
4. `services/memory.js`
5. `services/conversationInsights.js`
6. `services/messageFormatting.js`
7. `middleware/aiQuota.js`

Purpose:

Direct user-to-model conversations with memory, insight, attachment, project, model-routing, and token tracking.

### `ai-helper-endpoints`

Primary source files:

1. `routes/ai.js`
2. `services/gemini.js`
3. `services/promptCatalog.js`
4. `middleware/aiQuota.js`
5. `middleware/rateLimit.js`
6. `models/User.js`

Purpose:

Lightweight AI utilities such as model discovery, smart replies, sentiment analysis, and grammar correction.

### `room-ai-realtime`

Primary source files:

1. `index.js`
2. `models/Room.js`
3. `models/Message.js`
4. `routes/rooms.js`
5. `services/gemini.js`
6. `services/memory.js`
7. `services/conversationInsights.js`

Purpose:

Socket-driven room AI that responds inside collaborative chat rooms and stores both room prompt history and room messages.

Dedicated docs:

1. `01-feature-deep-dive.md`
2. `02-group-chat-at-ai-feature.md`

### `memory-personalization`

Primary source files:

1. `models/MemoryEntry.js`
2. `routes/memory.js`
3. `services/memory.js`
4. `services/importExport.js`
5. `models/ImportSession.js`

Purpose:

Long-term user memory extraction, scoring, manual editing, import, and export.

Dedicated docs:

1. `01-feature-deep-dive.md`
2. `02-import-export-deep-dive.md`

### `conversation-insights`

Primary source files:

1. `models/ConversationInsight.js`
2. `services/conversationInsights.js`
3. `routes/conversations.js`
4. `routes/rooms.js`

Purpose:

Structured AI summaries, topics, decisions, and action items for both solo conversations and rooms.

### `project-context`

Primary source files:

1. `models/Project.js`
2. `routes/projects.js`
3. `services/gemini.js`
4. `services/messageFormatting.js`

Purpose:

Reusable project instructions, context, files, and suggested prompts that can be injected into AI requests.

### `prompt-template-management`

Primary source files:

1. `models/PromptTemplate.js`
2. `services/promptCatalog.js`
3. `routes/admin.js`

Purpose:

Runtime prompt control so administrators can update AI instructions without redeploying code.

### `ai-platform-core`

Primary source files:

1. `services/gemini.js`
2. `services/aiQuota.js`
3. `middleware/aiQuota.js`
4. `middleware/rateLimit.js`
5. `middleware/upload.js`
6. `middleware/socketAuth.js`
7. `helpers/logger.js`

Purpose:

Shared AI engine: provider routing, fallback, token normalization, quota, rate limits, attachment handling, auth, and logging.

## Big-Picture Architecture

```text
[Client / Frontend]
   |
   +--> [REST /api/chat] --------------------------> [Solo AI Chat]
   |
   +--> [REST /api/ai/*] --------------------------> [AI Helper Endpoints]
   |
   +--> [Socket trigger_ai] -----------------------> [Room AI Realtime]
   |
   +--> [REST /api/memory] ------------------------> [Memory Personalization]
   |
   +--> [REST /api/conversations/:id/insights] ---> [Conversation Insights]
   |
   +--> [REST /api/projects] ----------------------> [Project Context]
   |
   +--> [REST /api/admin/prompts] -----------------> [Prompt Template Management]
   |
   v
[AI Platform Core]
   |
   +--> model catalogs
   +--> prompt construction
   +--> provider calls
   +--> fallback retries
   +--> token extraction
   +--> rate limiting
   +--> logging
   v
[MongoDB + Provider APIs]
```

## Important Design Insight

This backend does not treat AI like one simple endpoint.

It treats AI as a platform with:

1. storage
2. routing
3. prompt management
4. personalization
5. summaries
6. room collaboration
7. operational guardrails

That is why the AI documentation is split by feature instead of by folder only.

## Suggested Reading Paths

### Path 1: Product understanding

1. start with `solo-ai-chat`
2. then read `room-ai-realtime`
3. then read `ai-helper-endpoints`
4. then read `memory-personalization`
5. finish with `conversation-insights`

This path helps a non-backend reader understand what the user can actually do with AI in the product.

### Path 2: Platform engineering

1. start with `ai-platform-core`
2. then read `prompt-template-management`
3. then read `project-context`
4. then read `memory-personalization`
5. then read `solo-ai-chat`
6. finish with `room-ai-realtime`

This path helps a backend engineer understand the reusable AI infrastructure first.

### Path 3: Operations and debugging

1. `ai-platform-core`
2. `solo-ai-chat`
3. `room-ai-realtime`
4. `ai-helper-endpoints`
5. `prompt-template-management`

This path is best when a team member needs to troubleshoot AI behavior in production.

## Feature Dependency Map

The feature folders are independent for learning purposes, but the runtime system is connected.

### `solo-ai-chat` depends on

1. `ai-platform-core`
2. `memory-personalization`
3. `conversation-insights`
4. `project-context`
5. `prompt-template-management`

### `room-ai-realtime` depends on

1. `ai-platform-core`
2. `memory-personalization`
3. `conversation-insights`
4. `prompt-template-management`

### `ai-helper-endpoints` depends on

1. `ai-platform-core`
2. `prompt-template-management`
3. `models/User.js` AI settings

### `memory-personalization` depends on

1. `ai-platform-core`
2. `conversation-insights` after imports

### `conversation-insights` depends on

1. `ai-platform-core`
2. `prompt-template-management`

### `project-context` depends on

1. `ai-platform-core`
2. upload metadata validation

### `prompt-template-management` depends on

1. auth middleware
2. admin middleware
3. database persistence

## Shared Request Lifecycle Reference

Almost every AI feature in this backend follows a shared pattern:

```text
auth
  ->
feature-specific validation
  ->
rate limit or quota
  ->
load context from MongoDB
  ->
build prompt
  ->
route to model
  ->
normalize output
  ->
store or return result
```

What changes between features is not the overall shape.

What changes is:

1. which context sources are loaded
2. whether the result is stored
3. whether the call is REST or socket based
4. whether the output is text or JSON

## Common AI Concepts Used Across The Docs

### Prompt template

A reusable instruction block that shapes model behavior.

### Auto-routing

The backend chooses a model automatically based on task type and complexity.

### Fallback

If one provider or model fails, the backend may retry with another.

### Token usage

The model cost signal, usually split into prompt tokens and completion tokens.

### Insight

A structured summary that compresses longer chat history.

### Memory

A stable user fact or preference that can improve future replies.

### Project context

Reusable task-specific instructions and reference data attached to a conversation.

## How To Use These Docs For Rebuilding

If you want to rebuild the AI backend from scratch, do not start by copying code line by line.

Instead:

1. identify which user-facing AI features you need
2. map which storage models each feature requires
3. build one shared AI platform core
4. add prompt templates before adding multiple routes
5. decide what should be cached or persisted
6. decide what failures must degrade gracefully

These docs are written to help with that kind of architectural thinking.

## Documentation Maintenance Notes

When the backend changes, update the docs in this order:

1. `ai-platform-core`
2. the feature folder that changed
3. `features/README.md`

Why this order:

the shared core affects many features, so it should be documented first.

## Practical Debugging Entry Points

If a user says "AI is broken," check these first:

1. are provider API keys configured
2. does `/api/ai/models` return usable models
3. is the user over quota
4. did auto-routing choose a different model
5. did fallback run
6. is the issue only in REST or also in sockets
7. is prompt-template content valid

## Final Reading Tip

The docs are intentionally written at two levels at once:

1. simple enough for a learner
2. concrete enough for an engineer

If one section feels too detailed, use the diagrams and examples first, then come back to the deeper notes later.
