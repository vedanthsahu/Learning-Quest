# 12 — Concurrency and Efficiency

## Status
Proposed.

## Requirement (unchanged in kind, now with a genuine business reason)
Concurrent/parallel execution of independent workloads, bounded, with a measurable performance improvement — and here, the reason is concrete: **the SLA clock is running, so independent evidence-gathering operations should not unnecessarily execute sequentially.**

## Where real concurrency exists

```
Evidence Gathering (triggered on incident investigation)
   |
   +---- Query metrics                    \
   +---- Query logs                        >  independent -> concurrency candidate
   +---- Query recent deployments          /
   +---- Search similar prior incidents   /
   v
Context Builder (join point -- waits for all branches, or their timeouts)
   v
Model call for diagnosis (not parallelizable with the above -- needs their output)
```

This is the Must Have concurrency example (see [03-scope-and-roadmap](03-scope-and-roadmap.md) Level 5, sequenced deliberately after Level 3's sequential baseline). Secondary, lower-priority candidates: notification fan-out to multiple team members (Java-side), and the offline evaluation harness running multiple fixed scenarios concurrently (batch concern, not request-path).

## Bounded, concretely

- **Max concurrency**: a bounded pool/semaphore (e.g., at most 4 evidence sources in flight per investigation — matches the 4 named sources above; no unbounded fan-out even if more evidence types are added later).
- **Timeout per branch**: a slow simulator query must not stall the whole investigation. Policy: proceed without that branch's result at timeout, and mark that evidence source as "unavailable" in the grounding trail rather than fail the whole investigation — a partial diagnosis with disclosed gaps beats a hung request while the SLA clock runs.
- **Cancellation**: if an incident's investigation is superseded (e.g., manually marked resolved while investigating) in-flight branches should be cancelled.
- **Retry policy**: bounded (e.g., 1 retry with backoff) for transient simulator/tool failures — not unbounded.
- **Backpressure**: concurrent investigations across multiple simultaneous incidents share a bounded worker pool, not one per incident unconditionally.

`asyncio` is the default mechanism (see [ADR-012](adr/ADR-012-concurrency-model.md)) — this is I/O-bound fan-out against the Simulator's REST API and, for retrieval, PostgreSQL/pgvector.

## The measurement requirement

Because Level 3 ships a working sequential investigation before Level 5 adds concurrency, the sequential-vs-concurrent comparison is a real before/after on the same code paths, not an estimate. Record actual latency numbers for both, per the fixed evaluation scenarios ([14-evaluation-strategy](14-evaluation-strategy.md)) — this is the evidence behind the "evidence gathering is time-sensitive" claim in [00-project-charter](00-project-charter.md).

## Non-goals
Horizontal scaling/autoscaling/distributed queues remain Not Now (see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md)) unless a measurement demonstrates an actual bottleneck — a handful of simulated incidents at a time does not require it.

## Related docs
[09-ai-engine-architecture](09-ai-engine-architecture.md) · [13-observability](13-observability.md) · [22-production-simulator](22-production-simulator.md) · [03-scope-and-roadmap](03-scope-and-roadmap.md) (Level 3, 5) · [ADR-012](adr/ADR-012-concurrency-model.md)
