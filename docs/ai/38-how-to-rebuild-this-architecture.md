# 38. How To Rebuild This Architecture

## Purpose

This document describes how to rebuild the same product semantics from scratch while improving structure.

## Recommended Layers

1. API adapters
2. Socket adapter
3. AI orchestration services for solo and room flows
4. Shared prompt/routing/provider layer
5. Shared memory and insight services
6. persistence layer

## Rebuild Order

1. implement core models for conversations, room messages, memories, insights, prompts, projects, and users
2. implement uploads and attachment normalization
3. implement provider adapters and catalog discovery
4. implement prompt construction and template lookup
5. implement solo chat orchestration
6. implement room AI orchestration
7. add memory extraction and retrieval
8. add insight refresh and read APIs
9. add admin prompt management
10. harden with shared quota/state and observability

## Keep These Product Semantics

- solo chat persists both user and assistant turns
- room AI persists both transcript message and prompt-facing history
- memory is user-specific and durable
- insights exist for both conversations and rooms
- prompt templates are overridable
- helper endpoints remain stateless

## Improve These Structural Weaknesses

- do not leave room AI inside bootstrap code
- do not use process-local quota for distributed deployments
- do not let prompt edits bypass validation
- do not mix prompt assembly and provider transport in one large file

## Rebuild Notes

The current backend is a workable prototype-to-production bridge. A rebuild should keep the product semantics while separating orchestration, transport, and storage concerns more explicitly.

