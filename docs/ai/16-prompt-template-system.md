# 16. Prompt Template System

## Purpose

This document explains default prompt templates, database overrides, interpolation rules, and initial room prompt seeding.

## Relevant Files

- `services/promptCatalog.js`
- `models/PromptTemplate.js`
- `routes/admin.js`
- `models/Room.js`

## Default Template Keys

The live source defines defaults for:

- `solo-chat`
- `group-chat`
- `memory-extract`
- `conversation-insight`
- `smart-replies`
- `sentiment`
- `grammar`

## How Lookup Works

`getPromptTemplate(key)`:

1. queries `PromptTemplate.findOne({ key, isActive: true })`
2. if found, returns DB content
3. otherwise falls back to `DEFAULT_PROMPTS[key]`
4. otherwise returns `null`

There is no in-memory cache in source.

## Interpolation

`interpolatePrompt(content, variables)` replaces:

```text
{{variableName}}
```

with the corresponding string value, or empty string if absent.

Used today for:

- `roomName` in `group-chat`

## Initial Room History

`buildInitialRoomHistory(roomName)` seeds new rooms with two entries:

1. a `user` role message containing the interpolated room prompt
2. a `model` role acknowledgement

This seed becomes the base of `Room.aiHistory`.

## DB Override Behavior

Prompt override documents store:

- `key`
- `version`
- `description`
- `content`
- `isActive`

Source behavior is simple: one active row per key is effectively assumed.

## Risks

- there is no approval workflow for prompt edits
- there is no prompt history beyond whatever MongoDB retains in document timestamps
- prompt changes affect live behavior immediately on next lookup

## `dist/` Drift Notes

`dist/services/promptCatalog.service.js` differs in key ways:

- maintains an in-memory template cache
- supports versioned `key_version` upserts
- builds initial room history as `system` and `assistant` text objects, not Gemini-style `parts`

## Rebuild Notes

1. decide whether templates are configuration or versioned product artifacts
2. add cache invalidation or explicit refresh semantics
3. record which prompt version was used by each AI write path

