# 05 — Technology Stack

## Status
Updated 2026-10-01: follow [25-build-blueprint](25-build-blueprint.md). Reuse installed Ollama Llama models, implement the free OpenRouter adapter, and benchmark before adaptive routing. AgentNow requires provider identification; do not equate it with older AgentRouter references. Paid inference is disabled by default. Every row must survive: "what capability does this provide that nothing else in the stack already provides."

| Technology | Role | Justification | Confidence |
|---|---|---|---|
| React + TypeScript | Frontend | Incident-centered dashboard, SLA countdown, role-aware nav — learning goal | Confirmed direction ([ADR-001](adr/ADR-001-react-vs-angular.md)) |
| Java + Spring Boot + Spring Security | Application backend | Owns identity, RBAC, teams/productions/incidents/SLA/notifications/audit — a real, non-trivial domain now, not thin CRUD | Confirmed direction ([ADR-002](adr/ADR-002-java-spring-boot-vs-node.md)) |
| Python | AI runtime (Adaptive Incident Reasoning engine) | Router, model gateway, evidence-gathering orchestration, tool orchestration, grounding | Confirmed direction ([ADR-003](adr/ADR-003-python-genai-engine.md)) |
| Production Simulator (Python) | Synthetic scenario/telemetry generator | See [22-production-simulator](22-production-simulator.md) — provides the reproducible failures the whole evaluation strategy depends on | Python implementation exists; acceptance pending (see [20-open-questions-and-risks](20-open-questions-and-risks.md)) |
| PostgreSQL | System of record | Incident domain model, RBAC, teams/productions, audit — see [08-data-architecture](08-data-architecture.md) | Confirmed direction ([ADR-004](adr/ADR-004-postgresql.md)) |
| pgvector (PostgreSQL extension) | Similar-incident retrieval | **Now the default**, not Milvus — realistic corpus size (dozens-low-hundreds of incidents) doesn't justify a dedicated vector DB. Reversal from the original charter — see [ADR-006](adr/ADR-006-milvus.md) | Proposed |
| Redis | Caching/rate-limiting | No Must Have use case yet; candidate is rate-limiting free-tier external model API calls | Deferred ([ADR-005](adr/ADR-005-redis-usage.md)) |
| S3 (MinIO locally, real S3 at AWS phase) | Object storage | Incident artifacts, exported reports/diagnostics, evaluation datasets | Proposed ([ADR-007](adr/ADR-007-s3.md)) |
| Ollama | Local model runtime | **Confirmed** — dev hardware is Intel i5-10210U, 32GB RAM, no discrete GPU; CPU-first, 1-3B models primary target, ~7B to be benchmarked, not assumed | Confirmed ([ADR-009](adr/ADR-009-local-model-strategy.md)) |
| OpenRouter free models (initial); AgentNow (unverified candidate) | External/reasoning-tier model provider | Free-access API constraint; pick one first behind the gateway rather than building dual-provider fallback logic against two unproven free APIs on day one | Selected build direction; adapter pending ([ADR-010](adr/ADR-010-api-cloud-model-strategy.md)) |
| Amazon Bedrock | Additional model provider (Level 10) | Progressive AWS adoption — real provider-comparison learning opportunity | Proposed, deferred to Level 10 ([19-aws-strategy](19-aws-strategy.md)) |
| OpenTelemetry | Observability | Only realistic way to get one trace across simulator/Python/Java/React | Proposed ([ADR-013](adr/ADR-013-observability-stack.md)) |
| Google SSO / OIDC | Authentication | Application DB remains source of truth for authorization | Proposed direction |
| Docker / docker compose | Local orchestration | Standard multi-service local dev; explicitly not Kubernetes | Proposed |

## AWS — progressive, not deferred-to-the-end (new posture)

Given real, budgeted AWS credits ($100, 161 days, ap-south-1 — see [00-project-charter](00-project-charter.md)), AWS adoption is a **planned second track starting once the local system is correct**, not a hypothetical Level-99 idea. See [19-aws-strategy](19-aws-strategy.md) for service learning goals and [18-deployment-strategy](18-deployment-strategy.md) for component acceptance gates (Bedrock is optional, not first) and the explicit cost-discipline rule: use a service because it teaches or validates something, never because it's available.

## Explicitly rejected or deferred

- **Node.js** — no requirement justifies it over Spring Boot.
- **Kafka, service mesh, Kubernetes, a second vector DB (until pgvector is proven insufficient), multiple agent frameworks, fine-tuning infrastructure, real per-service databases/brokers inside the simulator** — see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md).
- **Milvus by default** — demoted from the original charter's Must Have to Good to Have; see [ADR-006](adr/ADR-006-milvus.md) for the reversal rationale.

## Related docs
[06-learning-and-technology-map](06-learning-and-technology-map.md) · [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md) · [19-aws-strategy](19-aws-strategy.md) · [adr/README](adr/README.md)
