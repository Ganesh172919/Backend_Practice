# 06. Model Change And API Provider Change

## Files you should know first

Backend:

- `routes/ai.js`
- `services/gemini.js`
- `routes/chat.js`
- `index.js`

Frontend:

- `..\ChatSphere\frontend\src\api\ai.ts`
- `..\ChatSphere\frontend\src\utils\aiModels.ts`
- `..\ChatSphere\frontend\src\pages\SoloChat.tsx`
- `..\ChatSphere\frontend\src\pages\GroupChat.tsx`

## What "model change" means in this project

The frontend usually sends a `modelId`.
The backend figures out which provider owns that model and how to call it.

So:

- changing the model in UI changes `modelId`
- changing the provider happens indirectly because provider is attached to model catalog entries

Example:

- `openai/gpt-5.4-mini` means provider `openrouter`
- `gemini-2.5-flash` may mean provider `gemini`
- `grok-2-latest` means provider `grok`

## Where available models come from

### Backend

`GET /api/ai/models` in `routes/ai.js`

That route:

1. calls `refreshModelCatalogs()`
2. calls `getAvailableModels({ includeFallback: false })`
3. prepends a synthetic model:
   - `id: "auto"`
   - `label: "Auto Route (task-aware)"`
   - `provider: "system"`

Then it returns:

- models
- `defaultModelId`
- whether any models are configured
- empty state message if no provider API keys exist

### Frontend

`fetchAvailableModels()` in `api/ai.ts` caches the result for 30 seconds.

## How solo chat model/provider selection works

In `SoloChat.tsx`:

- models with `id === "auto"` are filtered out
- models are grouped by provider using `getModelGroups()`
- user selects:
  - provider first
  - model second

Selections are persisted in local storage:

- `chatsphere.solo.provider`
- `chatsphere.solo.model`

When user sends a solo message, the selected model ID is passed to `/api/chat`.

## How group chat model selection works

In `GroupChat.tsx`:

- frontend keeps the full models list including `auto`
- selected model ID is stored in:
  - `chatsphere.group.model`

When user triggers room AI, that `modelId` is sent in `trigger_ai`.

So group chat supports explicit model choice and auto route.

## How the backend resolves model and provider

### `getAvailableModels()`

This builds the runtime catalog from configured providers:

- OpenRouter
- Gemini direct
- Grok direct
- Hugging Face router
- Together AI
- Groq

If nothing is configured and fallback is allowed, it returns:

- `fallback/offline`

### `resolveModel(requestedModelId)`

If the requested model exists, it returns that model.
Otherwise it returns:

- default configured model
- or first available model

### `resolveTaskModel(requestedModelId, context)`

This is the smarter route.

If the request is explicit and not `auto`, backend uses the chosen model.

If the request is `auto` or empty:

1. estimate prompt complexity
2. rank models for the task
3. select the top-ranked model

Returned routing metadata includes:

- `requestedModelId`
- `selectedModelId`
- `autoMode`
- `complexity`

## How auto routing decides

`estimatePromptComplexity()` uses:

- prompt length
- whether there is an attachment
- whether the operation is `group-chat` or `json`

Then `rankModelsForTask()` chooses preferences based on:

- operation type
- complexity
- attachment presence

## How provider calls actually happen

`executeModelRequest(...)` in `services/gemini.js` switches on `model.provider`.

### Direct request paths

- `openrouter` -> `https://openrouter.ai/api/v1/chat/completions`
- `grok` -> `https://api.x.ai/v1/chat/completions`
- `groq` -> `https://api.groq.com/openai/v1/chat/completions`
- `together` -> `https://api.together.xyz/v1/chat/completions`
- `huggingface` -> `https://router.huggingface.co/v1/chat/completions`
- otherwise -> Gemini direct through `@google/generative-ai`

### Important practical meaning

Provider change is not some separate toggle in the backend.
It happens because a model belongs to one provider.

So if frontend switches from:

- `gemini-2.5-flash`

to:

- `openai/gpt-5.4-mini`

the backend changes both:

- model
- provider execution path

## Fallback behavior

`runModelPromptWithFallback(...)` builds an attempt chain:

1. selected model
2. ranked alternative models
3. stop after configured maximum attempts

If a provider fails with a retryable error:

- model unavailable
- rate limit
- credit issue
- network issue
- 5xx failure

the backend tries another model.

Returned metadata tells you if fallback happened:

- `fallbackUsed: true/false`

## Where model metadata is saved

### Solo chat

Assistant turn in `Conversation.messages[]` stores:

- `modelId`
- `provider`
- `requestedModelId`
- token usage
- `processingMs`
- `autoMode`
- `autoComplexity`
- `fallbackUsed`

### Group chat

AI `Message` document stores:

- `modelId`
- `provider`
- `memoryRefs`

## Important limitations

- no per-user provider permission layer
- no streaming
- provider list depends on env config
- the file name `gemini.js` is misleading because it is really the multi-provider AI router

