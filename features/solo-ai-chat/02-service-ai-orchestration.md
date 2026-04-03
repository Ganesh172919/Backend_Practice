# Solo AI Chat
# File 02: Service Layer And AI Orchestration

Primary source files:

1. `services/gemini.js`
2. `services/memory.js`
3. `services/conversationInsights.js`
4. `services/promptCatalog.js`
5. `services/messageFormatting.js`
6. `services/aiQuota.js`

## Why This Layer Exists

The route in `routes/chat.js` is not doing the AI work directly.

The service layer exists because solo AI chat needs much more than "send prompt, get answer."

It must:

1. build the final prompt from many context sources
2. choose a model
3. support multiple providers
4. validate file context
5. retrieve useful memories
6. read existing conversation insight
7. parse token usage
8. retry on provider failure
9. keep JSON helper calls stable

## Main Service Responsibilities

### `services/gemini.js`

This is the AI engine.

It handles:

1. provider model catalogs
2. model resolution
3. prompt complexity estimation
4. task-aware auto-routing
5. attachment preprocessing
6. project context injection
7. prompt construction
8. provider-specific API calls
9. token usage normalization
10. fallback retry strategy

### `services/memory.js`

This is the personalization engine.

It handles:

1. deterministic memory extraction
2. AI memory extraction
3. memory deduplication using fingerprints
4. relevance scoring
5. usage tracking

### `services/conversationInsights.js`

This is the summarization engine.

It converts long chat history into:

1. title
2. summary
3. intent
4. topics
5. decisions
6. action items

### `services/promptCatalog.js`

This is the prompt registry.

It supplies default prompts and database overrides for:

1. solo chat
2. group chat
3. memory extraction
4. conversation insight generation
5. helper AI tasks

### `services/messageFormatting.js`

This is the safety boundary for attachment payload shape.

It rejects invalid attachment objects before the AI layer tries to use them.

### `services/aiQuota.js`

This is the cost guardrail.

It limits how many AI requests a user can make inside a fixed time window.

## Prompt Engineering Strategy

The prompt builder in `services/gemini.js` uses a layered strategy:

```text
recent history
  + memory context
  + conversation insight
  + attachment text
  + project context
  + current user request
```

That order matters.

Why:

1. history preserves continuity
2. memory personalizes the reply
3. insight compresses prior context
4. attachment text injects file knowledge
5. project context steers the answer toward the user's goal
6. current request stays last so the model knows what to do now

## Model Routing Strategy

The routing pipeline in `services/gemini.js` is:

```text
requested model?
   |
   +--> yes and not auto -> use that model if available
   |
   +--> no or auto -> estimate complexity -> rank models -> pick top model
```

Important functions:

1. `resolveModel`
2. `estimatePromptComplexity`
3. `rankModelsForTask`
4. `resolveTaskModel`
5. `runModelPromptWithFallback`

Complexity signals:

1. long prompts
2. group chat operations
3. attachments
4. JSON-only operations

Simple meaning:

easy tasks can go to cheaper or faster models, while harder tasks can go to stronger models.

## Input Preprocessing

### Memory preprocessing

`retrieveRelevantMemories` loads up to 100 recent entries, scores them, filters weak matches, and returns the top few.

### Attachment preprocessing

`buildAttachmentPayload` inspects file metadata and then:

1. reads text files into prompt text
2. converts images to data URLs when small enough
3. marks PDFs as attached but not text-extracted in this build

### Project preprocessing

`buildProjectContext` converts project name, description, instructions, context, tags, files, and suggested prompts into one text block.

### History preprocessing

`serializeHistory` normalizes both REST-style history entries and room-style `parts` entries into a simple role/content form.

## Output Parsing

Two output styles are used:

### Free-form text

Used for regular chat replies.

### JSON-only output

Used by helper tasks and internal AI utilities such as:

1. smart replies
2. sentiment
3. grammar
4. memory extraction
5. insight generation

`parseJsonFromText` is defensive.

It tries to extract:

1. an object block
2. an array block
3. or the full text

Then it parses JSON and falls back safely if parsing fails.

## Token Handling

Token usage is normalized across providers.

Examples:

1. OpenAI-like providers expose `prompt_tokens`
2. Gemini exposes `promptTokenCount`

The service converts both into one stable shape:

```js
{
  promptTokens,
  completionTokens,
  totalTokens
}
```

This is why the route and model layer can stay provider-agnostic.

## Error Handling And Retry Strategy

`normalizeAiError` classifies errors into categories such as:

1. rate limit
2. invalid or removed model
3. provider credit exhaustion
4. network failure
5. retryable server failure

`runModelPromptWithFallback` then:

1. chooses the primary model
2. builds a ranked attempt chain
3. tries each model
4. logs failure metadata
5. retries only when the error is classified as retryable

This makes the feature resilient without hiding all operational detail, because fallback state is also returned and stored.

## Cost Optimization

The service layer already includes cost-aware patterns:

1. auto-routing can prefer smaller models for easier tasks
2. JSON tasks use smaller completion-token budgets
3. history is clipped to recent turns
4. file text is truncated
5. project file injection is capped
6. only a few memories are injected

## Database Write Side Effects

After a successful reply, the route calls:

1. `upsertMemoryEntries`
2. `markMemoriesUsed`
3. `refreshConversationInsight`

This means one user request improves future requests.

The backend becomes smarter over time because each successful chat can enrich memory and insights.

## End-To-End Service Flow

```text
[Route]
   |
   +--> retrieveRelevantMemories
   +--> getConversationInsight
   +--> buildAttachmentPayload
   +--> buildProjectContext
   +--> buildPrompt
   +--> resolveTaskModel
   +--> run provider request
   +--> normalize usage
   +--> return response
   |
   +--> upsertMemoryEntries
   +--> markMemoriesUsed
   +--> refreshConversationInsight
```

## Real Example

User request:

```json
{
  "message": "Explain this JSON file and keep it simple",
  "modelId": "auto",
  "attachment": {
    "fileUrl": "/api/uploads/sample.json",
    "fileName": "sample.json",
    "fileType": "application/json",
    "fileSize": 1200
  }
}
```

What the service layer does:

1. loads recent memories
2. loads prior insight if the conversation exists
3. reads the JSON file text
4. estimates complexity as at least medium because a file is attached
5. auto-selects a model
6. constructs the final prompt
7. calls the provider
8. normalizes token usage
9. returns reply metadata

## Edge Cases

1. no provider models configured -> fallback response path is used
2. model removed by provider -> classified and retried with another model
3. invalid attachment metadata -> blocked before model call
4. JSON helper returns messy text -> parser falls back safely
5. insight refresh fails -> chat still succeeds
6. memory extraction fails -> deterministic path still works

## Why This Design Works

It separates concerns clearly:

1. routes handle HTTP
2. services handle AI behavior
3. models handle persistence
4. middleware handles limits and auth

That separation is the reason the backend can support multiple AI features without duplicating AI logic in every route.

## Function Map For Quick Navigation

If you are reading the service code directly, these functions are the most important ones to follow first:

1. `resolveModel`
2. `estimatePromptComplexity`
3. `rankModelsForTask`
4. `resolveTaskModel`
5. `buildAttachmentPayload`
6. `buildProjectContext`
7. `buildPrompt`
8. `runModelPromptWithFallback`
9. `getJsonFromModel`
10. `sendMessage`

That order mirrors the real execution path from context building to provider response.

## Provider Flow Example

```text
sendMessage
  ->
buildPrompt
  ->
runModelPromptWithFallback
  ->
resolveTaskModel
  ->
executeModelRequest
  ->
provider adapter
  ->
extract text and usage
  ->
return normalized result
```

## Why JSON Helpers Matter To Solo Chat Too

Even though solo chat returns free-form text, the same service layer also supports JSON tasks used by:

1. memory extraction
2. conversation insights
3. helper endpoints

That means improving the shared service improves many features at once.

## Common Failure Patterns

### Pattern 1

The selected model exists in the UI but fails at runtime because the provider catalog changed.

### Pattern 2

Attachment metadata is valid, but file text extraction adds too much prompt content and changes routing complexity.

### Pattern 3

A prompt template change makes a helper route's JSON output less stable.

### Pattern 4

The AI call succeeds, but later memory or insight refresh work fails.

The route handles that by preserving the main chat success.

## Optimization Checklist

If cost or latency grows, inspect:

1. history size
2. attachment size
3. project file usage
4. number of memory entries injected
5. insight summary length
6. chosen provider and model

## Practical Summary

The service layer is where the backend stops being an Express app and starts behaving like an AI orchestration system.

## Extra Practical Advice

If you ever need to change response quality, start by checking:

1. prompt template quality
2. memory retrieval quality
3. project-context size
4. model routing choices

Those factors usually matter more than route code changes.

## Small Design Insight

This service layer is powerful because it centralizes the parts of AI behavior that are expensive, unstable, and provider-dependent.

## Extra FAQ

### Why is prompt building centralized

So every feature does not reinvent prompt assembly differently.

### Why does the same service support both text and JSON tasks

Because many AI features differ mainly in output format, not in core provider orchestration.

## Closing Note

This layer is the backend's AI brainstem: not the whole product, but the shared path many AI requests must pass through.

## Tiny FAQ

### Where should a new AI helper feature usually start

In this service layer, not in a brand new provider-specific route.

### Why

Because reuse is the main strength of the current architecture.

## Final Mini Checklist

When evaluating this service layer, ask:

1. is prompt assembly clear
2. is routing explainable
3. is provider behavior normalized
4. is fallback safe
5. is token usage surfaced cleanly

Those are the core quality checks for this layer.

## Final Closing Thought

If this layer stays clean and reusable, the rest of the AI feature set stays much easier to evolve.

## Final Tiny Reminder

Shared orchestration logic is what keeps multi-feature AI backends maintainable over time.

## Extra Closing Checklist

1. inspect prompt construction
2. inspect routing choice
3. inspect provider response
4. inspect normalized usage
5. inspect fallback state

Those five points explain most service-layer AI behavior.

## Last Note

When this layer is healthy, the rest of solo chat usually feels healthy too.

That is why service-layer clarity pays off across the whole feature.
