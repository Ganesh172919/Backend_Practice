# Prompt Template Management
# Feature Deep Dive

Primary source files:

1. `models/PromptTemplate.js`
2. `services/promptCatalog.js`
3. `routes/admin.js`
4. `middleware/admin.js`
5. `middleware/auth.js`

## What This Feature Does

This feature lets administrators change AI prompts at runtime.

That means the team can tune AI behavior without redeploying backend code.

## Why This Feature Exists

Prompt wording has a huge impact on:

1. response quality
2. safety behavior
3. formatting consistency
4. product voice

Hardcoding prompts only in source code would make iteration slower.

## Data Model

`models/PromptTemplate.js` stores:

1. `key`
2. `version`
3. `description`
4. `content`
5. `isActive`

The `key` field is unique, so each prompt slot has one active database override.

## Prompt Catalog Service

`services/promptCatalog.js` is the bridge between code defaults and database overrides.

It defines `DEFAULT_PROMPTS` for:

1. `solo-chat`
2. `group-chat`
3. `memory-extract`
4. `conversation-insight`
5. `smart-replies`
6. `sentiment`
7. `grammar`

Main functions:

1. `getPromptTemplate`
2. `listPromptTemplates`
3. `upsertPromptTemplate`
4. `interpolatePrompt`
5. `buildInitialRoomHistory`

## How Resolution Works

`getPromptTemplate(key)` does:

1. query active database override
2. if found, use database content
3. otherwise, fall back to the code default

This gives a safe default even if the database is empty.

## Admin Routes

In `routes/admin.js`:

1. `GET /api/admin/prompts`
2. `PUT /api/admin/prompts/:key`

Both routes require:

1. authenticated user
2. admin check

This is important because prompt editing is a control-plane action.

## Real Runtime Use

When another feature needs a prompt:

1. solo chat asks for `solo-chat`
2. room AI asks for `group-chat`
3. helper endpoints ask for `smart-replies`, `sentiment`, or `grammar`

So prompt-template management affects many AI behaviors at once.

## Example

If the admin changes `solo-chat` to:

`Always answer in short bullet points and mention uncertainty clearly.`

Then every future solo chat request will automatically use that prompt, without editing `routes/chat.js`.

## Prompt Interpolation

Some prompts need variables.

Example:

group chat prompt includes `{{roomName}}`.

`interpolatePrompt()` replaces placeholders with actual values at runtime.

This lets prompts stay reusable instead of hardcoding room-specific text in code.

## AI Safety And Governance Angle

This feature is powerful, so it can also be risky.

Bad prompt edits can:

1. lower answer quality
2. break JSON-only endpoints
3. weaken guardrails
4. introduce inconsistent tone

Current protections:

1. admin-only write access
2. default prompts still exist in code
3. prompt keys are explicit and readable

Possible future improvements:

1. prompt validation tests
2. prompt rollback history
3. dry-run preview
4. separate staging and production prompt sets

## Query Explanation

### Load one prompt

```js
PromptTemplate.findOne({ key, isActive: true }).lean()
```

Purpose:

fetch runtime override if it exists.

### Upsert prompt

```js
PromptTemplate.findOneAndUpdate(
  { key },
  { $set: { version, description, content, isActive: true } },
  { new: true, upsert: true }
)
```

Purpose:

create or update one prompt slot without duplicate keys.

## Architecture Diagram

```text
[Admin API]
   |
   v
[PromptTemplate collection]
   |
   v
[promptCatalog service]
   |
   +--> solo chat
   +--> room AI
   +--> memory extraction
   +--> insights
   +--> helper endpoints
```

## Why This Design Works

The feature separates prompt operations from deployment operations.

That is exactly what a mature AI backend needs, because prompt engineering changes more often than application code.

## Template Lifecycle

A prompt template usually moves through these stages:

1. default code prompt exists
2. admin notices quality issue or wants a behavior change
3. admin updates the database prompt
4. runtime reads the new prompt automatically
5. downstream AI features immediately use the new version

This is why prompt management is a control-plane feature.

## Safe Prompt Editing Guidelines

When editing prompts for JSON features, keep these rules:

1. say "return JSON only"
2. specify the exact schema
3. keep field names stable
4. avoid adding extra prose outside the JSON

When editing prompts for chat features:

1. keep role and tone clear
2. explain how memory should be treated
3. avoid over-constraining natural responses
4. avoid instructions that conflict with product safety goals

## Testing Advice

After changing a prompt, test:

1. one normal input
2. one edge-case input
3. one very short input
4. one very long input

For JSON prompts, also test:

1. parser still succeeds
2. fields remain named the same way
3. field lengths stay reasonable

## Governance Value

This feature is not only about quality tuning.

It is also about operational governance.

It lets the team:

1. respond faster to quality issues
2. patch prompt behavior without deploys
3. centralize AI instruction changes
4. reduce code churn for wording-only adjustments

## Debugging Checklist

If a feature suddenly changes behavior, inspect:

1. whether its prompt template was updated
2. whether the database override is active
3. whether the template key matches the code lookup
4. whether placeholder variables still interpolate correctly

## Risks To Watch

1. bad edits can break JSON parsing
2. vague edits can reduce response quality
3. inconsistent tone across prompts can confuse users
4. missing rollback history can make incidents harder to recover

## Good Future Improvements

1. prompt preview UI
2. prompt version history
3. rollback button
4. staging prompts versus production prompts
5. automated contract tests for JSON prompts

## Practical Summary

If AI behavior is the product, prompt templates are part of the product configuration.

This feature treats them that way, which is the right architectural mindset.

## Extra Operational Advice

When a prompt change is made, record:

1. why it was changed
2. which feature it affects
3. what output problem it was meant to solve
4. which sample inputs were used to test it

Even a simple note like this can save a lot of debugging time later.

## Practical Rule

Prompt edits should be treated with the same care as API contract changes when the feature expects structured output.

## Extra FAQ

### Why keep defaults in code if the database can override them

Because safe fallback behavior matters.

If the database is empty or an override is missing, the feature still works.

### Why is admin protection important here

Because one prompt change can affect many users and many AI endpoints at once.

## Practical Closing Note

This feature reduces deployment friction, but it increases the need for disciplined prompt governance.

## Tiny FAQ

### Can this feature improve AI quality quickly

Yes.

That is one of its biggest benefits.

### Can it also break features quickly

Yes.

That is why review discipline matters.

## Final Mini Checklist

Before saving a prompt change:

1. confirm the key is correct
2. confirm the wording matches the feature purpose
3. confirm structured outputs still parse
4. confirm placeholders still make sense
5. confirm the change was tested with real examples

That small process can prevent a lot of avoidable AI regressions.

## Final Closing Thought

Prompt management is easy to underestimate.

In practice, it is one of the fastest ways to change AI behavior across the product.

## Final Note

Treat prompt changes as product changes.

They affect output quality, structure, and user trust.

## Extra Closing Checklist

1. identify the affected prompt key
2. test with normal input
3. test with edge-case input
4. verify JSON structure if needed
5. record why the edit was made

That process keeps prompt changes manageable.
