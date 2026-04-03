# Solo AI Chat
# File 03: Route, Controller Flow, And Full Lifecycle

Primary source file:

1. `routes/chat.js`

Connected models and services:

1. `models/Conversation.js`
2. `models/Project.js`
3. `services/gemini.js`
4. `services/memory.js`
5. `services/conversationInsights.js`
6. `services/messageFormatting.js`
7. `middleware/auth.js`
8. `middleware/aiQuota.js`

## Purpose

This route is the public API entrypoint for solo AI chat.

Endpoint:

`POST /api/chat`

It solves one product problem:

let a signed-in user talk to AI while keeping context, memory, insight, file support, project support, and durable history.

## Request Flow

```text
[Client]
   |
   v
[authMiddleware]
   |
   v
[aiQuotaMiddleware]
   |
   v
[validate message + attachment]
   |
   +--> load memories
   +--> load existing insight
   +--> load existing conversation
   +--> load project
   |
   v
[sendMessage()]
   |
   v
[append user + assistant messages]
   |
   v
[Conversation.save()]
   |
   +--> upsertMemoryEntries
   +--> markMemoriesUsed
   +--> refreshConversationInsight
   |
   v
[JSON response]
```

## Step-By-Step Breakdown

### 1. Authentication

`authMiddleware` verifies the JWT access token and attaches `req.user`.

### 2. Quota check

`aiQuotaMiddleware` consumes quota before the expensive provider call.

### 3. Input validation

The route rejects:

1. missing message
2. non-string message
3. blank message
4. invalid attachment payload

### 4. Memory retrieval

It calls `retrieveRelevantMemories` with the trimmed message.

This returns the best matching user memories for personalization.

### 5. Insight retrieval

If `conversationId` exists, the route asks for `getConversationInsight`.

This gives the AI a compressed summary of the thread.

### 6. Conversation lookup

If `conversationId` is provided, the route loads:

```js
Conversation.findOne({ _id: conversationId, userId: req.user.id })
```

This is both a lookup and an ownership check.

### 7. Project lookup

The route resolves project context from:

1. request `projectId`
2. or the existing conversation's `projectId`

Then it queries:

```js
Project.findOne({ _id: resolvedProjectId, userId: req.user.id }).lean()
```

That prevents users from attaching another user's project to their chat.

### 8. AI call

The route calls `sendMessage` with:

1. history
2. current message
3. memory entries
4. insight
5. model id
6. attachment
7. project

### 9. Conversation creation or update

If no conversation exists, the route creates one.

If it exists, it appends to the same document.

### 10. Persistence

Two message entries are pushed:

1. the user message
2. the assistant message with AI metadata

### 11. Post-save enrichment

The route then:

1. stores new memories from the latest user text
2. marks used memories as used
3. refreshes conversation insight

These steps improve future responses but do not change the already-generated reply.

## Query Explanation

### Query: load conversation

```js
Conversation.findOne({ _id: conversationId, userId: req.user.id })
```

Purpose:

1. fetch the right thread
2. block unauthorized access

### Query: load project

```js
Project.findOne({ _id: resolvedProjectId, userId: req.user.id }).lean()
```

Purpose:

attach only the user's own project context.

### Query: save conversation

```js
await conversation.save()
```

Purpose:

persist the whole updated conversation thread and update `updatedAt`.

## Response Shape

Successful response includes:

1. `conversationId`
2. `content`
3. `timestamp`
4. `memoryRefs`
5. `insight`
6. `modelId`
7. `provider`
8. `requestedModelId`
9. `processingMs`
10. token usage fields
11. auto-routing flags
12. fallback flag

This is much richer than a normal chatbot API response.

## Real Example

Request:

```json
{
  "message": "Summarize the last discussion and tell me what I should do next",
  "conversationId": "67f100000000000000000001",
  "modelId": "auto"
}
```

Response:

```json
{
  "conversationId": "67f100000000000000000001",
  "role": "model",
  "content": "Here is a short summary and the next steps...",
  "memoryRefs": [
    {
      "id": "67f200000000000000000001",
      "summary": "The user prefers concise next-step lists.",
      "score": 0.79
    }
  ],
  "modelId": "openai/gpt-5.4-mini",
  "provider": "openrouter",
  "requestedModelId": "auto",
  "processingMs": 1520,
  "promptTokens": 990,
  "completionTokens": 210,
  "totalTokens": 1200,
  "autoMode": true,
  "autoComplexity": "medium",
  "fallbackUsed": false
}
```

## Error Mapping

The route keeps transport behavior stable:

1. user quota or provider rate limit -> `429`
2. AI provider temporary failure -> `503`
3. other failures -> `500`

User-friendly error text is returned so the frontend can react properly.

## Security And Guardrails

1. requires auth
2. enforces quota before AI call
3. validates attachment payloads
4. checks project ownership
5. checks conversation ownership
6. avoids letting insight-refresh failure break the core chat flow

## Debugging Tips

If this feature misbehaves, inspect:

1. `requestId` in logs
2. `modelId` and `provider` returned
3. `requestedModelId` versus actual `modelId`
4. `fallbackUsed`
5. token usage growth
6. whether `projectId` and `conversationId` belong to the same user

## Important Trade-Offs

### Good trade-off

The route saves the main conversation before optional enrichment finishes.

That increases reliability.

### Cost trade-off

This endpoint can trigger:

1. one main model call
2. memory extraction work
3. insight refresh work

That gives better quality, but it makes the backend heavier than a simple proxy.

### Scaling trade-off

The conversation is stored as one growing document.

That is simple now, but long threads can become large later.

## Transport Contract Notes

This route has a stable response contract that the frontend can rely on.

Even when the actual model changes, the response still uses the same high-level fields.

That is important because the UI should not care whether the answer came from Gemini, OpenRouter, or a fallback attempt.

## Why The Route Stays Thin

The route does not directly know how to:

1. build prompts
2. choose providers
3. parse token usage
4. retry failures

That logic lives in services on purpose.

Why this is good:

1. easier testing
2. easier reuse
3. cleaner route logic
4. less duplication

## Practical Debugging Path

When this endpoint fails, the best inspection order is:

1. input body shape
2. auth state
3. quota state
4. conversation ownership
5. project ownership
6. service-layer model routing
7. provider failure classification
8. post-save enrichment logs

## Failure Matrix

### Validation failure

Response:

`400`

### Ownership failure

Response:

`404` or `400` depending on the exact mismatch

### Quota failure

Response:

`429`

### Provider temporary failure

Response:

`503`

### Unknown server failure

Response:

`500`

That mapping is helpful because it keeps frontend behavior predictable.

## Practical Summary

The route is the entrypoint, but not the intelligence.

Its main job is to:

1. validate
2. authorize
3. orchestrate service calls
4. persist results
5. return a stable API shape

That is exactly what a well-designed controller layer should do.

## Extra Example Failure Trace

If the frontend gets a `503`, the likely chain is:

1. request validated correctly
2. quota check passed
3. provider call failed after retries
4. route mapped the AI-layer error to a stable transport response

That makes the failure understandable without exposing raw provider internals to the client.

## Practical Rule

Good controller code should make success easy to follow and failure easy to classify.

## Extra FAQ

### Why return both requested and actual model ids

To make auto-routing and fallback behavior transparent.

### Why does the route refresh insight after saving

Because the saved conversation is the source of truth for later summarization.

### Why keep the response contract rich

Because frontend features and debugging tools benefit from model, token, and latency metadata.

## Closing Note

This route is a good example of controller code that coordinates many subsystems without owning all the business logic itself.

## Tiny FAQ

### Does this route perform the actual model call logic itself

No.

It delegates that to the service layer.

### Why is that helpful

It keeps the controller understandable even though the feature behavior is complex.

## Final Mini Checklist

When reviewing this route, verify:

1. request validation
2. ownership checks
3. quota enforcement
4. stable error mapping
5. save-before-enrichment behavior

Those checks cover most controller-level correctness concerns.

## Final Closing Thought

This route is successful because it coordinates complexity without becoming the place where all complexity lives.

## Final Tiny Reminder

The route is strongest when it stays focused on flow control and leaves AI intelligence to the service layer.

## Extra Closing Checklist

1. validate request
2. enforce auth
3. enforce quota
4. check ownership
5. save conversation
6. run enrichment safely

That sequence is the controller's main responsibility in this feature.

## Last Note

Most solo-chat controller bugs are really coordination bugs, which is why this route is worth documenting carefully.

That is also why a stable controller contract matters so much for the frontend.

It keeps the request-response lifecycle understandable even as the AI internals evolve.
