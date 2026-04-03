# 02. Solo Chat And Personalized Response

## Files you should know first

Backend:

- `routes/chat.js`
- `routes/conversations.js`
- `services/gemini.js`
- `services/memory.js`
- `services/conversationInsights.js`
- `models/Conversation.js`
- `models/MemoryEntry.js`
- `models/ConversationInsight.js`

Frontend:

- `..\ChatSphere\frontend\src\pages\SoloChat.tsx`
- `..\ChatSphere\frontend\src\hooks\useChat.ts`
- `..\ChatSphere\frontend\src\store\chatStore.ts`
- `..\ChatSphere\frontend\src\api\chat.ts`
- `..\ChatSphere\frontend\src\api\conversations.ts`

## What solo chat is in this project

Solo chat is the one-to-one AI assistant flow.

The user sends a message through HTTP to `/api/chat`.
The backend:

- validates the request
- retrieves relevant memory
- retrieves conversation insight if the thread already exists
- builds the final prompt
- sends the prompt to a selected or auto-routed model
- saves both the user turn and assistant turn into `Conversation.messages`
- refreshes insight and memory for future turns

## End-to-end flow

### Step 1: frontend loads conversations

`useChat.ts` calls `fetchConversations()` from `/api/conversations`.

What it stores in `chatStore`:

- conversation list
- conversation title
- server ID
- metadata like project and source type

If a conversation is selected and its full messages are not loaded yet, `useChat.ts` fetches:

- `/api/conversations/:id`
- `/api/conversations/:id/insights`

### Step 2: frontend sends a message

In `SoloChat.tsx`, submit calls `useChat().sendMessage(...)`.

Inside `useChat.ts`, the frontend immediately does optimistic UI updates:

1. add the user message to local store
2. add a fake assistant message with:
   - `content: "Thinking..."`
   - `messageState: "pending"`
3. call `sendChatMessage()` to `/api/chat`

This is why the UI feels immediate.

### Step 3: backend validates and gathers context

In `routes/chat.js`, the server validates:

- `message` must be a non-empty string
- attachment, if present, must pass `validateAttachmentPayload`
- project ownership must match current user
- conversation ownership must match current user

Then it loads context:

- `retrieveRelevantMemories({ userId, query, limit: 5 })`
- `getConversationInsight(userId, conversationId)` if this is not a new thread
- project context if `projectId` is provided or already attached to the conversation

### Step 4: backend builds the prompt

`services/gemini.js -> sendMessage(...)` uses:

- the `solo-chat` prompt template from `services/promptCatalog.js`
- `buildPrompt(...)`

Prompt assembly order is:

1. recent conversation history
2. retrieved memory context
3. conversation insight context
4. attachment text or metadata
5. extra sections like project context
6. current user request

This order matters because it makes the current request the final instruction block.

## How personalization works

This project does personalized response generation mainly through prompt enrichment, not by fine-tuning.

### Layer 1: memory retrieval

`services/memory.js -> retrieveRelevantMemories(...)`

The backend loads up to 100 recent memory records for the user, scores them, then keeps the best few.

The score is based on:

- token overlap with current query
- importance score
- confidence score
- recency
- usage count
- pinned bonus

This means the system is personalized, but it is still keyword-overlap based, not embedding-based.

### Layer 2: conversation insight

`services/conversationInsights.js`

For an existing conversation, the backend can inject:

- summary
- intent
- topics
- decisions
- action items

This helps the assistant continue long chats without resending the full history forever.

### Layer 3: project context

If the conversation belongs to a project, `buildProjectContext(project)` injects:

- project name
- project description
- project instructions
- project context
- project tags
- project files
- suggested prompts

This is a strong steering layer for task-oriented chats.

## Real example of personalized response

Imagine the user previously said:

```text
My name is Ravi.
I work at ACME Labs.
I prefer short bullet answers.
My favorite language is TypeScript.
```

Possible stored memories:

- `The user says their name is Ravi.`
- `The user works at ACME Labs.`
- `The user likes short bullet answers.`
- `The user's favorite language is TypeScript.`

Now the user asks:

```text
Can you help me plan my next backend contribution?
```

The backend may inject memory context like:

```text
Relevant remembered context:
1. The user works at ACME Labs.
2. The user likes short bullet answers.
3. The user's favorite language is TypeScript.
```

So the model can answer in a more personalized way even though the current message did not repeat that history.

## Conversation persistence

`models/Conversation.js` stores:

- `userId`
- `title`
- `messages[]`
- project linkage
- source type for imports

Each assistant message stores AI metadata too:

- `modelId`
- `provider`
- `requestedModelId`
- `processingMs`
- token usage
- `autoMode`
- `autoComplexity`
- `fallbackUsed`
- `memoryRefs`

This is useful because you can later explain:

- which model answered
- whether auto routing selected it
- whether fallback happened
- which memory entries influenced the answer

## How the frontend replaces "Thinking..."

After `/api/chat` returns, `useChat.ts` updates the pending assistant message with the real response.

It replaces:

- `content`
- `timestamp`
- `messageState`
- `memoryRefs`
- model/provider metadata
- token usage fields
- insight

So the final rendering is not a streamed token-by-token response.
It is a placeholder first, then one full response object.

## Important limitations

- personalization is retrieval-based, not semantic memory search
- there is no true streaming response
- there is no post-generation hallucination verifier

