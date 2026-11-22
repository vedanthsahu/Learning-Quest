# 13 — Observability

## Status
Proposed.

## Stack
OpenTelemetry for traces + metrics, structured JSON logs from Simulator, Spring Boot, and the Python engine, correlated by a shared trace ID across the full incident-investigation path.

## Target trace shape

```
Browser
  -> Spring Boot (detection/incident state, notification)
       -> Python AI Engine
            -> Router (span: decision + reason)
            -> Evidence Gathering
                 -> Metrics query (Simulator)
                 -> Logs query (Simulator)
                 -> Deployment history (Simulator)
                 -> Retrieval (pgvector)
            -> Model (span: provider, model id, tier, tokens, latency, cost)
            -> Grounding
       -> Tool execution (span: tool name, risk, approval wait time, Simulator call)
            -> Simulator action endpoint
       -> Verification poll (span: attempts, time-to-recovery)
```

Each span corresponds to a stage in [09-ai-engine-architecture](09-ai-engine-architecture.md)'s router and [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md)'s lifecycle — emitted by the same code as it executes, not bolted on.

## What gets measured (now incident/SLA-specific, in addition to the generic set)

- MTTA (time to `ACKNOWLEDGED`), time-to-diagnosis (time to `DIAGNOSED`), MTTR (time to `RESOLVED`) — per incident, and aggregated.
- SLA-consumed percentage at each lifecycle transition; SLA-breach rate.
- Evidence-gathering latency, per source and aggregate (sequential-baseline vs. concurrent — see [12-concurrency-and-efficiency](12-concurrency-and-efficiency.md)).
- Model latency/tokens/cost per tier (local vs. external).
- Tool latency, per tool; approval wait time (time between "recommended" and human decision) — this is a human-in-the-loop latency the system doesn't control but should still measure, since it's part of real MTTR.
- Routing distribution across tiers; human-escalation rate.
- Errors/retries/timeouts per stage.

## Hotspot definition (unchanged principle, incident-specific examples)
A hotspot is a component disproportionately contributing to latency/cost/errors/retries, computed from real trace/metric data. Concrete examples once data exists: "evidence-gathering p95 latency," "approval wait time p95" (a human/process hotspot, not a technical one — still worth surfacing), "Simulator query error rate," "external-model-API rate-limit rejection rate."

## Why this can't be deferred
Two Must Have features depend on it directly: the incident view's evidence/timeline display ([01-pdd](01-pdd.md)) and the evaluation strategy's efficiency metrics ([14-evaluation-strategy](14-evaluation-strategy.md)). Per [03-scope-and-roadmap](03-scope-and-roadmap.md), basic tracing is a Level 8 dedicated pass, but structured logging with trace-ID propagation should start as soon as cross-service calls exist (Level 2-3), for the same retrofitting-is-harder reason as the original charter.

## Related docs
[09-ai-engine-architecture](09-ai-engine-architecture.md) · [12-concurrency-and-efficiency](12-concurrency-and-efficiency.md) · [14-evaluation-strategy](14-evaluation-strategy.md) · [ADR-013](adr/ADR-013-observability-stack.md)
