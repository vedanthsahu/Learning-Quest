# 22 — Production Environment Simulator

## Status
Proposed. This is one of the most consequential scope calls in the whole project — see the "synthetic generator, not real infrastructure" decision below, and [ADR-015](adr/ADR-015-production-simulator-scope.md).

## Purpose
A first-class subsystem providing a small, realistic, reproducible production estate for the incident-command system to investigate. Not "a sad server that randomly throws 500s" — it must produce plausible, interrelated telemetry (health, metrics, logs, deployments, dependency relationships, queue/DB state) so that investigation is genuinely non-trivial, and it must be *reproducible* so evaluation is possible.

## Critical scope decision: synthetic generator, not real infrastructure

The source brief's language ("queue state," "database state," "realistic dependencies") could be read as an instruction to actually run ~8-12 real microservices with real queues (Kafka/RabbitMQ) and real per-service databases. **That reading is rejected here.** Building real infrastructure to fail on purpose is a large, low-value engineering project of its own — it would consume disproportionate effort relative to what it teaches (the project already exercises real infra elsewhere: real PostgreSQL, real Milvus/pgvector, eventually real EC2/RDS) and it would make reproducibility *harder*, not easier (real distributed systems have real nondeterminism).

**Decision**: the simulator is a single service (or a small number of services) that maintains an in-memory/DB-backed **state machine per simulated service**, driven by scenario scripts. It exposes REST endpoints that *look like* what a real observability/ops surface would return — health, metrics, logs, recent deployments — computed from the current scenario state, not from anything actually running or failing underneath. "Restarting" a simulated service means transitioning its state machine, not restarting a process.

```
Production Simulator (one service)
  |
  +-- Scenario Engine (loads a named scenario, advances simulated time/state)
  |
  +-- Simulated Estate (in-memory model, seeded from config)
  |     Payments: payment-api, payment-worker, payment-queue (state only)
  |     Orders:   order-api, order-worker
  |     Identity: auth-api
  |
  +-- Exposed API (consumed by the Python AI engine and by tool calls)
        GET  /services/{id}/health
        GET  /services/{id}/metrics
        GET  /services/{id}/logs
        GET  /services/{id}/deployments
        GET  /dependencies
        POST /scenarios/{name}/start
        POST /actions/{id}/restart   (mutates simulated state; used by tools)
        POST /actions/{id}/scale
        POST /actions/{id}/rollback
```

## Scope (source brief §41 numbers, adopted)

- 2-3 simulated productions (Payments, Orders, Identity is a reasonable starting set).
- 8-12 simulated services total across them.
- A handful of teams, mapped to service ownership.
- The 5 named scenario types (below), each with at least one concrete, reproducible instance.

## Scenarios (from source brief §7, reproducible by construction since they're scripted state transitions)

- **A — Queue consumer failure**: `payment-worker` consumer stops → `payment-queue` backlog metric climbs → `payment-api` latency metric climbs → 5xx rate climbs.
- **B — Bad deployment**: a new `deployments` record with a flagged config mismatch → affected service's error-rate metric climbs immediately.
- **C — DB saturation**: simulated `db_connections_used` climbs toward a simulated max → dependent API's latency/timeout metrics climb → downstream queue backlog follows.
- **D — Dependency failure/timeout**: an external-dependency health flag flips → the calling service's latency/error metrics degrade proportionally.
- **E — Intermittent failure**: a scripted response-status sequence (e.g., `200,200,timeout,200,503,200,timeout,...`) exposed through the health/metrics endpoints, deterministic per scenario seed.

Controlled randomness (e.g., exact timing jitter) is fine *inside* a scenario; the scenario's overall shape and eventual outcome must be reproducible — this is what makes evaluation possible ([14-evaluation-strategy](14-evaluation-strategy.md)).

## What tools actually do against the simulator

`restart_service`, `scale_service`, `rollback_deployment` (see [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md)) call the simulator's `/actions/*` endpoints, which apply the scenario-defined recovery logic (e.g., restarting `payment-worker` during Scenario A transitions its state back to healthy and the backlog metric begins draining on a scripted curve). This is what allows "verify recovery" to be a real, observable check rather than an assumption.

## Explicit non-goals for the simulator

- No real message broker, no real per-service database, no real container orchestration underneath it.
- No attempt to be a general-purpose chaos-engineering tool — only the named, authored scenarios matter; unscripted random failure injection is not a goal.
- No UI of its own beyond what's needed to seed/start a scenario for a demo or eval run (a simple admin trigger is enough).

## Related docs
[04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md) · [07-system-architecture](07-system-architecture.md) · [09-ai-engine-architecture](09-ai-engine-architecture.md) · [14-evaluation-strategy](14-evaluation-strategy.md) · [ADR-015](adr/ADR-015-production-simulator-scope.md)
