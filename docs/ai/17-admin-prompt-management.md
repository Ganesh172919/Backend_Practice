# 17. Admin Prompt Management

## Purpose

This document explains how admins inspect and update prompt templates and what operational risk that creates.

## Relevant Files

- `routes/admin.js`
- `middleware/admin.js`
- `services/promptCatalog.js`
- `models/PromptTemplate.js`

## Endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/admin/prompts` | GET | list effective prompt templates |
| `/api/admin/prompts/:key` | PUT | create or update a prompt template |

Both endpoints require:

- auth middleware
- admin middleware

## List Behavior

`listPromptTemplates()` merges:

- source defaults
- active DB overrides
- any DB-only keys not in defaults

Each row reports `source: 'default'` or `source: 'database'`.

## Update Behavior

`PUT /api/admin/prompts/:key` requires:

- non-empty `key`
- non-empty `content`

It then calls `upsertPromptTemplate(key, payload)`, which:

- sets version from payload or default `v1`
- sets description from payload or default description
- stores content
- forces `isActive: true`

## Operational Implications

- prompt edits can immediately change solo chat, room AI, memory extraction, insights, and helper endpoints
- no code deploy is required to alter AI behavior
- bad prompt edits can degrade correctness without any schema or test failure

## Failure Modes

| Failure | Behavior |
| --- | --- |
| non-admin caller | blocked by middleware |
| missing key/content | `400` |
| DB failure | `500` |

## Risks

- no dry-run or preview mechanism exists
- no per-feature guardrail checks exist
- prompt content is free-form and can remove JSON-only instructions needed by downstream parsers

## `dist/` Drift Notes

`dist/routes/admin.routes.js` uses different endpoints:

- `GET /prompt-templates`
- `PUT /prompt-templates`

and the compiled prompt service treats versioning more formally than source.

## Rebuild Notes

1. add review, preview, and rollback for prompt changes
2. validate structured-output prompts before activation
3. record prompt version in all persisted AI artifacts

