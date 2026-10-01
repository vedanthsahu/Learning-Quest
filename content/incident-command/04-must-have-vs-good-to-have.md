# 04 — Must Have vs Good to Have vs Future vs Not Now

## Status
Proposed. This is the project's primary anti-scope-creep tool. The source brief's own scope (section 41-42) already warns this project can easily become "ServiceNow + PagerDuty + Datadog + AI chatbot + DevOps automation platform" — the trims below are deliberate responses to that risk, not arbitrary cuts.

## Build order — 2026-10-01

[25-build-blueprint](25-build-blueprint.md) sequences this scope: one complete approval-gated Scenario A with installed Ollama models, then free OpenRouter integration, measured routing/concurrency, memory and remaining scenarios. Local-only operation and visible provider failure outcomes are required; paid fallback is disabled. The five-scenario scope is a final acceptance target, not the first implementation task.

## Must Have

- Production Simulator: a synthetic scenario/telemetry generator (see [22-production-simulator](22-production-simulator.md)) covering the 5 named scenario types (queue consumer failure, bad deployment, DB saturation, dependency timeout, intermittent failure), each reproducible.
- Deterministic incident detection from simulator signals — no LLM in this path.
- Incident domain model: production/service/severity/SLA/owner/timeline/evidence/investigation/recommendation/action/resolution.
- SLA clock with one severity→SLA-minutes mapping, visible countdown in the UI.
- Team/production assignment model with role-per-production.
- RBAC enforced server-side, resource ownership scoped to assigned productions.
- AI investigation producing evidence-grounded diagnosis + recommendation, with at least one concurrent evidence-gathering path measured against a sequential baseline.
- Tool registry with at least one Low-risk read tool and one Medium-risk write tool, full validation/authorization/timeout/audit pipeline, human approval required for Medium/High risk — no exceptions in the MVP.
- In-app notification on incident creation.
- Distributed tracing across simulator → Python engine → Java → UI.
- Fixed reproducible evaluation scenarios producing real diagnosis-accuracy and MTTx numbers.
- A demoable UI centered on the incident, not a chat window.

## Good to Have

- Full escalation policy engine (multi-stage T+1/T+5/T+15 timers, configurable per category) — MVP ships one SLA-percentage-consumed warning tier only.
- Slack/email/webhook notification channels — MVP is in-app only, behind a channel abstraction so these can be added without a redesign.
- Full memory lifecycle (NEW→ACTIVE→UPDATED→STALE→ARCHIVED) with automatic conflict detection for operational knowledge.
- Milvus for similar-incident retrieval, if pgvector proves genuinely limiting at the corpus size the simulator actually produces (see [ADR-006](adr/ADR-006-milvus.md) — this is a **reversal from the original charter's default**, not a restatement of it).
- Admin-configurable SLA policies and escalation policies via UI (vs. seeded config) — configurability is a UI/workflow nicety once the policy *model* exists.
- Richer trace/analytics visualization (per-tool error-rate hotspots, cost trend charts).
- A second verified free-model-API provider (AgentNow candidate, exact API unresolved) behind the gateway as a fallback — MVP picks one provider first (see [ADR-010](adr/ADR-010-api-cloud-model-strategy.md)).
- Auditor role.

## Future / Advanced

- Human-in-the-loop approval workflows richer than a single approve/reject (delegation, multi-approver).
- Graph memory / hybrid graph+vector retrieval.
- Dynamic/learned routing (vs. rule-based) for the reasoning tier selection.
- Auto-remediation for a narrowly-scoped, proven-safe class of Low-risk actions, if evaluation data ever supports it — not assumed.
- Multi-org/multi-tenant support.

## Not Now

- Kubernetes, ECS, or any orchestration beyond `docker compose` (even with EC2 in play at Level 10 — see [19-aws-strategy](19-aws-strategy.md), a single EC2 instance is sufficient for the simulator).
- Kafka or any real message broker for the simulator's "queue" concept — simulated queue *state* (a depth number, a backlog trend) is sufficient; a real broker would be infrastructure serving no evaluation purpose (see [22-production-simulator](22-production-simulator.md)).
- Real per-service databases for the simulated productions (payment-db, order-db as actual running PostgreSQL instances) — simulated *state*, not real infrastructure. See [22-production-simulator](22-production-simulator.md) for the full rationale.
- A second vector database, a second competing agent framework, model fine-tuning/training, distributed inference clusters, unnecessary microservice decomposition beyond the four defined components (React, Spring Boot, Python engine, Simulator).
- Node.js as an additional backend.
- Deep implementation of all 13 admin domains listed in the source brief (§23) at once — MVP admin surface is: Users/Teams/Roles, Productions/Services, SLA policy (seeded, not UI-editable), Tool registry (read-only view), Audit log. Escalation Policies, Notification Policies, and AI Configuration as *editable UI* are Good to Have/Future.

## Notes on borderline items (carried over and re-evaluated)

- **Redis**: still no Must Have use case. The incident domain adds one plausible candidate — rate-limiting calls to a free-tier external model API with a low per-minute quota — but this can start as an in-process bounded counter for a single-instance POC; revisit only if a second instance or a real quota problem appears. See [ADR-005](adr/ADR-005-redis-usage.md).
- **Milvus vs. pgvector**: the original charter kept Milvus "because it's a learning goal" despite a small realistic corpus. With the incident domain's realistic scale now known (a handful of scenario types, dozens to low hundreds of resolved incidents over the project's lifetime — see [22-production-simulator](22-production-simulator.md)), that corpus is smaller than the original chatbot's already-small assumption. Recommendation reversed: **pgvector is now the Must Have default**, Milvus demoted to Good to Have, revisited only if the corpus genuinely grows or the learning objective is judged worth the operational cost anyway. See [ADR-006](adr/ADR-006-milvus.md).
- **Bedrock**: Good to Have at Level 6 (routing needs a real reasoning tier from day one, satisfied by a free-API provider), becomes concretely valuable at Level 10 once the AWS phase begins — it's both a learning objective and a real provider-comparison opportunity (see [19-aws-strategy](19-aws-strategy.md)).

## Related docs
[03-scope-and-roadmap](03-scope-and-roadmap.md) · [22-production-simulator](22-production-simulator.md) · [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) · [05-technology-stack](05-technology-stack.md) · [20-open-questions-and-risks](20-open-questions-and-risks.md)
