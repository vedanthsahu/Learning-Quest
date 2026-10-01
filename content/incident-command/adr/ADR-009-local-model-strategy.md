# ADR-009 — Local Model Strategy

## Status
**Confirmed** (runtime + hardware, 2026-09-02 revision) — exact model selection still Open.

## Context
Updated 2026-10-01: reuse the user's installed Ollama Llama models for the first complete investigation. Inventory exact tags during implementation; `llama3.2:1b` is the code's configured default, not a verified inventory. Local inference may perform diagnosis as well as summarization/classification if benchmarks support it. See [25-build-blueprint](../25-build-blueprint.md).

Provide a local-only mode with no external inference and initially serialize local inference behind a bounded queue. Record cold/warm latency, schema compliance, evidence grounding, and diagnosis correctness on the same inputs used for OpenRouter. Local compute has resource/time costs even without API charges. Do not force a slow local call before an external call solely to demonstrate a hierarchy.

## Resolved — hardware and runtime
Development hardware: **Intel Core i5-10210U, 32GB RAM, no discrete GPU.** Runtime: **Ollama, CPU-first.**

## Model size target
- Primary target: **~1B-3B parameter class** instruct models.
- Larger models may be tested opportunistically but must not be assumed to perform adequately.
- ~7B is possible but must be benchmarked before being relied on for anything latency-sensitive (evidence-gathering summarization happens inside the SLA-sensitive investigation path — see [12-concurrency-and-efficiency](../12-concurrency-and-efficiency.md)).

## What must still be benchmarked (Open — Q3 in [20-open-questions-and-risks](../20-open-questions-and-risks.md))
Latency, tokens/sec, memory usage, concurrent throughput, output quality for the specific tasks this tier handles (log/evidence summarization), and — critically — the effect of local-inference latency on overall SLA response time. Exact model choice (which 1-3B model) is decided from this benchmark at Level 3 implementation time, not now.

## Rationale
CPU-only inference on a laptop-class CPU is a real constraint on what "cheap tier" can mean in practice — this must be validated early rather than assumed away, since a too-slow local tier would undermine the entire "cheapest strategy that satisfies the requirement" thesis for exactly the tier meant to be cheapest.

## Consequences
CPU-only is **not a permanent architecture invariant** (source brief explicit instruction) — the model gateway abstraction ([09-ai-engine-architecture](../09-ai-engine-architecture.md)) keeps the runtime/model swappable. If local inference proves too slow to be useful even at 1-3B scale, the router can lean more heavily on deterministic rules and the external-model tier, with the local tier deprioritized rather than forced.

## Reconsideration conditions
Revisit if GPU access becomes available (e.g., a future AWS GPU instance experiment), or if benchmarking shows even 1-3B CPU inference is too slow to be useful in the investigation path.
