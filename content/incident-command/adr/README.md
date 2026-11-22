# Architecture Decision Records — Index

Revised 2026-09-02 for the AI-Assisted Incident Command for SLA Protection pivot. Most ADRs are still `Proposed`; a few are now `Confirmed` where the new context resolved a prior open question.

| ADR | Decision | Status |
|---|---|---|
| [001](ADR-001-react-vs-angular.md) | React vs Angular | Proposed |
| [002](ADR-002-java-spring-boot-vs-node.md) | Java/Spring Boot vs Node.js for the application backend | Proposed |
| [003](ADR-003-python-genai-engine.md) | Python for the AI/adaptive-reasoning engine | Proposed |
| [004](ADR-004-postgresql.md) | PostgreSQL as system of record | Proposed |
| [005](ADR-005-redis-usage.md) | Redis usage | Proposed — no concrete use case yet |
| [006](ADR-006-milvus.md) | Vector retrieval: pgvector vs Milvus | Proposed — **reversed**: pgvector is now the default, Milvus demoted |
| [007](ADR-007-s3.md) | S3 for object storage | Proposed |
| [008](ADR-008-sse-vs-websockets.md) | SSE vs WebSockets for streaming | Proposed |
| [009](ADR-009-local-model-strategy.md) | Local model runtime/hardware strategy | **Confirmed** (Ollama, CPU-first, i5-10210U/32GB) — exact model open |
| [010](ADR-010-api-cloud-model-strategy.md) | External/reasoning-tier model provider | Proposed — constraint confirmed (free-API), provider open (OpenRouter default) |
| [011](ADR-011-memory-architecture.md) | Memory architecture (categories, storage split, lifecycle) | Proposed |
| [012](ADR-012-concurrency-model.md) | Concurrency model | Proposed |
| [013](ADR-013-observability-stack.md) | Observability stack (OpenTelemetry) | Proposed |
| [014](ADR-014-dev-vs-deployment-architecture.md) | Local/dev vs. cloud deployment architecture | **Confirmed** direction: local-first, then progressive AWS — exact per-phase topology open |
| [015](ADR-015-production-simulator-scope.md) | Production Simulator: synthetic generator vs. real infrastructure | Proposed — synthetic generator chosen |

See [../20-open-questions-and-risks.md](../20-open-questions-and-risks.md) for the specific open questions feeding ADR-005, 006, 009 (exact model), 010 (exact provider), and 014/019 (AWS phase topology).

## Superseded by this revision
ADR-006, 009, 010, and 014 were materially revised from their original (generic-chatbot-project) form — see each file's Context section for what changed and why. Read the current file, not any earlier description of these decisions from before 2026-09-02.
