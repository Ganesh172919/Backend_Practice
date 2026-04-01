# 13. Provider Adapters

## Purpose

This document explains how the live backend sends requests to each provider-backed model adapter.

## Relevant Files

- `services/gemini.js`

## Adapter Inventory

| Adapter function | Provider |
| --- | --- |
| `runOpenRouterRequest()` | OpenRouter |
| `runGrokRequest()` | xAI/Grok direct |
| `runHuggingFaceRequest()` | Hugging Face router |
| `runTogetherRequest()` | Together AI |
| `runGroqDirectRequest()` | Groq |
| `runGeminiRequest()` | Google Gemini direct |

## Shared Mechanics

Most adapters share these steps:

1. build system and user messages
2. attach image data when available
3. set `temperature: 0.6`
4. set operation-specific max tokens
5. parse returned content
6. parse provider usage if available

## OpenAI-Compatible Adapters

OpenRouter, Grok, Hugging Face, Together, and Groq all use the same OpenAI-like message format:

```json
[
  { "role": "system", "content": "system prompt" },
  { "role": "user", "content": "prompt text or mixed text/image parts" }
]
```

Image attachments are passed as `image_url` parts when `attachmentPayload.imageDataUrl` exists.

## Gemini Direct

Gemini direct differs:

- constructs a `GoogleGenerativeAI` model with `systemInstruction`
- builds `parts` array
- image data becomes `inlineData` with MIME type and base64
- usage comes from `response.usageMetadata`

## Provider-Specific Notes

| Provider | Notable behavior |
| --- | --- |
| OpenRouter | sends `HTTP-Referer` and `X-Title` headers |
| Grok | uses xAI chat-completions endpoint |
| Groq | treated as OpenAI-like completions |
| Together | OpenAI-like chat endpoint with its own bearer token |
| Hugging Face | OpenAI-like router endpoint |
| Gemini | direct SDK path, not HTTP fetch in the main request path |

## Attachment Handling Limits

- text-like files are read from disk and appended as extracted content
- images under 3 MB are base64-encoded for supported models
- PDFs only add a metadata note; PDF text extraction is not implemented

## Risks

- every adapter is synchronous in the request path
- retry/fallback sits above adapters, so each adapter failure can add latency before the next attempt
- only image attachments are truly multimodal; PDFs and many other files are reduced to metadata or plain text snippets

## Rebuild Notes

1. isolate each provider adapter in its own module with tests
2. unify adapter return shapes more formally
3. add per-provider capability metadata beyond `supportsFiles`

