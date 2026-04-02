/**
 * File Overview: Memory extraction, scoring, and retrieval service.
 * WHY: Provides long-term personalization context to improve AI response relevance.
 * WHAT: Extracts deterministic/AI memories, deduplicates entries, scores candidates, and returns relevant memories.
 * HOW: Normalizes text, computes fingerprints, applies weighted scoring, and tracks usage metrics.
 */
const crypto = require('crypto');
const MemoryEntry = require('../models/MemoryEntry');
const { getJsonFromModel } = require('./gemini');

/**
 * WHY: Ensures downstream logic receives canonicalized and predictable values.
 * WHAT: Implements normalize text for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements tokenize for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 2);
}

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements unique strings for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements clamp score for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function clampScore(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.max(0, Math.min(1, parsed));
  }
  return fallback;
}

/**
 * WHY: Keeps payload construction reusable and consistent across call sites.
 * WHAT: Implements build fingerprint for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function buildFingerprint(summary) {
  return crypto.createHash('sha1').update(normalizeText(summary)).digest('hex');
}

/**
 * WHY: Converts unstructured input into structured signals for later pipeline stages.
 * WHAT: Implements extract deterministic memories for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function extractDeterministicMemories(text) {
  const rawText = String(text || '').trim();
  if (!rawText) {
    return [];
  }

  const definitions = [
    {
      regex: /\bmy name is ([a-z][a-z\s'-]{1,40})/i,
      build: (match) => ({
        summary: `The user says their name is ${match[1].trim()}.`,
        details: rawText,
        tags: ['identity', 'name'],
        confidenceScore: 0.95,
        importanceScore: 0.9,
      }),
    },
    {
      regex: /\bi live in ([a-z0-9,\s'-]{2,60})/i,
      build: (match) => ({
        summary: `The user lives in ${match[1].trim()}.`,
        details: rawText,
        tags: ['location', 'personal'],
        confidenceScore: 0.8,
        importanceScore: 0.7,
      }),
    },
    {
      regex: /\bi work (?:at|for) ([a-z0-9,\s&.'-]{2,80})/i,
      build: (match) => ({
        summary: `The user works at ${match[1].trim()}.`,
        details: rawText,
        tags: ['work', 'personal'],
        confidenceScore: 0.82,
        importanceScore: 0.8,
      }),
    },
    {
      regex: /\bmy favorite ([a-z\s]+) is ([a-z0-9,\s&.'-]{2,80})/i,
      build: (match) => ({
        summary: `The user's favorite ${match[1].trim()} is ${match[2].trim()}.`,
        details: rawText,
        tags: ['preference'],
        confidenceScore: 0.78,
        importanceScore: 0.65,
      }),
    },
    {
      regex: /\bi (?:like|love|prefer) ([a-z0-9,\s&.'-]{3,80})/i,
      build: (match) => ({
        summary: `The user likes ${match[1].trim()}.`,
        details: rawText,
        tags: ['preference'],
        confidenceScore: 0.65,
        importanceScore: 0.55,
      }),
    },
  ];

  return definitions
    .map((definition) => {
      const match = rawText.match(definition.regex);
      return match ? definition.build(match) : null;
    })
    .filter(Boolean);
}

/**
 * WHY: Converts unstructured input into structured signals for later pipeline stages.
 * WHAT: Implements extract ai memories for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
async function extractAiMemories(text) {
  const prompt = [
    'Return JSON only.',
    'Extract up to 5 stable user memories from this text.',
    'Use the schema {"items":[{"summary":"","details":"","confidenceScore":0.0,"importanceScore":0.0,"tags":[""]}]}',
    'Ignore temporary requests and generic chit-chat.',
    `Text:\n${text}`,
  ].join('\n\n');

  const result = await getJsonFromModel(prompt, { items: [] });
  return Array.isArray(result.items) ? result.items : [];
}

/**
 * WHY: Keeps payload construction reusable and consistent across call sites.
 * WHAT: Implements build memory candidates for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
async function buildMemoryCandidates(text) {
  const deterministic = extractDeterministicMemories(text);
  let aiCandidates = [];

  try {
    // AI extraction broadens coverage beyond regex patterns (preferences, intent, long facts).
    aiCandidates = await extractAiMemories(text);
  } catch (error) {
    // Memory extraction should never block chat flow; fallback to deterministic-only candidates.
    aiCandidates = [];
  }

  return [...deterministic, ...aiCandidates]
    .map((item) => ({
      summary: String(item.summary || '').trim(),
      details: String(item.details || '').trim(),
      tags: uniqueStrings((item.tags || []).map((tag) => normalizeText(tag))),
      confidenceScore: clampScore(item.confidenceScore, 0.6),
      importanceScore: clampScore(item.importanceScore, 0.5),
    }))
    .filter((item) => item.summary.length >= 6);
}

/**
 * WHY: Calculates derived values that drive ranking or decision logic.
 * WHAT: Implements compute recency score for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function computeRecencyScore(dateValue) {
  const observed = new Date(dateValue || Date.now());
  const ageDays = Math.max(0, (Date.now() - observed.getTime()) / (1000 * 60 * 60 * 24));
  if (ageDays <= 1) return 1;
  if (ageDays <= 7) return 0.85;
  if (ageDays <= 30) return 0.65;
  if (ageDays <= 90) return 0.45;
  return 0.25;
}

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements upsert memory entries for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
async function upsertMemoryEntries({
  userId,
  text,
  sourceType,
  sourceConversationId = null,
  sourceRoomId = null,
  sourceMessageId = null,
  sourceImportSessionId = null,
}) {
  const candidates = await buildMemoryCandidates(text);
  if (candidates.length === 0) {
    return [];
  }

  const savedEntries = [];

  for (const candidate of candidates) {
    const fingerprint = buildFingerprint(candidate.summary);
    const existing = await MemoryEntry.findOne({ userId, fingerprint });

    if (existing) {
      // Merge strategy keeps strongest confidence/importance while refreshing recency.
      existing.summary = candidate.summary;
      existing.details = candidate.details || existing.details;
      existing.tags = uniqueStrings([...(existing.tags || []), ...candidate.tags]);
      existing.confidenceScore = Math.max(existing.confidenceScore, candidate.confidenceScore);
      existing.importanceScore = Math.max(existing.importanceScore, candidate.importanceScore);
      existing.recencyScore = 1;
      existing.lastObservedAt = new Date();
      existing.sourceConversationId = sourceConversationId || existing.sourceConversationId;
      existing.sourceRoomId = sourceRoomId || existing.sourceRoomId;
      existing.sourceMessageId = sourceMessageId || existing.sourceMessageId;
      existing.sourceImportSessionId = sourceImportSessionId || existing.sourceImportSessionId;
      await existing.save();
      savedEntries.push(existing);
      continue;
    }

    const entry = await MemoryEntry.create({
      userId,
      summary: candidate.summary,
      details: candidate.details,
      tags: candidate.tags,
      fingerprint,
      sourceType,
      sourceConversationId,
      sourceRoomId,
      sourceMessageId,
      sourceImportSessionId,
      confidenceScore: candidate.confidenceScore,
      importanceScore: candidate.importanceScore,
      recencyScore: 1,
      lastObservedAt: new Date(),
    });

    savedEntries.push(entry);
  }

  return savedEntries;
}

/**
 * WHY: Calculates derived values that drive ranking or decision logic.
 * WHAT: Implements score memory for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
function scoreMemory(entry, queryTokens) {
  const entryTokens = tokenize([entry.summary, entry.details, ...(entry.tags || [])].join(' '));
  const overlap = entryTokens.filter((token) => queryTokens.has(token)).length;
  const textScore = queryTokens.size > 0 ? overlap / queryTokens.size : 0;
  const recency = computeRecencyScore(entry.lastObservedAt || entry.updatedAt);
  const pinnedBonus = entry.pinned ? 0.15 : 0;

  // Weighted ranking favors textual relevance, then long-term usefulness and confidence.
  // usageCount contributes gently to avoid popularity overpowering semantic match.
  return (
    textScore * 0.45 +
    entry.importanceScore * 0.2 +
    entry.confidenceScore * 0.15 +
    recency * 0.1 +
    Math.min(0.1, entry.usageCount * 0.01) +
    pinnedBonus
  );
}

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements retrieve relevant memories for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
async function retrieveRelevantMemories({ userId, query, limit = 5 }) {
  const entries = await MemoryEntry.find({ userId })
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(100)
    .lean();

  const queryTokens = new Set(tokenize(query));
  return entries
    .map((entry) => ({
      ...entry,
      score: scoreMemory(entry, queryTokens),
    }))
    .filter((entry) => entry.score > 0.08 || entry.pinned)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * WHY: Records lifecycle state transitions required for analytics and correctness.
 * WHAT: Implements mark memories used for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
async function markMemoriesUsed(memoryEntries = []) {
  const ids = memoryEntries.map((entry) => entry._id || entry.id).filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  await MemoryEntry.updateMany(
    { _id: { $in: ids } },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() },
    }
  );
}

module.exports = {
  buildFingerprint,
  buildMemoryCandidates,
  normalizeText,
  retrieveRelevantMemories,
  upsertMemoryEntries,
  markMemoriesUsed,
};
