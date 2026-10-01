# ADR-015 — Production Simulator Scope: Synthetic Generator vs. Real Infrastructure

## Status
Proposed.

## Context
Section 6 of the source brief describes the Production Simulator in terms that could be read either way: "simulate a small production estate with realistic dependencies," exposing "queue state," "database state," and other diagnostic information for services like `payment-api`, `payment-worker`, `payment-queue`, `payment-db`. See [22-production-simulator](../22-production-simulator.md).

## Problem
Should the simulator be built as **real running infrastructure** (actual microservices, an actual message broker, actual per-service databases, deliberately misconfigured/killed to produce failures) or as a **synthetic state/telemetry generator** (a single service maintaining scripted state machines, exposing REST endpoints that return plausible health/metrics/logs/deployment data computed from that state)?

## Options considered
- **Real infrastructure** — most "realistic" in the literal sense (actually running services that actually fail), but: (a) building 8-12 real services with real queues/databases is a substantial engineering project in its own right, disproportionate to what it teaches beyond what the rest of the stack already exercises (real PostgreSQL, eventually real EC2/RDS); (b) real distributed systems have real nondeterminism, which directly undermines the reproducibility that [14-evaluation-strategy](../14-evaluation-strategy.md) depends on; (c) it risks the project quietly becoming "build a small real production system" instead of "build an incident-command system," which is exactly the scope-creep failure mode the source brief warns against (§41-42).
- **Synthetic state/telemetry generator** — a scripted state machine per simulated service, driving REST endpoints that look like a real ops surface. Trivially reproducible (the same script produces the same signals), far less implementation effort, and the incident-command system genuinely has to investigate an external system through its API surface (not read its own internal state), which preserves the architectural separation the source brief itself calls for (Simulator as a peer component, later on separate EC2 infrastructure).

## Decision
**Synthetic state/telemetry generator.** "Restarting" a simulated service transitions its scripted state machine; there is no real process to restart. See [22-production-simulator](../22-production-simulator.md) for the concrete API shape and scenario scripts.

## Rationale
The simulator's job is to produce *investigation-worthy signals*, not to *actually run a production system*. A scripted generator satisfies that job while keeping effort proportionate and reproducibility guaranteed by construction — which is a harder property to get from real infrastructure, not an easier one.

## Tradeoffs
A synthetic generator is a simplification the source brief's own "queue state, database state" language doesn't fully anticipate — this is flagged deliberately rather than silently narrowed, per the instruction not to preserve or extend scope without checking whether it earns its place. If genuinely realistic (nondeterministic, load-bearing) infrastructure behavior is later judged necessary for the project's credibility, that would need a new ADR reversing this one, not a quiet scope expansion.

## Consequences
No Kafka/RabbitMQ, no per-service databases, no container orchestration for the simulated estate (see [04-must-have-vs-good-to-have](../04-must-have-vs-good-to-have.md) Not Now list) — this materially shrinks the project's total infrastructure footprint versus a literal reading of the source brief.

## Reconsideration conditions
Revisit only if evaluation or demonstration credibility genuinely requires real infrastructure behavior that scripting cannot approximate — not anticipated within this project's scope.
