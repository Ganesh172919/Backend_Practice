# 34. Scaling And Capacity Analysis

## Purpose

This document gives architecture-based capacity estimates and bottlenecks. These are estimates, not benchmark-backed claims.

## Caveat

No benchmark suite exists in this repo. The numbers below describe likely ceilings and stress points based on the current design.

## Single Node.js Instance

Estimated behavior:

- acceptable for modest concurrent AI usage and normal room traffic
- likely degrades first under slow provider latency rather than pure CPU
- event-loop responsiveness will suffer if many synchronous provider requests stack up

## MongoDB Patterns

Pressure points:

- solo chat writes embedded conversation arrays plus memory and insight side effects
- room AI rewrites `Room.aiHistory`, creates a `Message`, updates memory usage, and refreshes insight
- frequent room activity triggers repeated insight refresh writes

Likely limiters:

- connection pool size
- write amplification from derived artifacts
- large embedded conversation documents over time

## Provider Latency

The AI layer is synchronous from the request perspective:

- one slow provider attempt blocks the request
- fallback chains can multiply latency
- room AI keeps sockets waiting while provider work runs inline

## In-Memory State

Per-instance state includes:

- model catalog cache
- AI quota map
- socket flood map
- room presence maps
- typing maps

This is cheap for one instance but does not scale coherently across many instances.

## Socket Fan-Out

Room AI emits at least:

- `ai_thinking(true)`
- `ai_thinking(false)`
- `ai_response`

per successful request, plus human message events in the same rooms. Larger rooms increase broadcast cost linearly.

## Capacity Framing

Practical expectation with caveats:

- a single instance can support a modest internal/team workload
- heavy concurrent AI usage, especially room AI plus large attachments, will likely expose latency before raw throughput limits
- multi-instance scale without shared quota/state introduces correctness bugs before it introduces clean capacity gains

## Safe Scaling Path

1. move quota and socket state to shared infrastructure
2. queue provider work or at least isolate it from hot socket handlers
3. reduce derived-write frequency for insights
4. add observability around provider latency, retry counts, and DB write timing

