# Incident Command AI — Documentation Index

Persistent source of truth for the project, written to remain useful months from now. Every doc distinguishes **confirmed**, **proposed**, **assumption**, **open question**, and **deferred** — do not treat a proposal as a decision.

Read [../CLAUDE.md](../CLAUDE.md) first, then [20-open-questions-and-risks](20-open-questions-and-risks.md).

**Build direction updated 2026-10-01:** read [25-build-blueprint](25-build-blueprint.md) for the concrete plan, current implementation gaps, model policy, milestones, and acceptance gates. Reuse the four existing services; complete an approval-gated incident recovery loop; compare installed Ollama Llama models with free OpenRouter models; then add measured routing, concurrency, memory, and optional cloud experiments. AgentNow's exact API is unresolved. The blueprint and updated ADRs supersede older planning-only and Bedrock-first sequencing statements.

**Revision note**: This package was substantially rewritten on 2026-09-02 to reflect a product pivot from a generic "hierarchical AI chatbot" to **AI-Assisted Incident Command for SLA Protection**. Old decisions were not preserved by default — each doc was re-derived from the new product direction.

## Planning package (read in this order)

| # | Doc | Purpose |
|---|-----|---------|
| 00 | [project-charter](00-project-charter.md) | Product problem, thesis, success criteria, non-goals |
| 01 | [pdd](01-pdd.md) | Incident-centered product definition, personas, core journeys |
| 02 | [sow](02-sow.md) | Statement of work — phases, deliverables, out-of-scope |
| 03 | [scope-and-roadmap](03-scope-and-roadmap.md) | Level 0–9 maturity model, incident-domain sequencing |
| 04 | [must-have-vs-good-to-have](04-must-have-vs-good-to-have.md) | Scope classification — the anti-scope-creep tool |
| 05 | [technology-stack](05-technology-stack.md) | Every technology and its justification |
| 06 | [learning-and-technology-map](06-learning-and-technology-map.md) | Learning goals mapped to the incident-domain stack |
| 07 | [system-architecture](07-system-architecture.md) | Component diagram incl. simulator, request lifecycle |
| 08 | [data-architecture](08-data-architecture.md) | PostgreSQL/Redis/Milvus/S3 responsibilities, incident schema |
| 09 | [ai-engine-architecture](09-ai-engine-architecture.md) | Adaptive Incident Reasoning: router, gateway, evidence gathering |
| 10 | [memory-architecture](10-memory-architecture.md) | Incident-domain memory: prior incidents, root causes, operational knowledge |
| 11 | [tool-calling-and-grounding](11-tool-calling-and-grounding.md) | Incident ops tool registry, risk levels, execution safety |
| 12 | [concurrency-and-efficiency](12-concurrency-and-efficiency.md) | Concurrent evidence gathering under the SLA clock |
| 13 | [observability](13-observability.md) | Traces/metrics across detection → investigation → remediation |
| 14 | [evaluation-strategy](14-evaluation-strategy.md) | Reproducible-scenario evaluation, baseline problem, MTTx metrics |
| 15 | [security-and-rbac](15-security-and-rbac.md) | Teams, production assignments, roles/permissions |
| 16 | [ui-product-and-design-spec](16-ui-product-and-design-spec.md) | Incident view, SLA clock, employee/admin screens |
| 17 | [ui-information-architecture](17-ui-information-architecture.md) | Navigation, routes |
| 18 | [deployment-strategy](18-deployment-strategy.md) | Local-first, then progressive AWS phases |
| 19 | [aws-strategy](19-aws-strategy.md) | Bedrock/EC2/RDS/S3/frontend hosting — progressive adoption, cost discipline |
| 20 | [open-questions-and-risks](20-open-questions-and-risks.md) | Everything unresolved. Re-read every session |
| 21 | [definition-of-done](21-definition-of-done.md) | Per-dimension DoD tailored to this project |
| 22 | [production-simulator](22-production-simulator.md) | The simulator as a synthetic scenario/telemetry generator |
| 23 | [incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) | The incident/SLA/severity/escalation domain model |
| 24 | [aws-prerequisites-setup-guide](24-aws-prerequisites-setup-guide.md) | Console-by-console AWS setup steps (the "how" to 19's "why"); ends with the `backend/.env` checklist |

## Architecture Decision Records

The implementation companion is [25 — Build Blueprint](25-build-blueprint.md). These planning files are currently ignored by the repository's `*.md` rule; changes remain local unless the repository documentation policy is changed explicitly.

See [adr/README.md](adr/README.md). Most ADRs are `Proposed`; local-model hardware and the local-first/progressive-AWS sequencing are `Confirmed`.
