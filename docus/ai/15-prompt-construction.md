# 15. Prompt Construction

## Purpose
This document explains how prompts are assembled from history, memory, insights, attachments, and project data.

## Relevant Files
- `services/gemini.js`
- `services/promptCatalog.js`

## Core Functions
- `serializeHistory`
- `buildMemoryContext`
- `buildInsightContext`
- `buildAttachmentPayload`
- `buildProjectContext`
- `buildPrompt`

## Prompt Assembly Order
1. serialized recent history
2. relevant remembered context
3. conversation insight
4. attachment-derived text
5. extra sections like project context
6. current user request

