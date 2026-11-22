# 02 — Statement of Work

## Status
Implementation plan updated 2026-10-01. Detailed milestones and acceptance gates: [25-build-blueprint](25-build-blueprint.md).

## Current baseline: partial implementation

The repository contains React, Spring Boot, Python engine and simulator code, an Ollama adapter, incident detection/investigation, PostgreSQL migrations, and S3 integration code. OpenRouter is still an adapter stub. This is the starting point to verify and extend, not a greenfield rewrite.

**First deliverable**: reproducible local startup and Scenario A against PostgreSQL/MinIO, followed by server-enforced authorization, approval, remediation, and recovery verification. Record gaps against the definition of done; existing classes do not prove those controls work.

**Next deliverables**: free OpenRouter inference alongside installed Ollama models; measured routing and concurrency; scoped memory and Scenarios B–E; notifications, evaluation, and a reproducible demo. Paid providers and AWS are optional experiments with separate cost decisions.

## Phase 1+: Implementation, by maturity level

Follows [03-scope-and-roadmap](03-scope-and-roadmap.md) — the source of truth for sequencing; not restated here to avoid drift.

## Roles and responsibilities

Single-developer project. Implementation agents follow [../CLAUDE.md](../CLAUDE.md) and maintain documentation with architectural changes; the user owns scope, priority, and paid-service decisions. Model/API keys remain local secrets and are never documentation content.

## Out of scope for the entire engagement

- Real production monitoring/ITSM/notification platforms as dependencies — the Production Simulator and in-app notification are the system of engagement (see [22-production-simulator](22-production-simulator.md)).
- Kubernetes, Kafka, service mesh, multiple vector databases, multiple competing agent frameworks, fine-tuning/training, distributed inference clusters, unnecessary microservice decomposition (see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md)).
- Production-grade SLAs for the *tooling itself*, multi-region deployment, disaster recovery for the app (ironic given the product, but out of scope — this is a demonstration system, not a system that itself needs 99.99% uptime).
- Node.js as a backend, absent a concrete requirement.
- Autonomous execution of any Medium/High-risk production action without human approval — not a phased-in capability, a permanent invariant (see [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md)).

## Related docs
[03-scope-and-roadmap](03-scope-and-roadmap.md) · [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md) · [21-definition-of-done](21-definition-of-done.md)
