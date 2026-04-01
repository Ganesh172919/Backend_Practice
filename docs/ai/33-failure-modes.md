# 33. Failure Modes

## Purpose

This document catalogs the main ways the AI backend can fail and what the current system does in each case.

## Provider Outage

Effects:

- solo chat may retry across multiple models/providers and finally return `503`
- helper endpoints may degrade to deterministic fallback
- room AI may store a generic AI error message in the room transcript

## Bad Attachments

Effects:

- invalid metadata is rejected before model invocation
- unsupported MIME types are rejected at upload time or attachment-validation time
- PDFs are accepted but only weakly represented in prompts

## Stale Insights

Effects:

- cached insight may be used even when transcript changed recently
- prompt context may lag behind current conversation
- room/global insights are especially vulnerable if refreshes fail silently

## Memory Misses

Effects:

- prompt loses durable user context
- no hard error occurs; the model simply answers without memory help

## Quota Exhaustion

Effects:

- REST helper endpoints return `429`
- `/api/chat` returns `429` from quota middleware
- `trigger_ai` emits a socket error and stops before provider invocation

## Drift

The repo contains a `dist/` tree that reflects a materially different AI backend. Failure investigations can go wrong if engineers read `dist/` and assume the same schemas or payloads exist in source.

## Duplicate Writes

Potential sources:

- client retries after timeout
- socket retries on unstable networks
- lack of idempotency keys for solo or room AI

## Rebuild Notes

1. distinguish soft fallback from hard failure in observability
2. add idempotency or dedupe for AI actions
3. make insight freshness explicit

