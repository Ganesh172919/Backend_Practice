# ChatSphere Backend: Production Deep-Dive Documentation

Generated: April 2, 2026

This document is a source-first deep analysis of the current ChatSphere backend implementation. It is intentionally detailed so that a new engineer can read code, operate the system, and plan refactors without guessing hidden behavior.

## 1. Project Overview

- ChatSphere backend is an Express + MongoDB + Socket.IO application with AI-enhanced chat features.
- The system supports both REST interactions and real-time room interactions.
- AI capabilities include direct chat, room AI triggering, smart replies, sentiment analysis, grammar correction, memory extraction, and conversation insights.
- Prompt templates are configurable at runtime via admin APIs and persisted in MongoDB.
- AI model execution is provider-agnostic through a unified orchestration service.
- Durable state is persisted in MongoDB while presence/typing/flood state is in-memory.
- Core business domains: authentication, chat, rooms, moderation, projects, memory, analytics, and admin governance.
- The implementation favors explicit route handlers and modular services over framework-heavy abstractions.

### 1.1 Runtime Entry Points

- Primary runtime entry: index.js
- Route entrypoint namespace: /api/*
- Socket entrypoint: Socket.IO connection handlers configured in index.js
- AI REST namespace: /api/ai/* plus /api/chat

### 1.2 Technology Stack

- Node.js runtime
- Express 4.x
- Socket.IO 4.x
- Mongoose 8.x
- JSON Web Tokens (access + refresh)
- Passport Google OAuth 2.0
- Multer for uploads
- Nodemailer for reset emails
- Multi-provider AI adapters in services/gemini.js

## 2. System Architecture

### 2.1 Architectural Style

- Backend style is modular monolith.
- The codebase follows pragmatic layering: routes -> middleware -> services -> models.
- Socket handlers in index.js currently act as a parallel orchestration layer for room interactions.
- Not microservices: all domains run in one process and one deployment unit.
- Not strict MVC: routes and services carry both controller and application-service roles.

### 2.2 Major Layers

- Layer 1: Transport and protocol boundary (HTTP + Socket.IO).
- Layer 2: Cross-cutting middleware (auth, quota, rate limit, admin, upload).
- Layer 3: Domain routes and orchestration handlers.
- Layer 4: AI and utility services.
- Layer 5: Persistence models.
- Layer 6: Platform integrations (OAuth, SMTP, external AI providers).

### 2.3 Data Stores and State Planes

- Persistent store: MongoDB.
- Volatile state: in-memory maps for room users, online users, typing users, and socket flood tracking.
- Runtime cache: model catalog cache in services/gemini.js with TTL.
- Upload store: local disk under uploads/.

### 2.4 AI Provider Topology

- OpenRouter adapter (OpenAI/Anthropic/Google and others through gateway).
- Native Gemini adapter through @google/generative-ai.
- Grok adapter via xAI API.
- Together adapter for OSS models.
- Groq direct adapter.
- Hugging Face router adapter fallback path.
- Auto routing chooses task-appropriate models based on heuristics and attachment presence.

## 3. Folder Structure Breakdown

### 3.1 Top-Level Responsibilities

- index.js: app bootstrap + socket orchestration.
- config/: connection and auth strategy setup.
- helpers/: validation and logging primitives.
- middleware/: request/socket guards and limits.
- models/: MongoDB schemas.
- routes/: REST API boundary.
- services/: AI orchestration and domain services.
- docs/: architecture and AI behavior documentation.
- docus/: mirrored docs subset.

### 3.2 Source File Catalog (All JS Source Files)

#### C:\Users\RAVIPRAKASH\Downloads\backend\config\db.js

- Overview: MongoDB connection bootstrap for mongoose.
- Why this file exists: Separates persistence setup from route and service logic.
- What it does: Exports the function that initializes the database connection lifecycle.
- How it works: Reads environment settings and executes mongoose connect with defensive error handling.
- Function index:
  - connectDB: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\config\passport.js

- Overview: Google OAuth strategy and passport serialization config.
- Why this file exists: Keeps third-party identity configuration isolated from endpoint handlers.
- What it does: Registers Google strategy plus serialize/deserialize behavior.
- How it works: Maps provider profile data into local user records and user session identity.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\helpers\logger.js

- Overview: Structured logging helpers with sensitive value redaction.
- Why this file exists: Improves observability while avoiding accidental credential leakage.
- What it does: Normalizes context payloads, truncates noisy values, and serializes errors.
- How it works: Transforms nested values, masks known secret keys, and emits consistent log records.
- Function index:
  - truncate: Implements module-specific orchestration behavior.
  - sanitizeValue: Implements module-specific orchestration behavior.
  - serializeContext: Implements module-specific orchestration behavior.
  - writeLog: Implements module-specific orchestration behavior.
  - serializeError: Implements module-specific orchestration behavior.
  - buildBodySummary: Composes prompt/payload/context structures before execution.
  - buildRequestSummary: Composes prompt/payload/context structures before execution.
  - createRequestId: Implements module-specific orchestration behavior.
  - child: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\helpers\validate.js

- Overview: Shared validators for IDs, room roles, and block relationships.
- Why this file exists: Prevents duplicated authorization and shape checks across routes/sockets.
- What it does: Exports membership, role, and object-id utility helpers.
- How it works: Uses small deterministic predicates over Mongo IDs and room member arrays.
- Function index:
  - isValidObjectId: Evaluates policy or boolean eligibility conditions.
  - sanitizeString: Implements module-specific orchestration behavior.
  - escapeRegex: Implements module-specific orchestration behavior.
  - requireFields: Implements module-specific orchestration behavior.
  - findRoomMember: Implements module-specific orchestration behavior.
  - isRoomCreator: Evaluates policy or boolean eligibility conditions.
  - getRoomMemberRole: Retrieves or reads scoped data required by the caller.
  - hasRoomRole: Evaluates policy or boolean eligibility conditions.
  - canManageRoomMember: Evaluates policy or boolean eligibility conditions.
  - isBlockedBy: Evaluates policy or boolean eligibility conditions.

#### C:\Users\RAVIPRAKASH\Downloads\backend\index.js

- Overview: Application bootstrap and real-time socket gateway for ChatSphere.
- Why this file exists: Centralizes startup wiring so REST, Socket.IO, and shared services are initialized in one place.
- What it does: Creates the HTTP server, registers middleware/routes, and handles room chat plus AI socket events.
- How it works: Combines auth checks, validation utilities, service calls, and broadcast logic per socket event.
- Function index:
  - checkFlood: Implements module-specific orchestration behavior.
  - getAck: Retrieves or reads scoped data required by the caller.
  - emitSocketError: Implements module-specific orchestration behavior.
  - isFlooded: Evaluates policy or boolean eligibility conditions.
  - getRoomOnlineUsers: Retrieves or reads scoped data required by the caller.
  - isSocketInRoom: Evaluates policy or boolean eligibility conditions.
  - addUserToRoom: Implements module-specific orchestration behavior.
  - removeUserFromRoom: Implements module-specific orchestration behavior.
  - removeUserFromAllRooms: Implements module-specific orchestration behavior.
  - clearTyping: Implements module-specific orchestration behavior.
  - formatMessage: Formats internal records into API-facing response objects.
  - loadRoomForMember: Implements module-specific orchestration behavior.
  - validateAttachmentPayload: Validates input constraints and rejects invalid states.
  - hasBlockingRelationship: Evaluates policy or boolean eligibility conditions.
  - maybeMarkMessageDelivered: Implements module-specific orchestration behavior.
  - startServer: Implements module-specific orchestration behavior.
  - handleError: Implements module-specific orchestration behavior.
  - handleListening: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\middleware\admin.js

- Overview: Admin-only authorization middleware.
- Why this file exists: Protects privileged admin APIs at a centralized guard point.
- What it does: Verifies the authenticated user has admin privileges.
- How it works: Reads req.user from auth middleware and denies non-admin requests.
- Function index:
  - adminCheck: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\middleware\aiQuota.js

- Overview: HTTP middleware for AI quota checks.
- Why this file exists: Limits costly model operations per user or client key.
- What it does: Consumes quota allowance and blocks when the request budget is exhausted.
- How it works: Calls quota service and returns retry metadata to clients when denied.
- Function index:
  - aiQuotaMiddleware: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\middleware\auth.js

- Overview: JWT bearer authentication middleware for REST APIs.
- Why this file exists: Enforces authentication before protected handlers execute.
- What it does: Extracts and verifies access tokens, then attaches user claims to req.user.
- How it works: Parses Authorization header and validates token with server secret and expiry checks.
- Function index:
  - authMiddleware: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\middleware\rateLimit.js

- Overview: Express rate limiter definitions for auth/API/AI paths.
- Why this file exists: Provides transport-level abuse protection independent from business quota logic.
- What it does: Exports configured limiters and retry response helpers.
- How it works: Builds per-user/per-ip limiter keys and standardized limit exceeded payloads.
- Function index:
  - buildRateLimitKey: Composes prompt/payload/context structures before execution.
  - buildRetryPayload: Composes prompt/payload/context structures before execution.

#### C:\Users\RAVIPRAKASH\Downloads\backend\middleware\socketAuth.js

- Overview: Socket.IO authentication middleware.
- Why this file exists: Applies authentication boundaries to real-time channels.
- What it does: Verifies handshake token and attaches user context to socket.
- How it works: Parses auth token from handshake metadata and validates JWT claims.
- Function index:
  - socketAuthMiddleware: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\middleware\upload.js

- Overview: Multer upload configuration and file safety rules.
- Why this file exists: Ensures chat attachments are type/size validated before persistence.
- What it does: Defines allowed MIME types, file size cap, storage path, and filename policy.
- How it works: Uses multer storage callbacks and file filters to reject unsupported payloads.
- Function index:
  - fileFilter: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\Conversation.js

- Overview: Schema for user-owned direct AI conversation threads.
- Why this file exists: Persists message history and model metadata for continuity and replay.
- What it does: Defines conversation owner, title, message array, and provider/model fields.
- How it works: Uses mongoose schema defaults and nested message documents with timestamps.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\ConversationInsight.js

- Overview: Schema for structured AI-generated conversation insights.
- Why this file exists: Caches summaries/topics/actions for faster client display and analytics.
- What it does: Stores title, summary, intent, topics, decisions, and action items by scope.
- How it works: Upserts scoped insight records keyed by conversation or room identity.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\ImportSession.js

- Overview: Schema for tracking import progress and results.
- Why this file exists: Makes long-running import operations observable and auditable.
- What it does: Stores source metadata, status, preview details, and imported record IDs.
- How it works: Services update lifecycle fields as parsing and persistence stages complete.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\MemoryEntry.js

- Overview: Schema for personalized user memory records.
- Why this file exists: Provides durable context facts used for AI response personalization.
- What it does: Stores memory summary/details, source, tags, and scoring attributes.
- How it works: Combines fingerprint fields, ranking scores, and usage counters for retrieval.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\Message.js

- Overview: Schema for room messages, edits, reactions, and attachment metadata.
- Why this file exists: Captures full chat lifecycle state in a single canonical message document.
- What it does: Defines sender metadata, content, reaction map, status, file fields, and AI metadata.
- How it works: Uses mongoose subdocuments/maps for mutable message state with timestamps.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\Poll.js

- Overview: Schema for in-room polling and voting.
- Why this file exists: Supports group decision workflows inside chat rooms.
- What it does: Stores poll question/options, votes, ownership, and closure state.
- How it works: Tracks per-option votes and temporal constraints for vote eligibility.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\Project.js

- Overview: Schema for project-level AI context containers.
- Why this file exists: Lets users reuse project context and instructions across conversations.
- What it does: Stores project metadata, context blocks, tags, and ownership.
- How it works: Links projects to conversations and validates user ownership boundaries.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\PromptTemplate.js

- Overview: Schema for overridable AI prompt templates.
- Why this file exists: Enables runtime prompt management without code deployments.
- What it does: Stores prompt key, versioning info, content, and activation flag.
- How it works: Prompt catalog resolves defaults and database overrides by template key.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\RefreshToken.js

- Overview: Schema for refresh token persistence.
- Why this file exists: Supports secure token rotation, session continuity, and logout revocation.
- What it does: Stores refresh token value, owner, and expiration metadata.
- How it works: Auth routes issue and validate these records during refresh workflows.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\Report.js

- Overview: Schema for moderation reports and review outcomes.
- Why this file exists: Creates an auditable workflow for user safety escalations.
- What it does: Stores reporter, target type/id, reason, status, and reviewer notes.
- How it works: Moderation and admin routes create and transition report states.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\Room.js

- Overview: Schema for collaborative rooms and room-level AI history.
- Why this file exists: Represents membership, permissions, and room context used by realtime chat.
- What it does: Defines room metadata, members with roles, AI history, and pinned message refs.
- How it works: Socket and route handlers mutate member and history arrays as room activity evolves.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\models\User.js

- Overview: Primary user identity, profile, and preference schema.
- Why this file exists: Centralizes account data, feature toggles, and relationship controls.
- What it does: Stores local/OAuth credentials, profile fields, AI settings, admin flag, and block list.
- How it works: Uses schema hooks/methods for password handling and default preference initialization.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\admin.js

- Overview: Admin governance endpoints.
- Why this file exists: Exposes privileged control-plane operations for moderation and AI configuration.
- What it does: Provides stats, report review, user management, and prompt administration APIs.
- How it works: Combines auth/admin middleware with cross-collection reads and updates.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\ai.js

- Overview: AI utility and model discovery endpoints.
- Why this file exists: Offers HTTP access to model lists and helper AI capabilities.
- What it does: Implements endpoints for models, smart replies, sentiment, and grammar assistance.
- How it works: Validates payloads, applies quota/preferences, and delegates generation to AI services.
- Function index:
  - loadAiPreferences: Implements module-specific orchestration behavior.
  - buildSmartReplyFallback: Composes prompt/payload/context structures before execution.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\analytics.js

- Overview: Platform analytics endpoints.
- Why this file exists: Supplies dashboard-ready usage metrics for admins and operators.
- What it does: Returns aggregated counts and trends for messages, users, and room activity.
- How it works: Builds Mongo aggregation pipelines with access control guards.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js

- Overview: Authentication and account recovery API routes.
- Why this file exists: Keeps login, registration, OAuth, refresh, and reset flows in one bounded module.
- What it does: Issues tokens, validates credentials, links Google login, and handles password reset.
- How it works: Coordinates user model checks, refresh token persistence, and email delivery hooks.
- Function index:
  - getClientUrl: Retrieves or reads scoped data required by the caller.
  - generateTokens: Implements module-specific orchestration behavior.
  - saveRefreshToken: Implements module-specific orchestration behavior.
  - issueGoogleLoginCode: Evaluates policy or boolean eligibility conditions.
  - consumeGoogleLoginCode: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\chat.js

- Overview: Solo AI chat endpoint and conversation persistence flow.
- Why this file exists: Implements direct user-to-assistant interactions with context enrichment.
- What it does: Validates chat input, retrieves memory/insight/project context, calls AI, and stores turns.
- How it works: Orchestrates service calls for quota, model routing, fallback handling, and post-save insight refresh.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\conversations.js

- Overview: Conversation browsing and lifecycle routes.
- Why this file exists: Lets users inspect and manage stored direct-chat sessions.
- What it does: Exposes list/get/insight/action/delete operations for conversation records.
- How it works: Applies ownership checks, pagination, and insight lookups per request.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\dashboard.js

- Overview: User dashboard summary endpoint.
- Why this file exists: Provides a compact API for recent activity cards and counters.
- What it does: Aggregates conversation, room, and message statistics for the authenticated user.
- How it works: Runs parallel queries and returns normalized dashboard payload fields.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\export.js

- Overview: Conversation and room export routes.
- Why this file exists: Supports user data portability and downstream analysis workflows.
- What it does: Returns normalized export payloads for conversations and rooms.
- How it works: Performs access checks then uses export service formatting helpers.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\groups.js

- Overview: Group member role and membership management routes.
- Why this file exists: Provides controlled member administration in multi-user rooms.
- What it does: Lists members, updates roles, and removes members from rooms.
- How it works: Validates actor privileges against role hierarchy before mutations.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\memory.js

- Overview: User memory CRUD and import/export routes.
- Why this file exists: Allows memory curation and transfer for AI personalization continuity.
- What it does: Implements memory search/list/update/delete plus import preview and export actions.
- How it works: Coordinates memory model filters with import/export service pipelines.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\moderation.js

- Overview: Safety reporting and block list routes.
- Why this file exists: Gives users moderation controls and abuse-reporting capability.
- What it does: Handles report submission and block/unblock operations.
- How it works: Validates targets, enforces anti-duplication rules, and persists moderation records.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\polls.js

- Overview: Poll creation and voting routes.
- Why this file exists: Enables structured polls inside collaborative rooms.
- What it does: Creates polls, retrieves state, records votes, and closes active polls.
- How it works: Checks membership and vote constraints, then updates poll documents atomically.
- Function index:
  - formatPoll: Formats internal records into API-facing response objects.
  - loadMemberRoom: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\projects.js

- Overview: Project CRUD routes for reusable AI context.
- Why this file exists: Allows users to define project context that can steer multiple conversations.
- What it does: Exposes project listing, create/update, detail, and stats-oriented responses.
- How it works: Normalizes input fields, enforces ownership, and computes derived usage data.
- Function index:
  - normalizeString: Normalizes values into predictable canonical forms.
  - normalizeStringArray: Normalizes values into predictable canonical forms.
  - normalizeFiles: Normalizes values into predictable canonical forms.
  - formatProject: Formats internal records into API-facing response objects.
  - loadProjectStats: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js

- Overview: Room lifecycle and membership routes.
- Why this file exists: Backs collaborative room management used by socket chat flows.
- What it does: Creates rooms, handles join/leave, and returns room-centric metadata and insights.
- How it works: Uses validation helpers and member-role checks before room mutations.
- Function index:
  - formatRoomSummary: Formats internal records into API-facing response objects.
  - ensureRoomMember: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\search.js

- Overview: Search routes for messages and conversations.
- Why this file exists: Improves discoverability of prior chat context with safe access boundaries.
- What it does: Provides filterable, paginated search over messages and direct conversations.
- How it works: Constructs scoped Mongo queries based on user membership and optional filters.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\settings.js

- Overview: User setting retrieval and update routes.
- Why this file exists: Keeps preference persistence behavior stable for frontend settings pages.
- What it does: Returns effective settings and applies validated updates.
- How it works: Reads and writes nested preference fields with fallback defaults.
- Function index:
  - getDefaultSettings: Retrieves or reads scoped data required by the caller.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\uploads.js

- Overview: Attachment upload and file-serving routes.
- Why this file exists: Supports file sharing while enforcing upload and path safety rules.
- What it does: Accepts authenticated uploads and serves stored files by filename.
- How it works: Invokes upload middleware and rejects path traversal patterns before sendFile.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\routes\users.js

- Overview: User profile routes.
- Why this file exists: Lets authenticated users update profile information consumed across chat UI.
- What it does: Handles profile edits and basic profile retrieval.
- How it works: Validates field limits, updates allowed fields, and persists user changes.
- Functions: none declared as named top-level functions in this file.

#### C:\Users\RAVIPRAKASH\Downloads\backend\services\aiQuota.js

- Overview: In-memory AI quota accounting service.
- Why this file exists: Prevents unbounded model usage and controls operational AI spend.
- What it does: Tracks request counts in a fixed time window and returns allow/deny metadata.
- How it works: Maintains keyed counters with reset timestamps and remaining budget calculations.
- Function index:
  - consumeAiQuota: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\services\conversationInsights.js

- Overview: Conversation and room insight generation service.
- Why this file exists: Summarizes long chat histories into compact, machine-readable insights.
- What it does: Generates insight payloads via AI or fallback logic and persists scoped records.
- How it works: Builds prompt context from recent messages, enforces schema shape, and upserts results.
- Function index:
  - buildScopeKey: Composes prompt/payload/context structures before execution.
  - buildFallbackInsight: Composes prompt/payload/context structures before execution.
  - generateInsightPayload: Implements module-specific orchestration behavior.
  - saveInsight: Implements module-specific orchestration behavior.
  - refreshConversationInsight: Recomputes and persists derived state or cached data.
  - refreshRoomInsight: Recomputes and persists derived state or cached data.
  - getConversationInsight: Retrieves or reads scoped data required by the caller.
  - getRoomInsight: Retrieves or reads scoped data required by the caller.

#### C:\Users\RAVIPRAKASH\Downloads\backend\services\email.js

- Overview: Password-reset email delivery helper.
- Why this file exists: Decouples SMTP operations from auth route logic.
- What it does: Creates transporter from env config and sends reset email content.
- How it works: Uses nodemailer when configured, otherwise logs fallback reset URLs for development.
- Function index:
  - sendResetEmail: Sends a request to another layer/provider and returns the response.

#### C:\Users\RAVIPRAKASH\Downloads\backend\services\gemini.js

- Overview: Multi-provider AI orchestration and model routing core.
- Why this file exists: Presents a unified interface across OpenRouter, Gemini, Grok, Together, Groq, and HF providers.
- What it does: Builds prompts, handles attachment context, fetches catalogs, normalizes errors, and performs fallback retries.
- How it works: Resolves model/provider selection, executes provider-specific API calls, and applies retry/fallback strategy.
- Function index:
  - extractStatusCode: Extracts structured information from loosely-typed input.
  - extractRetryAfterMs: Extracts structured information from loosely-typed input.
  - normalizeAiError: Normalizes values into predictable canonical forms.
  - buildOfflineFallbackResponse: Composes prompt/payload/context structures before execution.
  - buildFallbackModelChain: Composes prompt/payload/context structures before execution.
  - parseConfiguredModels: Parses text or payloads into typed objects.
  - dedupeModels: Implements module-specific orchestration behavior.
  - prettyModelLabel: Implements module-specific orchestration behavior.
  - withProviderMetadata: Implements module-specific orchestration behavior.
  - getConfiguredProviderModels: Retrieves or reads scoped data required by the caller.
  - normalizeCatalogModels: Normalizes values into predictable canonical forms.
  - fetchProviderJson: Implements module-specific orchestration behavior.
  - isSupportedOpenRouterModel: Evaluates policy or boolean eligibility conditions.
  - isSupportedTogetherModel: Evaluates policy or boolean eligibility conditions.
  - isSupportedGroqModel: Evaluates policy or boolean eligibility conditions.
  - isSupportedGeminiModel: Evaluates policy or boolean eligibility conditions.
  - fetchOpenRouterCatalog: Implements module-specific orchestration behavior.
  - fetchTogetherCatalog: Implements module-specific orchestration behavior.
  - fetchGroqCatalog: Implements module-specific orchestration behavior.
  - fetchGrokCatalog: Implements module-specific orchestration behavior.
  - fetchGeminiCatalog: Implements module-specific orchestration behavior.
  - refreshModelCatalogs: Recomputes and persists derived state or cached data.
  - getAvailableModels: Retrieves or reads scoped data required by the caller.
  - resolveModel: Resolves requested identifiers into concrete runtime selections.
  - estimatePromptComplexity: Implements module-specific orchestration behavior.
  - findFirstModelByPatterns: Implements module-specific orchestration behavior.
  - rankModelsForTask: Implements module-specific orchestration behavior.
  - resolveTaskModel: Resolves requested identifiers into concrete runtime selections.
  - buildMemoryContext: Composes prompt/payload/context structures before execution.
  - buildInsightContext: Composes prompt/payload/context structures before execution.
  - parseJsonFromText: Parses text or payloads into typed objects.
  - normalizeHistoryEntry: Normalizes values into predictable canonical forms.
  - serializeHistory: Implements module-specific orchestration behavior.
  - safeReadFile: Implements module-specific orchestration behavior.
  - getAttachmentFilePath: Retrieves or reads scoped data required by the caller.
  - buildAttachmentPayload: Composes prompt/payload/context structures before execution.
  - buildProjectContext: Composes prompt/payload/context structures before execution.
  - buildPrompt: Composes prompt/payload/context structures before execution.
  - fetchJson: Implements module-specific orchestration behavior.
  - extractTextFromOpenAiLikeResponse: Extracts structured information from loosely-typed input.
  - extractUsageFromOpenAiLikeResponse: Extracts structured information from loosely-typed input.
  - extractUsageFromGeminiResponse: Extracts structured information from loosely-typed input.
  - buildOpenAiMessages: Composes prompt/payload/context structures before execution.
  - getMaxTokensForOperation: Retrieves or reads scoped data required by the caller.
  - runOpenRouterRequest: Runs a provider-specific or workflow-specific execution path.
  - runGrokRequest: Runs a provider-specific or workflow-specific execution path.
  - runHuggingFaceRequest: Runs a provider-specific or workflow-specific execution path.
  - runTogetherRequest: Runs a provider-specific or workflow-specific execution path.
  - runGroqDirectRequest: Runs a provider-specific or workflow-specific execution path.
  - runGeminiRequest: Runs a provider-specific or workflow-specific execution path.
  - runModelPrompt: Runs a provider-specific or workflow-specific execution path.
  - executeModelRequest: Implements module-specific orchestration behavior.
  - runModelPromptWithFallback: Runs a provider-specific or workflow-specific execution path.
  - getJsonFromModel: Retrieves or reads scoped data required by the caller.
  - sendMessage: Sends a request to another layer/provider and returns the response.
  - sendGroupMessage: Sends a request to another layer/provider and returns the response.

#### C:\Users\RAVIPRAKASH\Downloads\backend\services\importExport.js

- Overview: Import/export pipeline for conversations and memory.
- Why this file exists: Supports migration from external tools and user-controlled data portability.
- What it does: Parses imported formats, previews bundles, writes records, and generates export payloads.
- How it works: Runs parser detection cascade, fingerprints content for deduplication, and updates import session state.
- Function index:
  - hashContent: Evaluates policy or boolean eligibility conditions.
  - toMessage: Implements module-specific orchestration behavior.
  - parseChatGptJson: Parses text or payloads into typed objects.
  - parseClaudeSource: Parses text or payloads into typed objects.
  - parseGenericMarkdown: Parses text or payloads into typed objects.
  - detectAndParseImport: Implements module-specific orchestration behavior.
  - previewImport: Implements module-specific orchestration behavior.
  - importConversationBundle: Implements module-specific orchestration behavior.
  - buildMarkdownExport: Composes prompt/payload/context structures before execution.
  - buildAdapterExport: Composes prompt/payload/context structures before execution.
  - exportUserBundle: Implements module-specific orchestration behavior.

#### C:\Users\RAVIPRAKASH\Downloads\backend\services\memory.js

- Overview: Memory extraction, scoring, and retrieval service.
- Why this file exists: Provides long-term personalization context to improve AI response relevance.
- What it does: Extracts deterministic/AI memories, deduplicates entries, scores candidates, and returns relevant memories.
- How it works: Normalizes text, computes fingerprints, applies weighted scoring, and tracks usage metrics.
- Function index:
  - normalizeText: Normalizes values into predictable canonical forms.
  - tokenize: Implements module-specific orchestration behavior.
  - uniqueStrings: Implements module-specific orchestration behavior.
  - clampScore: Implements module-specific orchestration behavior.
  - buildFingerprint: Composes prompt/payload/context structures before execution.
  - extractDeterministicMemories: Extracts structured information from loosely-typed input.
  - extractAiMemories: Extracts structured information from loosely-typed input.
  - buildMemoryCandidates: Composes prompt/payload/context structures before execution.
  - computeRecencyScore: Computes weighted metrics used by ranking or filtering.
  - upsertMemoryEntries: Implements module-specific orchestration behavior.
  - scoreMemory: Computes weighted metrics used by ranking or filtering.
  - retrieveRelevantMemories: Implements module-specific orchestration behavior.
  - markMemoriesUsed: Marks lifecycle usage counters and timestamps.

#### C:\Users\RAVIPRAKASH\Downloads\backend\services\messageFormatting.js

- Overview: Message payload formatter and attachment validator.
- Why this file exists: Ensures consistent outbound message shape across REST and Socket.IO APIs.
- What it does: Formats message objects, memory references, and validates attachment fields.
- How it works: Normalizes document fields/maps and enforces upload type/size constraints.
- Function index:
  - formatMemoryRefs: Formats internal records into API-facing response objects.
  - formatMessage: Formats internal records into API-facing response objects.
  - validateAttachmentPayload: Validates input constraints and rejects invalid states.

#### C:\Users\RAVIPRAKASH\Downloads\backend\services\promptCatalog.js

- Overview: Prompt template catalog and interpolation utilities.
- Why this file exists: Centralizes reusable prompts and allows runtime admin overrides.
- What it does: Defines default templates, resolves active overrides, and interpolates dynamic placeholders.
- How it works: Fetches prompt template records by key and merges with defaults at generation time.
- Function index:
  - interpolatePrompt: Implements module-specific orchestration behavior.
  - buildInitialRoomHistory: Composes prompt/payload/context structures before execution.
  - getPromptTemplate: Retrieves or reads scoped data required by the caller.
  - listPromptTemplates: Implements module-specific orchestration behavior.
  - upsertPromptTemplate: Implements module-specific orchestration behavior.

## 4. Backend Flow Explanation

### 4.1 REST Request Lifecycle

1. Client sends request to /api namespace.
2. Request receives requestId and structured logging context.
3. Global API limiter applies transport-level throttling.
4. Route-specific middleware validates auth/admin/quota constraints.
5. Route handler validates payload shape and access scope.
6. Handler orchestrates model/service calls and Mongo reads/writes.
7. Errors are normalized to stable HTTP status/payload contracts.
8. Response includes derived metadata where available (tokens/model/provider).

### 4.2 Socket Lifecycle

1. Socket handshake token is validated by socketAuth middleware.
2. Flood guard checks event cadence per socket.
3. Room membership and role checks gate room operations.
4. Message/AI events persist to MongoDB when needed.
5. Room broadcasts emit normalized message payloads.
6. Typing/presence state is maintained in-memory and cleaned on disconnect.

### 4.3 Socket Event Inventory

- add_reaction
- authenticate
- delete_message
- disconnect
- edit_message
- join_room
- leave_room
- mark_read
- pin_message
- reply_message
- send_message
- trigger_ai
- typing_start
- typing_stop
- unpin_message

## 5. API Design and Endpoints

The following endpoint inventory is extracted directly from routes/*.js.

| Route File | Method | Path | Source Line |
| --- | --- | --- | --- |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\admin.js | GET | /stats | 20 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\admin.js | GET | /reports | 56 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\admin.js | PUT | /reports/:id | 116 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\admin.js | GET | /users | 156 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\admin.js | GET | /prompts | 205 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\admin.js | PUT | /prompts/:key | 216 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\ai.js | GET | /models | 49 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\ai.js | POST | /smart-replies | 82 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\ai.js | POST | /sentiment | 138 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\ai.js | POST | /grammar | 184 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\analytics.js | GET | /messages | 16 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\analytics.js | GET | /users | 62 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\analytics.js | GET | /rooms | 118 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js | POST | /register | 110 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js | POST | /login | 170 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js | POST | /refresh | 208 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js | POST | /logout | 248 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js | GET | /me | 262 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js | POST | /forgot-password | 277 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js | POST | /reset-password | 309 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js | GET | /google | 347 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\auth.js | POST | /google/exchange | 383 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\chat.js | POST | / | 21 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\conversations.js | GET | / | 15 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\conversations.js | GET | /:id | 55 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\conversations.js | GET | /:id/insights | 112 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\conversations.js | POST | /:id/actions/:action | 123 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\conversations.js | DELETE | /:id | 160 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\dashboard.js | GET | / | 18 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\export.js | GET | /conversations | 18 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\export.js | GET | /rooms/:roomId | 40 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\export.js | GET | /conversation/:id | 93 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\groups.js | GET | /:roomId/members | 22 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\groups.js | PUT | /:roomId/members/:userId/role | 68 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\groups.js | DELETE | /:roomId/members/:userId | 118 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\memory.js | GET | / | 15 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\memory.js | PUT | /:id | 62 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\memory.js | DELETE | /:id | 102 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\memory.js | POST | /import | 121 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\memory.js | GET | /export | 150 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\moderation.js | POST | /report | 17 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\moderation.js | POST | /block | 95 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\moderation.js | DELETE | /block/:userId | 143 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\moderation.js | GET | /blocked | 172 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\polls.js | POST | / | 70 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\polls.js | GET | /room/:roomId | 126 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\polls.js | POST | /:id/vote | 150 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\polls.js | POST | /:id/close | 210 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\projects.js | GET | / | 126 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\projects.js | GET | /:id | 148 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\projects.js | POST | / | 184 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\projects.js | PATCH | /:id | 211 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\projects.js | DELETE | /:id | 245 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | GET | / | 66 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | POST | / | 88 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | POST | /:id/join | 123 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | POST | /:id/leave | 162 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | GET | /:id/insights | 193 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | POST | /:id/actions/:action | 209 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | GET | /:id | 241 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | DELETE | /:id | 266 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | POST | /:id/pin/:messageId | 294 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | DELETE | /:id/pin/:messageId | 336 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\rooms.js | GET | /:id/pinned | 370 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\search.js | GET | /messages | 18 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\search.js | GET | /conversations | 153 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\settings.js | GET | / | 14 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\settings.js | PUT | / | 28 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\uploads.js | POST | / | 15 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\uploads.js | GET | /:filename | 38 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\users.js | PUT | /profile | 14 |
| C:\Users\RAVIPRAKASH\Downloads\backend\routes\users.js | GET | /:id | 55 |

### 5.1 API Design Observations

- The API style is pragmatic REST with resource- and action-style subpaths.
- Some endpoints model commands explicitly via /actions/:action.
- Auth and AI routes include stricter limiter/quota middleware than general APIs.
- Admin routes are explicitly guarded by both auth and admin middleware.
- Pagination is present in multiple endpoints but not consistently universal.

## 6. AI Integration Layer

### 6.1 Core AI Service Responsibilities

- Build and interpolate prompts.
- Compose history + memory + insight + attachment context.
- Select models via explicit request or auto routing heuristics.
- Execute provider-specific HTTP SDK/API calls.
- Normalize provider errors into stable retry/category metadata.
- Attempt fallback models based on retryability and configured limits.
- Return normalized model metadata and token usage details to callers.

### 6.2 External AI Providers

- openrouter
- gemini
- grok
- together
- groq
- huggingface

### 6.3 Provider Request Adapters

- runOpenRouterRequest
- runGrokRequest
- runHuggingFaceRequest
- runTogetherRequest
- runGroqDirectRequest
- runGeminiRequest

### 6.4 Error and Fallback Semantics

- normalizeAiError categorizes model unavailability, quota, credit, and transient failures.
- retryAfter extraction reads provider-specific hints from message payloads.
- runModelPromptWithFallback iterates attempt chains with ranked alternatives.
- fallbackUsed metadata is returned in routing information for telemetry.

## 7. Prompt Engineering Strategy

### 7.1 Prompt Sources

- Default prompt templates in services/promptCatalog.js
- Optional database overrides in PromptTemplate collection
- Runtime interpolation for roomName and dynamic context fields

### 7.2 Prompt Assembly Inputs

- Serialized recent history (up to bounded window)
- Retrieved memory snippets
- Conversation insight context
- Attachment-derived prompt text
- Project instructions/context/suggested prompts
- Current user request

### 7.3 Prompt Safety Principles Implemented

- Memory context is advisory, not absolute truth.
- Group prompt constrains assistant to collaborative room behavior.
- JSON-only prompts are used for structured helper endpoints.
- Fallback deterministic behavior exists for some features when AI fails.

## 8. Data Flow (Step-by-Step)

### 8.1 Solo Chat Flow

1. POST /api/chat receives user message + optional history/model/project/attachment.
2. auth middleware validates access token and user context.
3. aiQuota middleware enforces user/IP AI budget.
4. route validates message and attachment shape.
5. memory service retrieves top relevant memories.
6. existing insight is loaded when conversationId exists.
7. optional project context is loaded and ownership validated.
8. AI service builds prompt and executes model with fallback logic.
9. conversation model stores user turn + assistant turn with model metadata.
10. memory extraction/upsert runs on user prompt text.
11. memory usage counters are incremented for injected memories.
12. conversation insight is refreshed asynchronously inside response flow.
13. API returns content + routing + usage + insight fields.

### 8.2 Room AI Trigger Flow

1. trigger_ai socket event receives prompt + room context.
2. flood protection and membership checks run before model calls.
3. quota is consumed from in-memory AI quota service.
4. room insight and relevant memory are fetched in parallel.
5. prompt memory extraction/upsert runs for user prompt text.
6. sendGroupMessage builds prompt with room history + insight + memory.
7. AI response plus model/provider metadata is returned.
8. room aiHistory appends user and model entries (bounded window).
9. AI message document is persisted into Message collection.
10. room insight refresh runs from latest message window.
11. ai_response socket broadcast sends normalized payload.

### 8.3 Smart Replies Flow

1. Route receives recent messages/context/model selection.
2. User settings gate smartReplies feature access.
3. Prompt template requests strict JSON array output.
4. getJsonFromModel parses provider output into structured array.
5. deterministic fallback generates 3 defaults when provider fails.

## 9. Authentication and Security

### 9.1 Authentication

- Access token: JWT bearer for REST and socket handshake.
- Refresh token: persisted model with expiry.
- Local auth: email/password with password hashing.
- OAuth: Google login and account linking flow.

### 9.2 Security Controls

- Auth middleware on protected routes.
- Admin middleware on privileged operations.
- AI quota middleware and service-level quota checks.
- Express transport rate limiters for auth/API/AI namespaces.
- Socket flood controls for event spam reduction.
- Upload file type/size checks and filename traversal prevention.
- Block list checks in moderation/search/room interactions.
- Sensitive log value redaction in logger helper.

## 10. Middleware Explanation

### 10.1 auth middleware
- Purpose: verify bearer token and attach req.user.
- Failure mode: 401 for missing/invalid token.
- Data contract: req.user includes id and identity attributes.

### 10.2 admin middleware
- Purpose: enforce admin-only actions.
- Failure mode: 403 for non-admin actors.
- Data contract: requires auth middleware to run first.

### 10.3 aiQuota middleware
- Purpose: protect AI spend and fairness per user/IP key.
- Failure mode: 429 with retryAfterMs.
- Data contract: may expose remaining quota metadata.

### 10.4 rateLimit middleware set
- Purpose: transport-level throttling for brute-force and abuse prevention.
- Scope: auth, AI, and general API limiters.
- Keying: user-aware first, IP fallback.

### 10.5 socketAuth middleware
- Purpose: authenticate real-time socket clients.
- Failure mode: connection rejection on invalid token.
- Data contract: socket.user for downstream handlers.

### 10.6 upload middleware
- Purpose: enforce upload policy and disk storage conventions.
- Controls: MIME whitelist, max file size, generated filenames.
- Failure mode: validation error before route persistence.

## 11. Error Handling Strategy

- Route handlers use try/catch with standardized JSON error payloads.
- AI failures are normalized into retryability + category + status.
- Insight and memory side effects may fail without failing primary message send in specific flows.
- Logger helper serializes nested errors to preserve useful diagnostics.
- HTTP status patterns: 400 validation, 401 auth, 403 permissions, 404 missing resources, 429 throttles, 500/503 backend/provider failures.
- Socket handlers emit error_message acknowledgments with operation-safe payloads.

## 12. AI Feature Deep Dive

### 12.1 Solo AI Chat

- Purpose: Direct user-to-assistant chat with memory + project context + insight support.
- Input structure: message, history, conversationId, modelId, attachment, projectId
- Output structure: assistant message, usage tokens, selected model/provider, conversationId, insight
- Prompt engineering: solo-chat template + history + memory + insight + attachment + project context
- Model strategy: auto or requested model through runModelPromptWithFallback
- Execution flow: routes/chat.js -> services/memory.js -> services/conversationInsights.js -> services/gemini.js -> Conversation save
- Backend logic anchors: routes/chat.js -> services/memory.js -> services/conversationInsights.js -> services/gemini.js -> Conversation save
- Current limitations: Prompt growth risk, synchronous provider latency, monolithic route complexity
- Improvement opportunities: Stream partial responses, move side effects to queue, add request tracing spans

### 12.2 Room AI Trigger

- Purpose: Collaborative room AI response generation from socket event.
- Input structure: roomId, prompt, modelId, optional attachment
- Output structure: ai_response socket payload and persisted AI message
- Prompt engineering: group-chat template + room history + memory + insight + trigger metadata
- Model strategy: auto or requested with fallback chain
- Execution flow: index.js trigger_ai -> quota -> memory/insight -> sendGroupMessage -> Message + Room.aiHistory
- Backend logic anchors: index.js trigger_ai -> quota -> memory/insight -> sendGroupMessage -> Message + Room.aiHistory
- Current limitations: Single-process in-memory state, event burst pressure, non-distributed socket state
- Improvement opportunities: External pub/sub for rooms, distributed rate limiting, worker offload for AI tasks

### 12.3 Smart Replies

- Purpose: Generate short quick-reply suggestions for conversation context.
- Input structure: recent messages array + optional context/modelId
- Output structure: array of exactly 3 candidate replies
- Prompt engineering: smart-replies template with JSON-only instruction
- Model strategy: auto/requested via getJsonFromModel
- Execution flow: routes/ai.js smart-replies -> AI JSON parse -> fallback deterministic array
- Backend logic anchors: routes/ai.js smart-replies -> AI JSON parse -> fallback deterministic array
- Current limitations: Heuristic fallback can be generic, no confidence score returned
- Improvement opportunities: Return confidence + rationale, add language/style constraints, add caching

### 12.4 Sentiment Analysis

- Purpose: Classify sentiment with confidence and emoji hints.
- Input structure: message text and optional recent context
- Output structure: sentiment label, confidence, emoji
- Prompt engineering: sentiment template requesting strict JSON
- Model strategy: auto/requested via getJsonFromModel
- Execution flow: routes/ai.js sentiment -> AI JSON parse -> fallback neutral payload
- Backend logic anchors: routes/ai.js sentiment -> AI JSON parse -> fallback neutral payload
- Current limitations: Single-label output, no explanation trace, dependent on provider JSON quality
- Improvement opportunities: Aspect-level sentiment, confidence calibration, multilingual tuning

### 12.5 Grammar Correction

- Purpose: Return corrected text plus targeted writing suggestions.
- Input structure: text and optional style/tone context
- Output structure: correctedText and suggestion list
- Prompt engineering: grammar template enforcing compact JSON schema
- Model strategy: auto/requested via getJsonFromModel
- Execution flow: routes/ai.js grammar -> structured generation -> fallback echo/suggestions
- Backend logic anchors: routes/ai.js grammar -> structured generation -> fallback echo/suggestions
- Current limitations: No language auto-detection metadata, may over-correct intentional style
- Improvement opportunities: Style-preserving mode, severity levels, diff-based output

### 12.6 Memory System

- Purpose: Persist durable user facts and retrieve relevant memories during generation.
- Input structure: chat text for extraction, query text for retrieval
- Output structure: memory entries with scores, usage counters, deduplicated facts
- Prompt engineering: memory-extract template for AI-assisted extraction
- Model strategy: structured JSON generation through getJsonFromModel
- Execution flow: services/memory.js deterministic + AI extraction -> fingerprint upsert -> weighted retrieval
- Backend logic anchors: services/memory.js deterministic + AI extraction -> fingerprint upsert -> weighted retrieval
- Current limitations: Regex extraction is English-biased, score weights are static, no semantic embeddings
- Improvement opportunities: Embedding search, multilingual extraction, adaptive scoring feedback loop

### 12.7 Conversation Insights

- Purpose: Generate concise summaries/intents/topics/decisions/action items.
- Input structure: recent messages for conversation or room scope
- Output structure: ConversationInsight document payload
- Prompt engineering: conversation-insight template requiring strict JSON object
- Model strategy: structured generation with deterministic fallback
- Execution flow: services/conversationInsights.js -> getJsonFromModel -> schema clamp -> upsert
- Backend logic anchors: services/conversationInsights.js -> getJsonFromModel -> schema clamp -> upsert
- Current limitations: Summary freshness tied to trigger points, no background regeneration policy
- Improvement opportunities: Scheduled refresh, incremental summarization, confidence scores per field

### 12.8 Model Catalog Discovery and Auto Routing

- Purpose: Expose available models and choose task-appropriate model when auto mode is used.
- Input structure: provider API catalogs + operation context + optional requested model
- Output structure: model list and selected model metadata
- Prompt engineering: N/A for catalog; routing uses heuristics
- Model strategy: All configured providers
- Execution flow: refreshModelCatalogs + rankModelsForTask + resolveTaskModel
- Backend logic anchors: refreshModelCatalogs + rankModelsForTask + resolveTaskModel
- Current limitations: Heuristic routing can drift from real latency/cost quality signals
- Improvement opportunities: Telemetry-driven adaptive routing, cost-aware policies, provider health score weighting

## 13. Performance Considerations

- Provider latency dominates end-to-end response time in AI flows.
- Synchronous AI calls in request path can increase p95 latency under load.
- Memory retrieval scans top 100 records; acceptable now but may degrade with growth.
- Conversation insight refresh adds extra writes and model calls in active channels.
- Model catalog refresh is cached with TTL, reducing provider metadata overhead.
- In-memory socket maps are fast but process-local and non-shareable across replicas.
- Upload handling is disk-based and may need external object storage at scale.

## 14. Scalability Design

### 14.1 Current Scalability Posture

- Vertical scaling works for moderate workloads.
- Horizontal scaling is constrained by process-local socket state and quota maps.
- MongoDB model design is workable but needs index review as dataset grows.
- Provider fallback offers resiliency but not throughput scaling by itself.

### 14.2 Scale-Up Roadmap

- Externalize socket presence/state to Redis adapter for multi-instance broadcasts.
- Move AI calls and insight generation to job workers for better queue control.
- Add distributed quota/rate counters.
- Introduce response streaming for long provider generation operations.
- Add cache layers for stable AI helper outputs where acceptable.
- Add model health telemetry and circuit breaker metrics.

## 15. Limitations of Current Implementation

- index.js contains extensive socket orchestration logic; maintainability risk.
- In-memory flood/quota/presence state is not distributed.
- Some feature settings exist but require continued UX/backend parity checks.
- Limited batching/queueing for costly AI side effects.
- Static score weights in memory retrieval may not fit all users equally.
- Not all routes have identical pagination/filter consistency.
- Provider output schemas can drift and require monitoring + stricter validation.
- Fallback chains improve availability but may change style/quality unpredictably.

## 16. Suggested Improvements

### 16.1 Code Structure
- Split socket event handlers into dedicated modules by domain.
- Introduce service interfaces for transport-agnostic orchestration.
- Add request tracing IDs through all service boundaries including AI calls.
- Consolidate message formatting in one shared serializer path.

### 16.2 AI and Prompt Layer
- Add provider capability matrix with explicit tool/file/token limits.
- Add safety and output validators per feature schema.
- Add structured telemetry for fallback reason categories and success rates.
- Add model cost/latency-aware routing policies.

### 16.3 Data and Reliability
- Add indexes reviewed against real query plans for search/memory/insight endpoints.
- Add idempotency guards for AI-triggered writes in retry scenarios.
- Add background cleanup jobs for stale in-memory-like persisted artifacts.
- Add outbox/event pattern for side effects that can fail independently.

### 16.4 Security and Operations
- Add centralized security headers and tighter CSP where applicable.
- Add audit logs for admin prompt edits and moderation state changes.
- Add alerting thresholds for 429/503 spikes and provider-specific outages.
- Add disaster recovery runbook for provider or Mongo outage scenarios.

## 17. Future Enhancements

- Multi-tenant organization support with workspace-level settings.
- Vector retrieval and semantic memory ranking extension.
- Tool-calling architecture for calendar/email/task integration workflows.
- Streaming response UX for both REST and room AI events.
- Fine-grained AI policy control per room/project/user tier.
- Human-in-the-loop moderation escalation with AI triage assist.
- Cost budgeting dashboards by user/project/provider/model.
- Plug-in provider architecture with health probes and weighted routing.

## Appendix A: AI Provider Environment Variables

- GEMINI_API_KEY
- OPENROUTER_API_KEY
- GROK_API_KEY or XAI_API_KEY
- TOGETHER_API_KEY
- GROQ_API_KEY
- HUGGINGFACE_API_KEY
- DEFAULT_AI_MODEL and provider-specific default model variables
- MODEL_CATALOG_TTL_MS and AI_FALLBACK_MODEL_LIMIT tuning variables

## Appendix B: Review Checklist

Use this checklist for pull requests that touch chat, AI, auth, or persistence paths.

- Verify request validation happens before expensive provider calls.
- Verify authorization checks happen before data reads that can leak existence.
- Verify all new AI endpoints include quota and limiter coverage.
- Verify retry and fallback behavior is explicit and observable.
- Verify model and provider metadata is returned in a stable schema.
- Verify message writes are idempotent under retried requests or events.
- Verify insight refresh side effects cannot break successful primary responses.
- Verify memory extraction is bounded and deduplicated.
- Verify upload payloads enforce type and size constraints.
- Verify room membership checks guard all room-scoped reads and writes.
- Verify admin routes include both auth and admin middleware.
- Verify logs include request IDs and do not expose secrets.
- Verify status codes match failure classes (400/401/403/404/429/5xx).
- Verify fallback messages are user-safe and operationally actionable.
- Verify new fields are documented in API response contracts.
- Verify indexes exist for newly added high-cardinality query patterns.
- Verify pagination defaults and hard caps are applied consistently.
- Verify socket events emit deterministic ack and error payload shapes.
- Verify feature-flag checks run before feature execution.
- Verify tests cover success and provider-failure branches.

## Appendix C: Change Impact Questions

Use these questions before shipping architecture or AI-flow changes.

- What data is persisted if the provider call succeeds but post-processing fails?
- What happens if memory retrieval fails but chat generation succeeds?
- What happens if insight refresh fails after message persistence?
- Which operations are safe to retry, and which can create duplicates?
- Which failure classes should trigger fallback model attempts?
- Which failures should fail fast without fallback retries?
- How will this change behave in a multi-instance deployment?
- Does this change rely on process-local state that should move to Redis?
- Does this change increase token usage or prompt size materially?
- Does this change alter model routing quality or cost tradeoffs?
- Do clients receive enough metadata to diagnose fallback paths?
- Are new response fields backward-compatible with existing clients?
- Are moderation boundaries still enforced in search and chat flows?
- Could this change leak private room or user information across scopes?
- Are admin-only changes audited and traceable?
- Are rate limits and quota budgets still aligned with expected traffic?
- Do we need migration or index updates for new query patterns?
- Is there an operational rollback path if provider behavior changes?
- Which metrics and alerts should be added with this change?
- What documentation sections must be updated with this change?