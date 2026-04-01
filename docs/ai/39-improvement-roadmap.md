# 39. Improvement Roadmap

## Purpose

This document prioritizes the most valuable improvements without changing current product semantics.

## Immediate

| Priority | Improvement | Why |
| --- | --- | --- |
| P1 | move room AI out of `index.js` | reduces coupling and risk |
| P1 | add shared quota store | fixes multi-instance correctness gap |
| P1 | record richer room-AI telemetry | makes debugging parity with solo chat possible |
| P1 | validate prompt-template updates | prevents broken JSON-output prompts |
| P1 | make fallback provenance observable | avoids silent degradation |

## Next

| Priority | Improvement | Why |
| --- | --- | --- |
| P2 | add prompt-budgeting per context source | controls prompt bloat |
| P2 | add PDF text extraction or downgrade PDF support messaging | reduces user confusion |
| P2 | add insight freshness/version markers | reduces stale-context confusion |
| P2 | add idempotency for solo and room AI writes | reduces duplicate outputs |
| P2 | cache prompt templates safely | reduces repeated DB lookups |

## Later

| Priority | Improvement | Why |
| --- | --- | --- |
| P3 | measured routing instead of pure heuristics | improves quality/cost routing |
| P3 | background jobs for derived writes | reduces request-path latency |
| P3 | stronger retrieval beyond lexical overlap | improves memory relevance at scale |
| P3 | persistent model-catalog snapshots | improves observability |

## Documentation Debt

- keep source and `dist/` aligned or clearly separate them
- document room AI event contracts formally
- document prompt version usage on persisted artifacts

## Rebuild Notes

The roadmap should harden correctness first, then observability, then scaling, then smarter routing. That order preserves product behavior while reducing operational risk.

