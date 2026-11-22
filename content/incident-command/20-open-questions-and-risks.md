# 20 — Open Questions and Risks

## Status
Living document. Re-read at the start of every session. Substantially rewritten for the incident-command pivot (2026-09-02) — old chatbot-specific questions retired where no longer relevant, new incident/SLA/simulator/AWS questions added.

## Foundational assumptions made during this revision (confirm or correct)

### Build-plan decisions — 2026-10-01

- The simulator is already Python; Q1's earlier choice is resolved by the existing implementation.
- Use installed Ollama Llama models and implement the existing OpenRouter stub first. Q2's old AgentRouter comparison is superseded by [ADR-010](adr/ADR-010-api-cloud-model-strategy.md).
- The user's AgentNow candidate needs an exact provider URL/API and verified free access. Do not assume it is AgentRouter. This blocks only that optional adapter.
- Exact installed Ollama tags, benchmark-selected models, and the free OpenRouter model allowlist remain open; the current configured local default is not an inventory.
- Current authentication, production-scoped authorization, approval enforcement, migrations, and full runtime behavior need acceptance evidence. Domain entities alone do not close these gaps.
- Current AWS credit/expiry and any paid-service decision require account verification; historical balances are not current facts.
- Use [25-build-blueprint](25-build-blueprint.md) for execution order and [18-deployment-strategy](18-deployment-strategy.md) for optional cloud gates. Earlier dated assumptions below are historical where they differ.

1. Single primary developer — shapes process/CI rigor.
2. Local/Docker-first, with a **real, progressive AWS track** starting once local is correct (not deferred indefinitely) — see [19-aws-strategy](19-aws-strategy.md).
3. Small simulated org: 2-3 productions, 8-12 services, a handful of teams, a small seeded user set.
4. AWS spend bounded by the $100 credit / 161-day window (as of 2026-09-02) — every AWS adoption needs a cost-monitoring answer.
5. External inference starts with explicitly free OpenRouter models; actual quota/reliability remain to be measured. AgentNow is an optional candidate pending identification.
6. No stated timeline/effort budget beyond the credit expiry.

## Open questions that block or shape Level 0-3 implementation

| # | Question | Affects | Suggested default if not answered |
|---|---|---|---|
| Q1 | Resolved: simulator language | [22-production-simulator](22-production-simulator.md) | Keep the existing Python implementation |
| Q2 | Initial provider selected; AgentNow identity open | [ADR-010](adr/ADR-010-api-cloud-model-strategy.md) | Implement free OpenRouter alongside Ollama; obtain exact AgentNow documentation before a second external adapter |
| Q3 | Exact local model (within the confirmed 1-3B primary range) for Ollama? | [ADR-009](adr/ADR-009-local-model-strategy.md) | Benchmark 2-3 candidates (e.g., a Llama/Qwen/Phi class 1-3B instruct model) at Level 3 implementation time on the actual i5-10210U hardware before locking in |
| Q4 | Service-to-service auth: Spring Boot<->Python<->Simulator | [15-security-and-rbac](15-security-and-rbac.md) | Shared-secret header on a private network for local/EC2-phase dev; revisit before any public exposure |
| Q5 | SLA policy seed values (P1=30min etc.) — final or illustrative? | [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) | Treat as illustrative; finalize during Level 1 admin-seed implementation, not now |
| Q6 | Confidence-score threshold for triggering human escalation | [09-ai-engine-architecture](09-ai-engine-architecture.md) | No fixed default — must be tuned against Level 9 evaluation data, not guessed in advance |
| Q7 | Baseline-measurement protocol: self-timed manual runs, or no baseline claim? | [14-evaluation-strategy](14-evaluation-strategy.md) | Self-timed manual runs against the same fixed scenarios — see the doc's full reasoning |
| Q8 | Auditor role — needed? | [01-pdd](01-pdd.md) | Defer; ADMIN's audit.read covers it until separation-of-duties is a real requirement |
| Q9 | Redis — any concrete use case yet? | [ADR-005](adr/ADR-005-redis-usage.md) | Drop from Level 0-7 scope; revisit only if a real external-API rate-limit problem appears |
| Q10 | Memory conflict detection mechanism for operational knowledge | [10-memory-architecture](10-memory-architecture.md) | Manual/explicit status transitions only for MVP; automatic detection is Good to Have |
| Q11 | Secrets management, local vs. AWS phase | [15-security-and-rbac](15-security-and-rbac.md), [19-aws-strategy](19-aws-strategy.md) | `.env` locally; AWS Secrets Manager evaluated at the RDS/EC2 phase, not decided |

## New questions created specifically by the incident/SLA scope (source brief §51, carried forward, several resolved in this revision)

Resolved in this revision (see the linked doc for the concrete answer): what constitutes an incident, what creates one, the SLA model, severity/SLA relationship, team assignment, production ownership, human-escalation triggers, which actions require approval, AI-confidence representation, unsafe-remediation prevention, what counts as "resolution," what counts as "successful remediation," how to distinguish AI-caused errors from simulator-inherent failures — all defined in [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) and [09-ai-engine-architecture](09-ai-engine-architecture.md).

Still open: how notifications escalate beyond the MVP's single SLA-percentage tier (Good to Have, [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md)); what the *actual* baseline measurement protocol yields once run (Q7 above — an empirical question, not a design one).

## Risks

**R1 — Scope breadth vs. finishing.** Even after trimming (see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md)), this project spans a real domain model, a synthetic infrastructure simulator, adaptive AI routing, concurrency, observability, evaluation, and a progressive AWS track. Mitigation: the walking-skeleton sequencing in [03-scope-and-roadmap](03-scope-and-roadmap.md) and strict adherence to the Must-Have list.

**R2 — Production Simulator scope creep toward real infrastructure.** The single biggest concrete risk of quietly rebuilding "ServiceNow + PagerDuty + Datadog." Mitigation: the explicit synthetic-generator decision in [22-production-simulator](22-production-simulator.md)/[ADR-015](adr/ADR-015-production-simulator-scope.md) — no real queues, no real per-service databases, ever, without a new ADR justifying a reversal.

**R3 — Free-API reliability.** Actual OpenRouter quotas, availability, and model quality remain to be measured for this workload. Mitigation: bounded attempts, local-only mode, an eligible Ollama fallback when time permits, and an evidence-only outcome for human investigation when inference is unavailable. No silent paid fallback; AgentNow remains unverified.

**R4 — Uncontrolled spend once Bedrock or a paid API tier is wired in.** Mitigation: hard spend/call caps from the moment any paid provider is integrated (see [ADR-010](adr/ADR-010-api-cloud-model-strategy.md), [19-aws-strategy](19-aws-strategy.md)), CloudWatch billing alarms once on AWS.

**R5 — Evaluation metric fabrication pressure**, now sharper because the project's headline claim is about *SLA protection*, a business-sounding number that's tempting to round up. Mitigation: the explicit no-fabrication rule and the baseline-protocol decision in [14-evaluation-strategy](14-evaluation-strategy.md).

**R6 — Confidence-score misinterpretation.** Treating a model's self-reported "91% confidence" as meaningful without calibration would make both the UI and the evaluation dishonest. Mitigation: explicit caveat and separate-measurement rule in [09-ai-engine-architecture](09-ai-engine-architecture.md) and [14-evaluation-strategy](14-evaluation-strategy.md).

**R7 — The baseline problem undermines the headline experiment if not handled honestly.** See [14-evaluation-strategy](14-evaluation-strategy.md) — a fabricated or hand-waved "typical human MTTR" would be the single most damaging credibility gap in the whole project, since it's the number the entire product thesis rests on.

**R8 — Retrofitting observability/tracing across four components (now including the Simulator) instead of three.** Same mitigation as before: introduce trace-ID propagation as soon as cross-service calls exist, don't defer to the end.

**R9 — AWS phase distracting from core product correctness.** Real credits and a real learning goal create a temptation to start the AWS track before the local system is actually correct/measurable. Mitigation: [18-deployment-strategy](18-deployment-strategy.md)'s explicit sequencing — AWS phases begin only after the corresponding local piece is done, never in parallel with unfinished core logic.

## Related docs
Every doc above links back here. See especially [00-project-charter](00-project-charter.md), [03-scope-and-roadmap](03-scope-and-roadmap.md), [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md), [22-production-simulator](22-production-simulator.md).
