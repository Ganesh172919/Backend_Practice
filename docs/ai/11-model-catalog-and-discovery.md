# 11. Model Catalog and Discovery

## Table of Contents
1. [Purpose](#purpose)
2. [Relevant Source Files and Line References](#relevant-source-files-and-line-references)
3. [Architecture Overview](#architecture-overview)
4. [Provider Model Definitions](#provider-model-definitions)
5. [Runtime Catalog State](#runtime-catalog-state)
6. [Catalog Refresh Mechanism](#catalog-refresh-mechanism)
7. [Provider-Specific Catalog Fetching](#provider-specific-catalog-fetching)
8. [Model Filtering and Normalization](#model-filtering-and-normalization)
9. [getAvailableModels Function](#getavailablemodels-function)
10. [resolveModel Function](#resolvemodel-function)
11. [Configuration and Environment Variables](#configuration-and-environment-variables)
12. [Request and Response Examples](#request-and-response-examples)
13. [Database Update Points](#database-update-points)
14. [Failure Cases and Recovery](#failure-cases-and-recovery)
15. [Scaling and Operational Implications](#scaling-and-operational-implications)
16. [Inconsistencies, Risks, and Improvement Areas](#inconsistencies-risks-and-improvement-areas)
17. [How to Rebuild From Scratch](#how-to-rebuild-from-scratch)

---

## Purpose

The Model Catalog and Discovery subsystem maintains a live, provider-agnostic registry of all available AI models across six supported providers: OpenRouter, Google Gemini, xAI Grok, Together AI, Groq, and Hugging Face. It dynamically fetches model lists from provider APIs at startup and on a configurable TTL schedule, normalizes them into a unified schema, and exposes functions (`getAvailableModels`, `resolveModel`) that the rest of the AI pipeline uses to discover, select, and route requests to specific models. This is the foundational layer upon which auto-routing, fallback chains, and provider adapters operate.

Without this subsystem, the AI system would have no way to know what models exist, which providers are configured, or how to resolve a requested model ID to an executable provider adapter.

---

## Relevant Source Files and Line References

| File | Lines | Description |
|------|-------|-------------|
| `services/gemini.js` | 10-29 | `DEFAULT_OPENROUTER_MODELS` array (18 models) |
| `services/gemini.js` | 31-43 | `DEFAULT_GEMINI_MODELS` array (11 models) |
| `services/gemini.js` | 45-58 | `DEFAULT_TOGETHER_MODELS` array (12 models) |
| `services/gemini.js` | 60-71 | `DEFAULT_GROQ_MODELS` array (10 models) |
| `services/gemini.js` | 73-89 | Default model constants, API key resolution, TTL config |
| `services/gemini.js` | 92-100 | `runtimeModelCatalog` state object |
| `services/gemini.js` | 227-260 | `parseConfiguredModels`, `dedupeModels`, `prettyModelLabel` |
| `services/gemini.js` | 270-301 | `withProviderMetadata`, `getConfiguredProviderModels`, `normalizeCatalogModels` |
| `services/gemini.js` | 303-358 | Provider-specific model filtering predicates |
| `services/gemini.js` | 360-450 | `fetchOpenRouterCatalog`, `fetchTogetherCatalog`, `fetchGroqCatalog`, `fetchGrokCatalog`, `fetchGeminiCatalog` |
| `services/gemini.js` | 452-493 | `refreshModelCatalogs` orchestrator |
| `services/gemini.js` | 495-558 | `getAvailableModels` aggregator |
| `services/gemini.js` | 560-573 | `resolveModel` resolver |
| `services/gemini.js` | 1373-1375 | Startup catalog refresh trigger |
| `services/gemini.js` | 1377-1386 | Module exports |

---

## Architecture Overview

```mermaid
graph TB
    subgraph "Startup"
        A[Process Start] --> B{Any API Keys Configured?}
        B -->|Yes| C[refreshModelCatalogs]
        B -->|No| D[No catalog fetch]
    end

    subgraph "Catalog Refresh via Promise.all"
        C --> E[fetchOpenRouterCatalog]
        C --> F[fetchGeminiCatalog]
        C --> G[fetchGrokCatalog]
        C --> H[fetchTogetherCatalog]
        C --> I[fetchGroqCatalog]
        E --> J[Filter + Normalize]
        F --> J
        G --> J
        H --> J
        I --> J
    end

    subgraph "Runtime State - runtimeModelCatalog"
        J --> K[openrouter: [...]]
        J --> L[gemini: [...]]
        J --> M[grok: [...]]
        J --> N[together: [...]]
        J --> O[groq: [...]]
    end

    subgraph "Consumers"
        K --> P[getAvailableModels]
        L --> P
        M --> P
        N --> P
        O --> P
        P --> Q[resolveModel]
        Q --> R[runModelPromptWithFallback]
        Q --> S[resolveTaskModel]
    end
```

The catalog operates as an in-memory cache (`runtimeModelCatalog`) populated at startup and refreshed on a TTL basis. All consumers query through `getAvailableModels`, which merges cached data with configured defaults and applies deduplication.

---

## Provider Model Definitions

### Default OpenRouter Models (18 entries)

```javascript
// services/gemini.js:10-29
const DEFAULT_OPENROUTER_MODELS = [
  { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini', supportsFiles: true },
  { id: 'openai/gpt-5.4', label: 'GPT-5.4', supportsFiles: true },
  { id: 'openai/gpt-5.2', label: 'GPT-5.2', supportsFiles: true },
  { id: 'openai/gpt-5.2-chat', label: 'GPT-5.2 Chat', supportsFiles: true },
  { id: 'anthropic/claude-opus-4.6', label: 'Claude Opus 4.6', supportsFiles: true },
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', supportsFiles: true },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', supportsFiles: true },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', supportsFiles: true },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', supportsFiles: true },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', supportsFiles: true },
  { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', supportsFiles: true },
  { id: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek Chat V3.1', supportsFiles: true },
  { id: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5', supportsFiles: true },
  { id: 'qwen/qwen3.5-27b', label: 'Qwen 3.5 27B', supportsFiles: true },
  { id: 'qwen/qwen3-coder', label: 'Qwen 3 Coder', supportsFiles: true },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct', supportsFiles: true },
  { id: 'mistralai/mistral-large-2512', label: 'Mistral Large 2512', supportsFiles: true },
  { id: 'mistralai/mistral-small-3.2-24b-instruct', label: 'Mistral Small 3.2 24B', supportsFiles: true },
];
```

OpenRouter serves as the primary multi-provider gateway, offering access to models from OpenAI, Anthropic, Google, DeepSeek, Moonshot, Qwen, Meta, and Mistral -- all through a single API endpoint with unified authentication.

### Default Gemini Models (11 entries)

```javascript
// services/gemini.js:31-43
const DEFAULT_GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', supportsFiles: true },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', supportsFiles: true },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', supportsFiles: true },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', supportsFiles: true },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', supportsFiles: true },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', supportsFiles: true },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', supportsFiles: true },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', supportsFiles: true },
  { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview', supportsFiles: true },
  { id: 'gemini-flash-latest', label: 'Gemini Flash Latest', supportsFiles: true },
  { id: 'gemini-pro-latest', label: 'Gemini Pro Latest', supportsFiles: true },
];
```

### Default Together AI Models (12 entries)

```javascript
// services/gemini.js:45-58
const DEFAULT_TOGETHER_MODELS = [
  { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Instruct Turbo', supportsFiles: true },
  { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', label: 'Meta Llama 3.1 70B Instruct Turbo', supportsFiles: true },
  { id: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', label: 'Llama 4 Maverick 17B FP8', supportsFiles: true },
  { id: 'deepseek-ai/DeepSeek-V3.1', label: 'DeepSeek V3.1', supportsFiles: true },
  { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1', supportsFiles: true },
  { id: 'moonshotai/Kimi-K2.5', label: 'Kimi K2.5', supportsFiles: true },
  { id: 'Qwen/Qwen3.5-397B-A17B', label: 'Qwen 3.5 397B', supportsFiles: true },
  { id: 'Qwen/Qwen3-Coder-Next-FP8', label: 'Qwen 3 Coder Next FP8', supportsFiles: true },
  { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B Instruct Turbo', supportsFiles: true },
  { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', label: 'Mixtral 8x22B Instruct v0.1', supportsFiles: true },
  { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B Instruct v0.1', supportsFiles: true },
  { id: 'google/gemma-3n-E4B-it', label: 'Gemma 3N E4B IT', supportsFiles: true },
];
```

### Default Groq Models (10 entries)

```javascript
// services/gemini.js:60-71
const DEFAULT_GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', supportsFiles: true },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', supportsFiles: true },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B', supportsFiles: true },
  { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B', supportsFiles: true },
  { id: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2 Instruct', supportsFiles: true },
  { id: 'moonshotai/kimi-k2-instruct-0905', label: 'Kimi K2 Instruct 0905', supportsFiles: true },
  { id: 'groq/compound', label: 'Groq Compound', supportsFiles: true },
  { id: 'groq/compound-mini', label: 'Groq Compound Mini', supportsFiles: true },
  { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B', supportsFiles: true },
  { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B', supportsFiles: true },
];
```

### Single-Model Providers

```javascript
// services/gemini.js:73-75
const DEFAULT_HUGGINGFACE_MODEL = 'meta-llama/Llama-3.1-8B-Instruct:cerebras';
const DEFAULT_GROK_MODEL = 'grok-2-latest';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
```

Hugging Face and Grok each support a single default model. Grok also falls back to `GROK_API_KEY` or `XAI_API_KEY` environment variables (line 76).

---

## Runtime Catalog State

```javascript
// services/gemini.js:92-100
const runtimeModelCatalog = {
  openrouter: null,
  gemini: null,
  grok: null,
  together: null,
  groq: null,
  lastRefreshedAt: 0,
  refreshPromise: null,
};
```

| Field | Type | Description |
|-------|------|-------------|
| `openrouter` | `Array<Model> \| null` | Cached OpenRouter models from API fetch |
| `gemini` | `Array<Model> \| null` | Cached Gemini models from API fetch |
| `grok` | `Array<Model> \| null` | Cached Grok models from API fetch |
| `together` | `Array<Model> \| null` | Cached Together AI models from API fetch |
| `groq` | `Array<Model> \| null` | Cached Groq models from API fetch |
| `lastRefreshedAt` | `number` | Unix timestamp (ms) of last successful refresh |
| `refreshPromise` | `Promise \| null` | In-flight refresh promise for deduplication |

The `refreshPromise` field implements a **promise deduplication pattern**: if multiple callers trigger a refresh simultaneously, only one actual fetch occurs, and all callers await the same promise. This prevents thundering-herd API calls to providers.

---

## Catalog Refresh Mechanism

### TTL Configuration

```javascript
// services/gemini.js:82
const MODEL_CATALOG_TTL_MS = Math.max(5 * 60 * 1000, Number(process.env.MODEL_CATALOG_TTL_MS || 30 * 60 * 1000));
```

The TTL defaults to **30 minutes** (1,800,000ms) with a floor of **5 minutes** (300,000ms). Even if `MODEL_CATALOG_TTL_MS` is set to a value below 5 minutes, the `Math.max` guard prevents excessively frequent API calls.

### Refresh Orchestration

```javascript
// services/gemini.js:452-493
async function refreshModelCatalogs(options = {}) {
  const force = options.force === true;
  const isFresh = !force && runtimeModelCatalog.lastRefreshedAt > 0
    && (Date.now() - runtimeModelCatalog.lastRefreshedAt) < MODEL_CATALOG_TTL_MS;

  if (isFresh) {
    return getAvailableModels({ includeFallback: false });
  }

  if (runtimeModelCatalog.refreshPromise) {
    return runtimeModelCatalog.refreshPromise;
  }

  runtimeModelCatalog.refreshPromise = (async () => {
    const tasks = [];

    if (process.env.OPENROUTER_API_KEY) {
      tasks.push(fetchOpenRouterCatalog().then((models) => {
        runtimeModelCatalog.openrouter = models;
      }).catch(() => {}));
    }
    // ... similar for gemini, grok, together, groq

    await Promise.all(tasks);
    runtimeModelCatalog.lastRefreshedAt = Date.now();
    return getAvailableModels({ includeFallback: false });
  })()
    .finally(() => {
      runtimeModelCatalog.refreshPromise = null;
    });

  return runtimeModelCatalog.refreshPromise;
}
```

**Key behaviors:**
1. **Freshness check**: If the catalog was refreshed within the TTL window and `force` is not set, returns immediately.
2. **Promise deduplication**: If a refresh is already in progress, returns the existing promise.
3. **Parallel fetches**: All provider fetches run concurrently via `Promise.all`.
4. **Graceful degradation**: Each provider fetch has its own `.catch(() => {})`, so a single provider failure does not block others.
5. **Cleanup**: The `finally` block resets `refreshPromise` to `null` regardless of success or failure.

### Startup Trigger

```javascript
// services/gemini.js:1373-1375
if (process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || GROK_API_KEY || TOGETHER_API_KEY || GROQ_API_KEY) {
  void refreshModelCatalogs().catch(() => {});
}
```

Catalog refresh fires asynchronously at module load time if any provider API key is configured. The `void` keyword and `.catch(() => {})` ensure the startup is non-blocking and failures are silently swallowed.

---

## Provider-Specific Catalog Fetching

### OpenRouter Catalog

```javascript
// services/gemini.js:360-374
async function fetchOpenRouterCatalog() {
  const payload = await fetchProviderJson('https://openrouter.ai/api/v1/models');
  return normalizeCatalogModels(
    (payload?.data || [])
      .filter(isSupportedOpenRouterModel)
      .map((model) => ({
        id: model.id,
        label: model.name || prettyModelLabel(model.id),
        supportsFiles: Array.isArray(model?.architecture?.input_modalities)
          ? model.architecture.input_modalities.includes('file') || model.architecture.input_modalities.includes('image')
          : false,
      })),
    'openrouter'
  );
}
```

**Endpoint**: `GET https://openrouter.ai/api/v1/models` (no auth required for model listing)
**Filtering**: Only models with `text` in `architecture.output_modalities` are included (`isSupportedOpenRouterModel`, lines 314-320).
**File support**: Determined by checking `architecture.input_modalities` for `file` or `image`.

### Gemini Catalog

```javascript
// services/gemini.js:434-450
async function fetchGeminiCatalog() {
  const payload = await fetchProviderJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(process.env.GEMINI_API_KEY || '')}`
  );
  return normalizeCatalogModels(
    (payload?.models || [])
      .filter((model) => isSupportedGeminiModel(model.name, model))
      .map((model) => {
        const id = String(model.name || '').replace(/^models\//, '');
        return {
          id,
          label: model.displayName || prettyModelLabel(id),
          supportsFiles: /gemini|gemma-3n/i.test(id),
        };
      }),
    'gemini',
    '(Gemini Direct)'
  );
}
```

**Endpoint**: `GET https://generativelanguage.googleapis.com/v1beta/models?key=...`
**Filtering**: Only models with `generateContent` in `supportedGenerationMethods` and excluding embedding, imagen, veo, lyria, aqa, robotics, deep-research, computer-use, tts, audio, and live models (lines 343-358).
**File support**: Regex-based check for `gemini` or `gemma-3n` in the model ID.

### Groq Catalog

```javascript
// services/gemini.js:400-415
async function fetchGroqCatalog() {
  const payload = await fetchProviderJson('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
  });
  return normalizeCatalogModels(
    (payload?.data || [])
      .filter((model) => model?.active !== false && isSupportedGroqModel(model.id))
      .map((model) => ({
        id: model.id,
        label: prettyModelLabel(model.id),
        supportsFiles: false,
      })),
    'groq',
    '(Groq)'
  );
}
```

**Endpoint**: `GET https://api.groq.com/openai/v1/models`
**Filtering**: Excludes models with `active: false` and those matching whisper, prompt-guard, safeguard, orpheus, allam patterns (lines 334-341).
**File support**: Always `false` for Groq models.

### Together AI Catalog

```javascript
// services/gemini.js:376-398
async function fetchTogetherCatalog() {
  const payload = await fetchProviderJson('https://api.together.xyz/v1/models', {
    headers: { Authorization: `Bearer ${TOGETHER_API_KEY}` },
  });
  // Filters for chat type, excludes whisper/image/video/flux/sora/veo/imagen
}
```

**Endpoint**: `GET https://api.together.xyz/v1/models`
**Filtering**: Only `chat` type models, excluding whisper, image, video, flux, sora, veo, imagen (lines 322-332).
**File support**: Regex check for `vl`, `vision`, `image`, or `gemma-3n` in the model ID.

### Grok Catalog

```javascript
// services/gemini.js:417-432
async function fetchGrokCatalog() {
  const payload = await fetchProviderJson('https://api.x.ai/v1/models', {
    headers: { Authorization: `Bearer ${GROK_API_KEY}` },
  });
  return normalizeCatalogModels(
    (payload?.data || [])
      .filter((model) => model?.id && !String(model.id).toLowerCase().includes('vision'))
      .map((model) => ({
        id: model.id,
        label: prettyModelLabel(model.id),
        supportsFiles: true,
      })),
    'grok',
    '(Grok Direct)'
  );
}
```

**Endpoint**: `GET https://api.x.ai/v1/models`
**Filtering**: Excludes models with `vision` in the ID.
**File support**: Always `true`.

---

## Model Filtering and Normalization

### Provider Filtering Predicates

| Provider | Function | Lines | Exclusion Patterns |
|----------|----------|-------|-------------------|
| OpenRouter | `isSupportedOpenRouterModel` | 314-320 | Models without `text` in `output_modalities` |
| Together | `isSupportedTogetherModel` | 322-332 | whisper, image, video, flux, sora, veo, imagen |
| Groq | `isSupportedGroqModel` | 334-341 | whisper, prompt-guard, safeguard, orpheus, allam |
| Gemini | `isSupportedGeminiModel` | 343-358 | embedding, imagen, veo, lyria, aqa, robotics, deep-research, computer-use, tts, audio, live |
| Grok | inline filter | 423 | vision models |

### Normalization Pipeline

```javascript
// services/gemini.js:289-301
function normalizeCatalogModels(models, provider, labelSuffix = '') {
  return withProviderMetadata(
    models
      .filter((model) => model?.id)
      .map((model) => ({
        id: model.id,
        label: model.label || prettyModelLabel(model.id),
        supportsFiles: Boolean(model.supportsFiles),
      })),
    provider,
    labelSuffix
  );
}
```

The normalization pipeline:
1. Filters out entries without an `id`.
2. Maps each model to the unified schema, deriving `label` from `prettyModelLabel` if not provided.
3. Coerces `supportsFiles` to boolean.
4. Applies `withProviderMetadata` to attach the `provider` field and optional label suffix.

### Label Generation

```javascript
// services/gemini.js:262-268
function prettyModelLabel(modelId) {
  return String(modelId || '')
    .split('/')
    .pop()
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
```

Converts `meta-llama/llama-3.3-70b-instruct` to `Llama 3.3 70b Instruct` by taking the last path segment, replacing hyphens/underscores with spaces, and title-casing.

### Deduplication

```javascript
// services/gemini.js:251-260
function dedupeModels(models) {
  const seen = new Set();
  return models.filter((model) => {
    if (!model?.id || seen.has(model.id)) {
      return false;
    }
    seen.add(model.id);
    return true;
  });
}
```

Deduplication is by `id` only. If the same model appears from multiple sources (e.g., `gemini-2.5-flash` from both OpenRouter and Gemini direct), the first occurrence wins.

### Environment-Configured Model Parsing

```javascript
// services/gemini.js:227-249
function parseConfiguredModels(raw, provider) {
  return String(raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [idPart, labelPart] = entry.includes('=') ? entry.split('=') : [entry, ''];
      const id = String(idPart || '').trim();
      const label = String(labelPart || '').trim() || id.split('/').slice(-1)[0].replace(/[-_]/g, ' ');
      return { id, provider, label, supportsFiles: true };
    })
    .filter(Boolean);
}
```

Supports two formats:
- `model-id-1, model-id-2` -- labels auto-generated
- `model-id-1=Custom Label, model-id-2=Another Label` -- explicit labels

---

## getAvailableModels Function

```javascript
// services/gemini.js:495-558
function getAvailableModels(options = {}) {
  const includeFallback = options.includeFallback !== false;
  const models = [];

  if (process.env.OPENROUTER_API_KEY) {
    models.push(
      ...(runtimeModelCatalog.openrouter
        || getConfiguredProviderModels('openrouter', process.env.OPENROUTER_MODELS, DEFAULT_OPENROUTER_MODELS))
    );
  }
  // ... similar for each provider

  if (models.length === 0 && includeFallback) {
    models.push({
      id: 'fallback/offline',
      provider: 'fallback',
      label: 'Offline fallback',
      supportsFiles: true,
    });
  }

  return dedupeModels(models);
}
```

**Resolution order** for each provider:
1. **Live catalog** (`runtimeModelCatalog.<provider>`) -- if the API fetch succeeded.
2. **Environment-configured models** (`process.env.OPENROUTER_MODELS`, etc.) -- parsed from comma-separated string.
3. **Hardcoded defaults** (`DEFAULT_OPENROUTER_MODELS`, etc.) -- fallback when no env config exists.

**Fallback entry**: If no providers are configured and `includeFallback !== false`, a synthetic `fallback/offline` model is returned. This ensures the system never returns an empty model list, allowing graceful degradation.

---

## resolveModel Function

```javascript
// services/gemini.js:560-573
function resolveModel(requestedModelId, options = {}) {
  const models = getAvailableModels(options);
  if (models.length === 0) {
    return null;
  }

  const requested = models.find((model) => model.id === requestedModelId);
  if (requested) {
    return requested;
  }

  const defaultModel = models.find((model) => model.id === MODEL_NAME);
  return defaultModel || models[0];
}
```

**Resolution logic:**
1. If `requestedModelId` exactly matches a model in the catalog, return it.
2. Otherwise, fall back to the globally configured `MODEL_NAME` (resolved from env var cascade).
3. If neither matches, return the first available model.
4. If no models exist at all, return `null`.

### Default Model Resolution Chain

```javascript
// services/gemini.js:84-89
const MODEL_NAME = process.env.DEFAULT_AI_MODEL
  || process.env.OPENROUTER_DEFAULT_MODEL
  || process.env.TOGETHER_MODEL
  || process.env.GROQ_MODEL
  || process.env.GEMINI_MODEL
  || DEFAULT_GEMINI_MODEL;
```

The default model cascades through environment variables in priority order, ultimately falling back to `gemini-2.5-flash`.

---

## Configuration and Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `OPENROUTER_API_KEY` | `string` | `''` | Enables OpenRouter provider |
| `GEMINI_API_KEY` | `string` | `''` | Enables Gemini provider |
| `GROK_API_KEY` | `string` | `''` | Enables Grok provider (also checks `XAI_API_KEY`) |
| `TOGETHER_API_KEY` | `string` | `''` | Enables Together AI provider |
| `GROQ_API_KEY` | `string` | `''` | Enables Groq provider |
| `HUGGINGFACE_API_KEY` | `string` | `''` | Enables Hugging Face provider |
| `OPENROUTER_MODELS` | `string` | `''` | Comma-separated model list override |
| `GEMINI_MODELS` | `string` | `''` | Comma-separated model list override |
| `TOGETHER_MODELS` | `string` | `''` | Comma-separated model list override |
| `GROQ_MODELS` | `string` | `''` | Comma-separated model list override |
| `MODEL_CATALOG_TTL_MS` | `number` | `1800000` | Catalog refresh interval (min: 300000) |
| `DEFAULT_AI_MODEL` | `string` | `''` | Primary default model override |
| `OPENROUTER_DEFAULT_MODEL` | `string` | `''` | OpenRouter-specific default |
| `TOGETHER_MODEL` | `string` | `''` | Together AI default model |
| `GROQ_MODEL` | `string` | `''` | Groq default model |
| `GEMINI_MODEL` | `string` | `''` | Gemini default model |
| `HUGGINGFACE_MODEL` | `string` | `meta-llama/Llama-3.1-8B-Instruct:cerebras` | Hugging Face model ID |

---

## Request and Response Examples

### Example: getAvailableModels Output

When all providers are configured and catalogs are fetched:

```json
[
  {
    "id": "openai/gpt-5.4-mini",
    "label": "GPT-5.4 Mini",
    "provider": "openrouter",
    "supportsFiles": true
  },
  {
    "id": "anthropic/claude-opus-4.6",
    "label": "Claude Opus 4.6",
    "provider": "openrouter",
    "supportsFiles": true
  },
  {
    "id": "gemini-2.5-flash",
    "label": "Gemini 2.5 Flash",
    "provider": "gemini",
    "supportsFiles": true
  },
  {
    "id": "grok-2-latest",
    "label": "Grok 2 Latest",
    "provider": "grok",
    "supportsFiles": true
  },
  {
    "id": "llama-3.3-70b-versatile",
    "label": "Llama 3.3 70B Versatile",
    "provider": "groq",
    "supportsFiles": false
  }
]
```

### Example: resolveModel with Explicit ID

```javascript
resolveModel('openai/gpt-5.4-mini');
// Returns: { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini', provider: 'openrouter', supportsFiles: true }
```

### Example: resolveModel with Unknown ID (falls back to default)

```javascript
resolveModel('nonexistent-model');
// Returns: { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini', supportsFiles: true }
// (assuming MODEL_NAME resolves to gemini-2.5-flash)
```

### Example: resolveModel with No Models Available

```javascript
// No API keys configured
resolveModel('anything');
// Returns: { id: 'fallback/offline', provider: 'fallback', label: 'Offline fallback', supportsFiles: true }
```

---

## Database Update Points

The model catalog subsystem is **purely in-memory** and does not interact with any database collections. All model data lives in the `runtimeModelCatalog` object and is reconstructed on each process restart.

The only database-adjacent component is the `PromptTemplate` model, which is used by the prompt catalog (documented separately). The model catalog itself has no persistence layer.

**Implication**: If the process restarts, the catalog must be re-fetched from provider APIs. There is no warm cache. This is acceptable given the 30-minute TTL and the fact that startup fetches are non-blocking.

---

## Failure Cases and Recovery

### Failure Case Matrix

| Scenario | Behavior | Recovery |
|----------|----------|----------|
| No API keys configured | `getAvailableModels` returns `[{ id: 'fallback/offline', ... }]` | Configure at least one provider API key |
| Single provider API unreachable | That provider's catalog entry remains `null`; `getAvailableModels` falls back to defaults | Provider defaults are always available; system continues operating |
| All provider APIs unreachable | All catalog entries remain `null`; defaults used for all providers | Defaults provide reasonable model lists; system operates with stale data |
| Provider returns malformed response | `fetchProviderJson` catches JSON parse errors; provider catalog remains `null` | Falls back to configured defaults |
| Catalog refresh in progress and new request arrives | Returns existing `refreshPromise` (deduplication) | No duplicate API calls; all callers share the same result |
| TTL not yet elapsed but `force: true` passed | Forces immediate refresh regardless of TTL | Useful for admin-triggered catalog updates |
| `MODEL_CATALOG_TTL_MS` set below 5 minutes | `Math.max` guard enforces 5-minute minimum | Prevents accidental API rate limit exhaustion |

### Error Propagation

Individual provider fetch failures are silently swallowed (`.catch(() => {})`). This means:
- A failed OpenRouter fetch does not prevent Gemini, Groq, or other providers from populating their catalogs.
- The `lastRefreshedAt` timestamp is still updated even if some providers fail.
- There is no logging of individual provider failures within `refreshModelCatalogs` (a potential improvement).

---

## Scaling and Operational Implications

### Memory Footprint

The catalog stores approximately 65 model entries across all providers. Each entry is a small object (~100 bytes), so total memory usage is under 10KB. This is negligible.

### API Rate Limits

Each provider catalog fetch is a single GET request. At a 30-minute TTL, this results in:
- 48 fetches per day per provider
- 240 total fetches per day (5 providers)

This is well within rate limits for all providers. However, in a multi-instance deployment (e.g., Kubernetes with 10 replicas), each instance independently fetches catalogs, resulting in 2,400 fetches per day. Consider:
- Using a shared cache (Redis) for catalog data in multi-instance deployments.
- Increasing TTL to 60 minutes for stable provider catalogs.

### Horizontal Scaling

In a horizontally scaled architecture, each Node.js process maintains its own `runtimeModelCatalog`. There is no synchronization between instances. This is acceptable because:
- Model catalogs change infrequently (providers add/remove models rarely).
- The 30-minute staleness window is acceptable for model discovery.

### Cold Start Impact

On cold start, `refreshModelCatalogs` is called asynchronously. If a request arrives before the catalog is populated, `getAvailableModels` falls back to hardcoded defaults. This means:
- First requests may use stale default model lists.
- Once the async fetch completes, the live catalog takes over.
- There is no request blocking or queuing during catalog population.

---

## Inconsistencies, Risks, and Improvement Areas

### Identified Issues

1. **No logging of provider fetch failures**: The `.catch(() => {})` silently swallows errors. Operators have no visibility into which providers are failing to respond.

2. **Hugging Face does not fetch a catalog**: Unlike other providers, Hugging Face uses a single hardcoded model ID. There is no `fetchHuggingFaceCatalog` function. If the configured model becomes unavailable, there is no discovery mechanism.

3. **Grok supportsFiles is always true**: The Grok catalog sets `supportsFiles: true` for all models, but the Grok API may not actually support file uploads. This could lead to runtime errors when attachments are sent.

4. **Default model list staleness**: The hardcoded defaults (e.g., `DEFAULT_OPENROUTER_MODELS`) can become outdated as providers add, rename, or deprecate models. Without live catalog fetching, the system would serve requests to non-existent models.

5. **No model capability metadata**: The catalog only tracks `id`, `label`, `provider`, and `supportsFiles`. It does not track context window size, pricing, latency characteristics, or supported output formats -- all of which would improve auto-routing decisions.

6. **Deduplication by ID only**: If two providers offer the same model (e.g., `gemini-2.5-flash` via OpenRouter and Gemini direct), the first one wins. There is no mechanism to prefer one provider over another for the same model.

### Suggested Improvements

| Improvement | Priority | Effort | Impact |
|------------|----------|--------|--------|
| Add structured logging for provider fetch failures | High | Low | Operational visibility |
| Add model capability metadata (context window, pricing) | Medium | Medium | Better auto-routing |
| Implement shared catalog cache for multi-instance deployments | Medium | Medium | Reduced API calls |
| Add admin endpoint to force catalog refresh | Low | Low | Operational control |
| Add model health checks (periodic test requests) | Low | High | Proactive failure detection |
| Support model deprecation warnings | Low | Medium | Prevent routing to deprecated models |

---

## How to Rebuild From Scratch

If you need to rebuild the model catalog subsystem, follow these steps:

### Step 1: Define the Unified Model Schema

```javascript
const ModelSchema = {
  id: String,           // Unique identifier
  label: String,        // Human-readable name
  provider: String,     // Provider slug
  supportsFiles: Boolean,
};
```

### Step 2: Create Default Model Lists

For each provider, create a `DEFAULT_<PROVIDER>_MODELS` array with current models. These serve as the fallback when API fetching fails.

### Step 3: Implement Provider Catalog Fetchers

For each provider:
1. Identify the API endpoint that lists available models.
2. Implement a filtering predicate to exclude non-text models.
3. Map the provider's response format to the unified schema.
4. Handle authentication (API keys in headers or query params).

### Step 4: Build the Runtime Catalog State

```javascript
const runtimeModelCatalog = {
  openrouter: null,
  gemini: null,
  grok: null,
  together: null,
  groq: null,
  lastRefreshedAt: 0,
  refreshPromise: null,
};
```

### Step 5: Implement refreshModelCatalogs

- Check TTL freshness.
- Deduplicate concurrent refreshes via `refreshPromise`.
- Fetch all providers in parallel with `Promise.all`.
- Handle individual provider failures gracefully.
- Update `lastRefreshedAt` on completion.

### Step 6: Implement getAvailableModels

- For each configured provider, check: live catalog > env-configured > defaults.
- Merge all provider lists.
- Apply deduplication by `id`.
- Optionally include the `fallback/offline` synthetic model.

### Step 7: Implement resolveModel

- Exact match on `requestedModelId`.
- Fall back to `MODEL_NAME` (from env cascade).
- Fall back to first available model.
- Return `null` if no models exist.

### Step 8: Wire Up Startup Trigger

```javascript
if (anyProviderConfigured) {
  void refreshModelCatalogs().catch(() => {});
}
```

### Step 9: Export Public API

```javascript
module.exports = {
  MODEL_NAME,
  getAvailableModels,
  refreshModelCatalogs,
  resolveModel,
  // ... other exports
};
```

### Step 10: Test

- Test with no API keys (fallback behavior).
- Test with single provider (partial catalog).
- Test with all providers (full catalog).
- Test TTL freshness (no re-fetch within TTL).
- Test forced refresh (`force: true`).
- Test concurrent refresh deduplication.
- Test resolveModel with valid, invalid, and missing model IDs.
