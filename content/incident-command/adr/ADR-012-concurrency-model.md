# ADR-012 — Concurrency Model

## Status
Proposed

## Context
The project requires a genuine, bounded, measured concurrency demonstration — not "we used multithreading somewhere." See [12-concurrency-and-efficiency](../12-concurrency-and-efficiency.md).

## Problem
Which concurrency mechanism fits the identified independent-workload path (memory retrieval + tool calls, fanning out from the Python engine)?

## Options considered
- **Python `asyncio`** — fits I/O-bound fan-out (network calls to Milvus, tools, model APIs) well; native support for timeouts, cancellation, and bounded concurrency (semaphores, `asyncio.gather` with limits).
- **Thread pool** — viable for I/O-bound work in Python too, but asyncio is the more idiomatic fit for a service already making many concurrent network calls.
- **Process pool** — suited to CPU-bound work; not the shape of this workload (network I/O, not computation).
- **Java executors/virtual threads** — relevant only if/when the Java side has its own independent fan-out (e.g., persisting a message while kicking off the Python call) — a secondary, lower-priority candidate.

## Decision
`asyncio` with bounded concurrency (semaphore-limited fan-out), explicit per-branch timeouts, and cancellation propagation, for the Python engine's context-gathering stage (memory retrieval + tool calls). Java-side concurrency (executors/virtual threads) considered separately and only if a concrete independent-workload need arises there.

## Rationale
The identified concurrency opportunity ([12-concurrency-and-efficiency](../12-concurrency-and-efficiency.md)) is I/O-bound network fan-out inside the Python engine — asyncio is the standard, idiomatic tool for exactly this shape of workload.

## Tradeoffs
Requires the model gateway, Milvus client, and tool execution layer to all be async-compatible (or wrapped) — a real but bounded implementation cost.

## Consequences
The sequential-vs-concurrent latency measurement required by [12-concurrency-and-efficiency](../12-concurrency-and-efficiency.md) should be built as both code paths exist briefly (or a feature flag) specifically to produce that comparison, not estimated after the fact.

## Reconsideration conditions
None anticipated.
