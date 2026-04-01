# 29. Data Model Reference

## Purpose

This document summarizes the AI-relevant Mongoose models and fields.

## `Conversation`

- `userId`
- `title`
- `messages[]`
- `projectId`
- `projectName`
- `sourceType`
- `sourceLabel`
- `importFingerprint`
- `importSessionId`

Assistant message subfields of note:

- `memoryRefs`
- file metadata
- `modelId`
- `provider`
- `requestedModelId`
- `processingMs`
- `promptTokens`
- `completionTokens`
- `totalTokens`
- `autoMode`
- `autoComplexity`
- `fallbackUsed`

## `Message`

- `roomId`
- `userId`
- `username`
- `content`
- `isAI`
- `triggeredBy`
- `replyTo`
- `reactions`
- `status`
- pin/edit/delete fields
- file metadata
- `memoryRefs`
- `modelId`
- `provider`

## `MemoryEntry`

- `userId`
- `summary`
- `details`
- `tags`
- `fingerprint`
- `sourceType`
- source IDs for conversation, room, message, import session
- `confidenceScore`
- `importanceScore`
- `recencyScore`
- `pinned`
- `usageCount`
- `lastObservedAt`
- `lastUsedAt`

## `ConversationInsight`

- `scopeKey`
- `scopeType`
- `scopeId`
- `userId`
- `conversationId`
- `roomId`
- `title`
- `summary`
- `intent`
- `topics`
- `decisions`
- `actionItems[]`
- `messageCount`
- `lastGeneratedAt`
- `promptVersion`

## `PromptTemplate`

- `key`
- `version`
- `description`
- `content`
- `isActive`

## `Room`

- `name`
- `description`
- `tags`
- `maxUsers`
- `creatorId`
- `members[]`
- `pinnedMessages[]`
- `aiHistory[]`

## `User`

AI-relevant area:

- `settings.aiFeatures.smartReplies`
- `settings.aiFeatures.sentimentAnalysis`
- `settings.aiFeatures.grammarCheck`

## `Project`

- `name`
- `description`
- `instructions`
- `context`
- `tags`
- `suggestedPrompts`
- `files[]`

## Rebuild Notes

1. keep AI metadata close to stored outputs
2. distinguish prompt-facing history from user-facing transcript only when necessary
3. avoid field-name drift between runtime and compiled artifacts

