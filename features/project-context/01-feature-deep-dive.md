# Project Context
# Feature Deep Dive

Primary source files:

1. `models/Project.js`
2. `routes/projects.js`
3. `services/gemini.js`
4. `services/messageFormatting.js`
5. `models/Conversation.js`

## What This Feature Does

This feature lets a user define reusable project context and attach it to AI conversations.

A project can include:

1. name
2. description
3. instructions
4. context
5. tags
6. suggested prompts
7. files

## Why This Feature Exists

Users often want AI answers tailored to a specific ongoing task.

Instead of repeating the same background in every prompt, the backend lets them save that context once and reuse it across many chats.

## Data Model

`models/Project.js` stores project context per user.

Important fields:

1. `userId`
2. `name`
3. `description`
4. `instructions`
5. `context`
6. `tags`
7. `suggestedPrompts`
8. `files`

This model is linked to `Conversation` through:

1. `projectId`
2. `projectName`

## Routes

`routes/projects.js` provides:

1. list projects
2. get project details
3. create project
4. update project
5. delete project

The route layer normalizes:

1. string fields
2. arrays
3. file metadata

It also computes project usage stats from the `Conversation` collection.

## Stats Query

Project stats are derived with aggregation:

```js
Conversation.aggregate([
  { $match: { userId, projectId: { $in: projectIds } } },
  { $group: { _id: '$projectId', conversationCount: { $sum: 1 }, lastConversationAt: { $max: '$updatedAt' } } }
])
```

This gives the frontend useful derived information without storing duplicate counters on the project document itself.

## Context Injection

The real AI value appears in `services/gemini.js`.

`buildProjectContext(project)` converts the project document into prompt text.

Order of sections:

1. project name
2. project description
3. project instructions
4. project context
5. project tags
6. project file summaries and extracted text
7. suggested prompts

This becomes one extra prompt block injected into solo chat requests.

## File Handling

Project files are normalized in `routes/projects.js`, and `validateAttachmentPayload()` is reused so the backend accepts only valid upload-like objects.

When a project file is included in prompt building:

1. text-like files can be read and injected
2. image files may become image data URLs when supported
3. PDFs only contribute metadata text in this build

## Ownership Rules

Every project query is scoped by:

```js
{ _id: projectId, userId: req.user.id }
```

That is the main security boundary.

It prevents one user from attaching another user's project context to an AI chat.

## Conversation Binding Rule

`routes/chat.js` includes an important consistency check:

if a conversation already belongs to one project, the caller cannot silently switch it to a different project.

Why:

that would corrupt the meaning of the conversation and mix contexts incorrectly.

## Real Example

Project:

```json
{
  "name": "Mobile App Launch",
  "description": "Launch prep for version 2.0",
  "instructions": "Answer like a product strategist. Keep recommendations practical.",
  "context": "The team has 2 weeks. Marketing assets are half done. QA is still running.",
  "tags": ["launch", "product", "mobile"],
  "suggestedPrompts": ["Create a launch checklist", "List launch risks"],
  "files": [
    {
      "fileName": "launch-plan.md",
      "fileType": "text/markdown",
      "fileUrl": "/api/uploads/launch-plan.md",
      "fileSize": 2400
    }
  ]
}
```

Prompt effect:

the AI does not answer as a generic assistant anymore. It answers as if it has been briefed on this specific project.

## Edge Cases

1. invalid file payloads are filtered out
2. empty project name is rejected
3. deleting a project clears `projectId` and `projectName` from linked conversations
4. large context strings are trimmed to configured maximum lengths

## Trade-Offs

### Strength

Project context saves user effort and makes replies more task-aware.

### Risk

Huge project context can increase token cost and prompt noise.

Current controls:

1. string length limits
2. file count limits
3. file text truncation
4. suggested prompt limits

## Architecture Diagram

```text
[Project CRUD routes]
   |
   v
[Project model]
   |
   v
[buildProjectContext()]
   |
   v
[solo chat prompt assembly]
   |
   v
[AI response stored in Conversation]
```

## Why This Design Works

This feature gives the backend a reusable task-context system.

It is one of the main reasons the same AI engine can behave differently for different user goals without changing the core provider code.

## How Project Context Changes The Prompt

Without project context, a request might look like:

`Help me plan a launch.`

With project context, the model also sees:

1. what the project is
2. what constraints already exist
3. what files belong to the project
4. what tone or role the AI should take

That dramatically changes answer quality.

## Why Project Files Matter

Project files are different from one-off message attachments.

One-off message attachment:

1. belongs to a single request
2. helps one turn

Project file:

1. belongs to the reusable project
2. can influence many future requests

That makes project files a long-lived context source.

## Validation Notes

The route layer limits:

1. project name length
2. description length
3. instructions length
4. context length
5. tag count
6. suggested prompt count
7. file count

Why this matters:

project context can easily become too large and make prompts expensive or noisy.

These limits act as prompt-budget controls, not just input validation.

## Conversation Consistency Example

Suppose a conversation started under project A.

Later a client accidentally sends project B with the same conversation id.

The route rejects that.

Why this is correct:

mixing contexts would make the conversation record misleading and could create confusing AI behavior.

## Operational Questions

### Why store both `projectId` and `projectName`

Because:

1. `projectId` gives a real relationship
2. `projectName` gives easy display and historical continuity

### Why aggregate stats from conversations instead of storing counters

Because counters can drift and add write complexity.

Aggregation is simpler and more trustworthy for moderate scale.

## Debugging Checklist

If project-aware replies seem wrong, check:

1. whether the conversation is linked to the expected project
2. whether the project instructions were updated recently
3. whether project file payloads are valid
4. whether the attached project files are text-readable in this build
5. whether the prompt became too large and pushed routing to a different model

## Future Improvements

1. project context previews before chat submission
2. project-level token budgeting
3. project-specific prompt templates
4. per-project memory scoping
5. semantic search over project files

## Practical Summary

This feature gives the user a way to turn a general AI assistant into a task-specific assistant without creating a separate AI system for each task domain.

## Example Prompt Contribution

A project with strong instructions can change reply style significantly.

Example:

1. without project instructions -> generic answer
2. with "answer like a backend architect" -> architecture-focused answer
3. with project files -> answer grounded in actual project material

That is why this feature improves answer relevance so much.

## Practical Rule

The best project contexts are:

1. specific
2. reusable
3. short enough to stay focused
4. updated when the project changes

Very large unfocused context often lowers quality instead of improving it.

## Extra Example Questions This Feature Helps

1. "Draft a plan using my saved project constraints."
2. "Review this idea using the project files I already uploaded."
3. "Give next steps based on the current project context."
4. "Suggest work items that match this project's goals."

## Maintenance Note

If users say answers feel generic, one good question is:

"Was the right project attached to the conversation?"

## Small FAQ

### Does every conversation need a project

No.

Project context is optional.

### When is project context most useful

When the same task background needs to influence many related AI requests.

## Closing Reminder

Project context should reduce repeated explanation work for the user, not create prompt clutter.

## Final Mini Checklist

When using this feature well:

1. choose a clear project name
2. keep instructions specific
3. keep context current
4. remove stale files
5. avoid adding irrelevant background

That helps the AI stay grounded and useful.

## Final Closing Thought

Project context is strongest when it acts like a reusable brief.

It should give the AI direction, not bury it in noise.
