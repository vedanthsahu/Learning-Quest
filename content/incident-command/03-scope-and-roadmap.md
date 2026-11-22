# 03 — Scope and Roadmap

## Status
Target capabilities, updated 2026-10-01. Existing code covers portions of Levels 0–3 plus persistence/storage work; completion requires verification. [25-build-blueprint](25-build-blueprint.md) defines the execution order and acceptance gates across these levels. Start with one safe incident-to-recovery slice, then compare installed Ollama models and free OpenRouter inference, measure routing/concurrency, and expand scenarios/memory. Authentication, tests, trace IDs, and evaluation begin with the features they protect or measure, rather than waiting for their numbered level.

## Sequencing principle (unchanged from original, more important here)

Build a thin, end-to-end walking skeleton before deepening any one level: simulator emits one failure → deterministic detection creates an incident with an SLA clock → a trivial (even hardcoded) investigation runs → the UI shows it. This surfaces integration problems (simulator↔Java↔Python contracts, SLA clock semantics, notification plumbing) far earlier than perfecting any single layer in isolation.

## Levels

### Level 0 — Foundation
Repo structure (frontend / Java backend / Python AI engine / simulator), React skeleton, Spring Boot skeleton, Python engine skeleton, Production Simulator skeleton (even a single service with one hardcoded scenario), PostgreSQL running locally, one proven call path across all four components.

### Level 1 — Identity, Teams, Productions
Google SSO via Spring Security, `users/roles/permissions/teams/team_memberships/production_environments/services/production_assignments`. An ADMIN can define a production/service/team and assign an employee to it.

### Level 2 — Deterministic Detection & Incident Core
Simulator exposes health/metrics/logs endpoints for at least one scenario (Scenario A — queue consumer failure, see [22-production-simulator](22-production-simulator.md)). Deterministic threshold-based detection creates an `incident` with severity, SLA policy applied, owning team resolved — **no LLM call in this path**. Incident persisted, visible in the UI, SLA clock counting down.

### Level 3 — AI Investigation (single-threaded first)
Python engine receives an incident, gathers evidence sequentially at first (metrics + logs + deployment history), produces a diagnosis via one model call. This level intentionally ships *before* concurrency (Level 5) so there's a correct sequential baseline to measure concurrency against later.

### Level 4 — Tools, Grounding, Approval
Tool registry with schemas/permissions/risk levels; at least one Low-risk read tool and one Medium-risk write tool (e.g., `restart_service`) wired to the simulator; approval gate enforced for Medium/High risk; diagnosis grounded to the evidence that produced it.

### Level 5 — Concurrent Evidence Gathering
Independent evidence sources (metrics/logs/deployment history/similar-incident retrieval) fan out concurrently, bounded, with timeouts and a measured before/after latency comparison against Level 3's sequential baseline — this is where the SLA-clock justification for concurrency becomes real (see [12-concurrency-and-efficiency](12-concurrency-and-efficiency.md)).

### Level 6 — Retrieval & Memory
Similar-past-incident retrieval wired in (pgvector or Milvus, see [ADR-006](adr/ADR-006-milvus.md)); resolved incidents become searchable context for future ones.

### Level 7 — Notification & Escalation
In-app notification on incident creation; a single SLA-percentage-consumed escalation tier (not the full multi-stage policy engine from the source brief — see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md)).

### Level 8 — Observability
OpenTelemetry traces across simulator → Python engine → Java → UI; a real trace/timeline view in the UI (see [13-observability](13-observability.md)).

### Level 9 — Evaluation
Fixed reproducible scenarios (see [22-production-simulator](22-production-simulator.md)) run end-to-end; diagnosis accuracy, MTTA/MTTD/MTTR, SLA-breach rate computed and reproducible; baseline (manual, un-assisted) timing captured for comparison — see [14-evaluation-strategy](14-evaluation-strategy.md) for why this baseline is the hardest part to do honestly.

### Level 10 — Progressive AWS Adoption
Optional experiments: S3 artifacts, RDS persistence, EC2 simulator, frontend hosting, and separately budgeted Bedrock comparison. Each depends on its corresponding local acceptance gate, not every earlier level being complete. Bedrock is not the initial model provider or a required first AWS step. See [18-deployment-strategy](18-deployment-strategy.md).

### Level 11 — Scaling
Not anticipated to be reached; only relevant if a Level 8/9 measurement demonstrates an actual bottleneck.

## Why detection is Level 2 and concurrency is Level 5, not earlier

Detection must exist before there's anything to investigate, and it must be proven deterministic (no model call) before AI investigation is layered on — this ordering directly enforces the "don't make AI responsible for everything" principle from the source brief. Concurrency is deliberately sequenced *after* a working sequential investigation (Level 3) specifically so the "measurable performance improvement" requirement in [12-concurrency-and-efficiency](12-concurrency-and-efficiency.md) has a real baseline to compare against, rather than a claimed one.

## Related docs
[04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md) · [22-production-simulator](22-production-simulator.md) · [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) · [20-open-questions-and-risks](20-open-questions-and-risks.md)
