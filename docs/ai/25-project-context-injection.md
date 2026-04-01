# 25. Project Context Injection

## Purpose

This document explains how project metadata and project files influence solo AI requests.

## Relevant Files

- `routes/projects.js`
- `routes/chat.js`
- `models/Project.js`
- `services/gemini.js`

## Project Model Fields Used By AI

- `name`
- `description`
- `instructions`
- `context`
- `tags`
- `suggestedPrompts`
- `files[]`

## Chat Resolution Rules

When `POST /api/chat` runs:

1. it resolves `projectId` from request or existing conversation
2. it loads the project for the current user
3. it rejects cross-project conversation mixing
4. it passes the project into `sendMessage()`

## Prompt Construction

`buildProjectContext(project)` appends sections like:

- `Project: <name>`
- `Project description: ...`
- `Project instructions: ...`
- `Project context: ...`
- `Project tags: ...`
- `Project files: ...`
- `Suggested project tasks: ...`

For project files:

- up to 6 files are considered
- each file reuses attachment-payload logic
- each file section is truncated to about 4000 chars

## Why Project Context Is Solo-Chat Only

In the live source:

- solo chat accepts `projectId`
- room AI does not
- room AI only gets room name, room history, memories, insight, and attachment

## Risks

- project context can dominate the prompt if instructions and files are large
- deleting a project clears `projectId` and `projectName` from linked conversations, but old model answers remain unchanged
- there is no explicit prompt budget per project section

## Rebuild Notes

1. treat project context as a first-class retrieval source with budgets
2. keep project attachment parsing separate from ad hoc user attachments
3. record which project version was used for an answer if reproducibility matters

