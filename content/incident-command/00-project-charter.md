# 00 — Project Charter

## Status
Build direction updated 2026-10-01. The product remains incident command for SLA protection. The implementation plan is [25-build-blueprint](25-build-blueprint.md): reuse the existing four services, complete a safe incident-to-recovery workflow, then measure Ollama and free OpenRouter models before adding adaptive routing. This is a target architecture, not a claim of completed implementation.

## Product

**AI-Assisted Incident Command for SLA Protection.**

## Core business problem

> Production incidents consume a finite SLA window, and a significant portion of that window can be lost to detection, notification, context-gathering, investigation, decision-making, coordination, and human error — not to the actual fix.

## Objective (defensible, not overreaching)

> Reduce avoidable SLA breaches by reducing incident investigation, coordination, decision, and response latency, while preserving human authority over risky operational actions.

This is explicitly **not** a promise that SLAs will never be breached. The evaluation strategy ([14-evaluation-strategy](14-evaluation-strategy.md)) exists specifically to test whether this objective is actually met, not to assume it.

## Central thesis

**Product thesis**: Production incidents consume a finite SLA window, and avoidable time is often spent gathering context, coordinating people, investigating evidence, and deciding on remediation. This project explores whether an AI-assisted incident-command system can reduce that latency and human error while preserving human authority over high-risk operational actions.

**Technical thesis — Adaptive Incident Reasoning**: the AI engine selects the least expensive and least complex execution strategy capable of handling each part of an investigation — deterministic logic, production tools, retrieval, a local model, a benchmark-qualified free external model, or human escalation — while measuring quality, latency, reliability, and operational outcomes. External does not inherently mean stronger; routing must earn its complexity through comparison with a single-model baseline.

Both statements are working hypotheses, not immutable — challenge them if a better formulation emerges during implementation.

## What changed from the original framing, and why

The original project was centered on "hierarchical AI / multi-model routing" as the product itself. That's a real technical capability but not a reason for a product to exist — routing is a *means*, not a *problem*. Incident command for SLA protection gives routing an actual job: deciding, under a running clock, whether a given piece of investigation work needs a database lookup, a tool call, retrieval, a cheap model, an expensive model, or a human — where getting that decision right has a measurable business consequence (time saved, errors avoided) instead of an abstract one ("the router handled X% without escalation").

## Success criteria

The project is successful if it can **demonstrate and measure** (not just claim) the full incident lifecycle in [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md), on the Production Simulator, with real evidence:

1. A simulated production failure is deterministically detected, an incident is created with a running SLA clock, and the owning team is correctly identified — without any LLM call in this path (see [09-ai-engine-architecture](09-ai-engine-architecture.md) invariant).
2. An AI investigation gathers evidence from at least two independent sources (e.g., metrics + logs) **concurrently**, with a measured latency improvement over doing it sequentially.
3. The system produces a diagnosis and a recommended remediation, and can show which execution tier (deterministic/tool/retrieval/local model/external model) handled each step of getting there.
4. Any production-affecting action requires human approval before execution, and this is enforced in code, not just UI convention.
5. A fixed set of reproducible incident scenarios ([22-production-simulator](22-production-simulator.md)) produces real, reproducible numbers for diagnosis accuracy, MTTA/MTTD/MTTR, and SLA-breach rate — not invented ones.
6. A full request/investigation is traceable end-to-end (browser → Spring Boot → Python engine → simulator/tools/model providers) via OpenTelemetry.

If a roadmap level ([03-scope-and-roadmap](03-scope-and-roadmap.md)) is reached without this evidence, it is not done — see [21-definition-of-done](21-definition-of-done.md).

## Primary learning goals

Unchanged in kind from the original charter, now exercised through the incident domain rather than a generic chatbot:

- **Frontend**: React/TypeScript, an incident-centered dashboard (not a chat window), SLA countdown UI, role-aware navigation, real-time-ish status updates.
- **Backend**: Java/Spring Boot/Spring Security — now with a real, non-trivial domain model (incidents, teams, productions, SLA policies, notifications) rather than thin CRUD around conversations.
- **Infra/data**: PostgreSQL (system of record for the incident domain), Redis (if a concrete rate-limiting/caching need emerges), Milvus (weighed against pgvector — see [ADR-006](adr/ADR-006-milvus.md), now with a much smaller realistic corpus size than originally assumed), S3.
- **AI engineering**: adaptive routing with a genuine business reason (SLA time), concurrent evidence gathering, tool-based production interaction with real risk controls, grounding, evaluation against reproducible scenarios.
- **Cloud (AWS)**: progressive adoption using the available AWS credits (see "AWS posture" below) — Bedrock as a model provider, EC2 hosting the Production Simulator, RDS for the application database, S3, and a real frontend deployment. See [19-aws-strategy](19-aws-strategy.md).

## AWS posture (new)

The user has AWS credits: **$100 USD, 161 days remaining as of 2026-09-02** (expires 2027-02-08 or on depletion), region **ap-south-1 (Mumbai)**. This is real, budgeted capacity — not a hypothetical future phase to defer indefinitely. AWS adoption should therefore be **progressive and deliberate, starting once the local system is correct and measurable, not withheld until the very end**. See [19-aws-strategy](19-aws-strategy.md) for the phased plan and cost-discipline rules. Credits are an opportunity to *use* AWS services meaningfully, not a reason to use every AWS service that exists.

## Non-goals

- A ServiceNow/PagerDuty/Datadog clone, a full ITSM system, a CMDB, an autonomous DevOps agent, a Kubernetes management platform, a massive multi-agent framework, or a generic enterprise chatbot. Those systems already exist; duplicating them is not the point.
- Guaranteeing SLA compliance. Reducing avoidable latency, and measuring whether it worked, is the point.
- Real production infrastructure. The "productions" this system manages are entirely simulated — see [22-production-simulator](22-production-simulator.md) for why this is deliberately a synthetic telemetry generator, not a fleet of real running microservices.
- Fine-tuning/training custom models, Kubernetes, Kafka, service mesh, multiple competing agent frameworks, unnecessary microservice decomposition — see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md).
- Node.js as an additional backend, absent a concrete requirement that Spring Boot can't reasonably satisfy.

## Constraints and assumptions

- Single primary developer, not a distributed org — shapes how much process (multi-environment CI/CD, elaborate notification infra) is worth building.
- Local/Docker-first development; AWS is a real but *progressive* second track, not day one (see [18-deployment-strategy](18-deployment-strategy.md)).
- Small user/team/production count by design (see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md), [22-production-simulator](22-production-simulator.md)) — "small domain, deep engineering," not "large domain, shallow engineering."
- AWS spend is bounded by the $100 credit; every AWS service adoption should have an explicit cost-monitoring answer (see [19-aws-strategy](19-aws-strategy.md)).
- Initial inference uses existing local Ollama Llama models plus explicitly selected free OpenRouter models. AgentNow is a candidate pending its exact API URL and access verification; older references to AgentRouter do not establish equivalence. No automatic paid fallback. See [ADR-010](adr/ADR-010-api-cloud-model-strategy.md).

## Related docs
[01-pdd](01-pdd.md) · [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) · [22-production-simulator](22-production-simulator.md) · [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md) · [20-open-questions-and-risks](20-open-questions-and-risks.md)
