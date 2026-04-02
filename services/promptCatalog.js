/**
 * File Overview: Prompt template catalog and interpolation utilities.
 * WHY: Centralizes reusable prompts and allows runtime admin overrides.
 * WHAT: Defines default templates, resolves active overrides, and interpolates dynamic placeholders.
 * HOW: Fetches prompt template records by key and merges with defaults at generation time.
 */
const PromptTemplate = require('../models/PromptTemplate');

const DEFAULT_PROMPTS = {
  'solo-chat': {
    version: 'v1',
    description: 'Default solo chat prompt',
    content: `You are ChatSphere's AI collaborator.
Respond clearly, helpfully, and with explicit reasoning when the task needs it.
Use retrieved memory only when it is relevant, and never pretend uncertain memory is certain.
If memory or insight context is included, treat it as supporting context rather than absolute truth.`,
  },
  'group-chat': {
    version: 'v1',
    description: 'Default group chat prompt',
    content: `You are ChatSphere's room assistant.
You are participating in a group room and should answer in a collaborative, concise, public-chat style.
Use retrieved memory only about the triggering user, and only when it clearly helps.
Do not invent room facts.
Room name: {{roomName}}.`,
  },
  'memory-extract': {
    version: 'v1',
    description: 'Extract stable user memories',
    content: `Extract only stable, useful user memories from the provided chat text.
Return JSON with an array named "items".
Each item must contain: summary, details, confidenceScore, importanceScore, tags.
Only include facts that are likely to matter later.`,
  },
  'conversation-insight': {
    version: 'v1',
    description: 'Summarize a conversation into structured insight',
    content: `Summarize the conversation into JSON with:
title, summary, intent, topics, decisions, actionItems.
Keep actionItems as an array of objects with text and owner when known.`,
  },
  'smart-replies': {
    version: 'v1',
    description: 'Generate short quick replies',
    content: `Generate exactly 3 short quick replies in a JSON array. Keep them natural and useful.`,
  },
  'sentiment': {
    version: 'v1',
    description: 'Analyze short message sentiment',
    content: `Return only JSON with sentiment, confidence, and emoji.`,
  },
  'grammar': {
    version: 'v1',
    description: 'Grammar correction prompt',
    content: `Return only JSON with corrected text and suggestions.`,
  },
};

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements interpolate prompt for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function interpolatePrompt(content, variables = {}) {
  return String(content || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    return value == null ? '' : String(value);
  });
}

/**
 * WHY: Keeps payload construction reusable and consistent across call sites.
 * WHAT: Implements build initial room history for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function buildInitialRoomHistory(roomName) {
  const prompt = interpolatePrompt(DEFAULT_PROMPTS['group-chat'].content, {
    roomName: roomName || 'ChatSphere room',
  });

  return [
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
    {
      role: 'model',
      parts: [{ text: 'Understood. I will support the room conversation clearly and collaboratively.' }],
    },
  ];
}

/**
 * WHY: Keeps retrieval logic centralized so callers do not duplicate query behavior.
 * WHAT: Implements get prompt template for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
async function getPromptTemplate(key) {
  const saved = await PromptTemplate.findOne({ key, isActive: true }).lean();
  if (saved) {
    return {
      key: saved.key,
      version: saved.version,
      description: saved.description,
      content: saved.content,
    };
  }

  const fallback = DEFAULT_PROMPTS[key];
  return fallback
    ? {
        key,
        version: fallback.version,
        description: fallback.description,
        content: fallback.content,
      }
    : null;
}

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements list prompt templates for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
async function listPromptTemplates() {
  const rows = await PromptTemplate.find({ isActive: true }).lean();
  const merged = Object.keys(DEFAULT_PROMPTS).map((key) => {
    const saved = rows.find((row) => row.key === key);
    return {
      key,
      version: saved?.version || DEFAULT_PROMPTS[key].version,
      description: saved?.description || DEFAULT_PROMPTS[key].description,
      content: saved?.content || DEFAULT_PROMPTS[key].content,
      source: saved ? 'database' : 'default',
    };
  });

  rows
    .filter((row) => !DEFAULT_PROMPTS[row.key])
    .forEach((row) => {
      merged.push({
        key: row.key,
        version: row.version,
        description: row.description,
        content: row.content,
        source: 'database',
      });
    });

  return merged;
}

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements upsert prompt template for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
async function upsertPromptTemplate(key, payload) {
  return PromptTemplate.findOneAndUpdate(
    { key },
    {
      $set: {
        version: payload.version || DEFAULT_PROMPTS[key]?.version || 'v1',
        description: payload.description || DEFAULT_PROMPTS[key]?.description || '',
        content: payload.content,
        isActive: true,
      },
    },
    { new: true, upsert: true }
  ).lean();
}

module.exports = {
  DEFAULT_PROMPTS,
  buildInitialRoomHistory,
  getPromptTemplate,
  interpolatePrompt,
  listPromptTemplates,
  upsertPromptTemplate,
};
