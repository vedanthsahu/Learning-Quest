# 06 — Learning and Technology Map

## Status
Proposed.

## Purpose
Same as the original charter's intent — this project's technology choices are driven by learning goals as much as necessity. Re-mapped to the incident domain so a future session can tell whether a proposed simplification would silently remove a learning objective.

| Learning goal | Where it's exercised now | Acceptable to shortcut? |
|---|---|---|
| React component/state architecture, real-time-ish UI | Incident view, SLA countdown, evidence/timeline panels ([16-ui-product-and-design-spec](16-ui-product-and-design-spec.md)) | No |
| Role-aware UI scoped to production assignment | Production switcher, per-production role gating | No |
| Spring Boot / Spring Security with a real domain | Incidents/teams/productions/SLA/notifications ([15-security-and-rbac](15-security-and-rbac.md)) — a materially richer domain than the original chatbot's conversations table | No |
| Java concurrency | Notification fan-out, any Java-side independent I/O | No, but modest scope is fine |
| PostgreSQL relational modeling at real complexity | Incident/SLA/team/production schema ([08-data-architecture](08-data-architecture.md)) | No |
| Redis | Rate-limiting/caching | Yes — Good to Have, skip if no concrete need emerges |
| Vector retrieval concepts | Similar-incident retrieval | Partially — the *retrieval concept* is Must Have; **Milvus specifically is no longer assumed** given the realistic small corpus (see [ADR-006](adr/ADR-006-milvus.md)) — pgvector satisfies the concept without the operational cost |
| Adaptive routing with a real business reason | [09-ai-engine-architecture](09-ai-engine-architecture.md) — routing now has a measurable SLA-time consequence, not just an abstract cost metric | No — this is the project's core thesis |
| Memory design tied to a domain (not generic chat memory) | [10-memory-architecture](10-memory-architecture.md) — prior incidents/root causes/operational knowledge | No |
| Tool calling with real, consequential risk controls | [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md) — tools now cause simulated production actions, not abstract side effects | No |
| Bounded concurrency with a genuine business justification | [12-concurrency-and-efficiency](12-concurrency-and-efficiency.md) — the SLA clock gives concurrency an actual stake | No |
| Distributed tracing across 4 components (incl. simulator) | [13-observability](13-observability.md) | No |
| Evaluation methodology against ground truth | [14-evaluation-strategy](14-evaluation-strategy.md) — scenarios have known correct answers by construction | No |
| AWS: IAM/S3/Bedrock/EC2/RDS, progressive | [19-aws-strategy](19-aws-strategy.md) | No longer freely shortcuttable — credits make this a real, planned track, not optional polish |

## Principle for future tradeoff decisions

Unchanged: check this table before substituting a "simpler" alternative for something marked "No" — the complexity there is intentional and load-bearing for the learning purpose. Where this revision *changed* a prior "No" to a softer stance (Milvus), that reversal is explicit and reasoned (see [ADR-006](adr/ADR-006-milvus.md)), not a silent regression.

## Related docs
[00-project-charter](00-project-charter.md) · [05-technology-stack](05-technology-stack.md)
