# 01 — Product Definition Document (PDD)

## Status
Target product, updated 2026-10-01. The central abstraction is the **Incident**. Build and acceptance sequence: [25-build-blueprint](25-build-blueprint.md).

## First usable product

An operator can follow one simulated failure from detection through evidence-backed diagnosis, approval, action, and verified recovery in a single workspace. Start with Scenario A, sequential evidence collection, and an installed Ollama Llama model; then compare a free OpenRouter model on the same evidence. Broader scenarios, concurrency, and memory follow this complete workflow.

The UI shows observed facts separately from model hypotheses, with evidence links, provider/model identity, routing reason, missing evidence, and fallback failures. If inference is unavailable, the incident and evidence remain usable for manual investigation. Local-only mode makes no external inference calls. An external provider's availability or a model's confidence never changes who is allowed to approve an action.

## Central abstraction: the Incident

```
INCIDENT
   |
   +-- Production / Service
   +-- Category
   +-- Severity
   +-- SLA (policy + running clock)
   +-- Owner / Team
   +-- Timeline (event log)
   +-- Evidence (investigation results)
   +-- Investigation (AI + human)
   +-- Recommendations
   +-- Actions (tool calls, approvals)
   +-- Resolution
```

Chat/conversational interaction is a way to *interact with* an incident's investigation (ask a follow-up, request more detail) — it is not the app's front door. The front door is the incident list and the SLA clock. See [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) for the full domain model.

## Users and org model

```
Employee
  +-- Team membership (e.g., Payments Team)
  +-- Production assignment(s) + role per production (e.g., Payments -> Operator, Orders -> Viewer)
```

Deliberately simple — no separate "profile" subsystem. A production assignment carries a role (Viewer/Operator/Admin, see [15-security-and-rbac](15-security-and-rbac.md)) that governs what the employee can see and do *for that production specifically*. "Current production context" is a UI concept (a switcher), not a new backend abstraction.

## Roles

| Role | Can do | Cannot do |
|---|---|---|
| USER / Viewer | View incidents for assigned productions, view AI evidence/recommendations, acknowledge incidents | Execute tools, approve risky actions, manage config |
| OPERATOR / Developer | Everything above, plus: investigate, approve Medium/High-risk actions for their assigned productions, execute Low-risk tools | Manage users/teams/roles, manage SLA/escalation policy, view cross-org analytics |
| ADMIN | Everything above, plus: users/teams/roles/permissions, productions/services catalog, SLA policies, tool registry, audit log, analytics | — |

An Auditor role (read-only over audit + analytics, no operational access) remains open — see [20-open-questions-and-risks](20-open-questions-and-risks.md).

## Core user journeys

1. **Incident detected.** A simulated production failure crosses a deterministic threshold in the Production Simulator → an incident is created with a severity, an SLA clock, and an identified owning team → the assigned team is notified (in-app at minimum).
2. **Investigate.** An OPERATOR opens the incident → triggers (or the system auto-triggers) an AI investigation → sees evidence gathered concurrently from independent sources (metrics, logs, deployment history, similar past incidents) → sees a diagnosis with its supporting evidence, not just a paragraph.
3. **Decide and act.** The system proposes a remediation with a risk level → if Medium/High risk, an authorized OPERATOR/ADMIN for that production must approve before it executes → the action executes through the controlled tool pipeline → recovery is verified against the simulator's own signals → the incident resolves.
4. **Learn.** The resolved incident (root cause, remediation, timeline) becomes retrievable context for future similar incidents (see [10-memory-architecture](10-memory-architecture.md)).
5. **Admin.** An ADMIN defines productions/services/ownership, SLA policies per incident category/severity, and reviews analytics on whether AI assistance is actually reducing MTTR and SLA breaches (see [14-evaluation-strategy](14-evaluation-strategy.md)).

## What "the underlying engineering being visible" means here

The incident view should show the AI's actual work, not a black box:

```
INCIDENT #A1183 — PAYMENT API DEGRADED
Severity: P1   SLA: 30:00   Remaining: 21:42
Status: INVESTIGATING   Owner: Payments Team

Evidence gathered (concurrently, 3.1s):
  [x] Metrics       -- queue depth spiking since 14:00:02
  [x] Logs          -- consumer error pattern matches queue-timeout
  [x] Deployments   -- no recent deploy (ruled out)
  [x] Similar incidents -- 2 matches (see below)

Diagnosis (external model, reasoning-tier):
  Payment queue consumer exhaustion
  Supporting evidence: [metrics], [logs], [1 similar incident]

Recommended action: Restart payment-worker
Risk: MEDIUM -> requires approval
```

This is a functional requirement on the AI engine and API (it must emit this structured trail), not a UI-only concern — see [09-ai-engine-architecture](09-ai-engine-architecture.md) and [13-observability](13-observability.md).

## Explicitly out of scope for the PDD

- Real production integrations (real Datadog/PagerDuty/Slack webhooks as the primary interface) — the simulator and in-app notification are the MVP surface; Slack/webhook channels are Good to Have (see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md)).
- Multi-tenant/multi-organization support — single organization.
- Autonomous execution of Medium/High-risk actions without human approval, ever, in the MVP.

## Related docs
[00-project-charter](00-project-charter.md) · [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) · [22-production-simulator](22-production-simulator.md) · [16-ui-product-and-design-spec](16-ui-product-and-design-spec.md) · [15-security-and-rbac](15-security-and-rbac.md)
