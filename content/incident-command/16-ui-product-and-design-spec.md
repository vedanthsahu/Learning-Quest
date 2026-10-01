# 16 — UI Product and Design Spec

## Status
Proposed.

## Principle
The UI is centered on the **incident**, not chat (see [01-pdd](01-pdd.md)). A plain incident list + detail view is the correct early deliverable; the evidence/timeline/trace visualization layers on top once real telemetry exists (Level 5+).

## Screens by role

**USER/Viewer**: My Productions, Incidents (read-only, scoped to assigned productions), incident detail (evidence/recommendation, read-only).
**OPERATOR**: adds: acknowledge incidents, trigger/view investigations, approve Medium/High-risk actions for assigned productions, incident history.
**ADMIN**: adds: Users, Teams, Roles, Productions/Services catalog, SLA policy (seeded view; editable is Good to Have), Tool registry (read-only view), Audit Log, Analytics (MTTx trends, SLA-breach rate, routing distribution, model cost).

## Required states
Every data view needs loading/error/empty states — an employee with no assigned productions, or a production with no active incidents, is not an error.

## Incident detail view — the core screen (from [01-pdd](01-pdd.md)'s target shape)

```
INCIDENT #A1183 — PAYMENT API DEGRADED
Severity: P1   SLA: 30:00   Remaining: 21:42
Status: INVESTIGATING   Owner: Payments Team

Evidence gathered (concurrently, 3.1s):
  [x] Metrics | [x] Logs | [x] Deployments | [x] Similar incidents (2 matches)

Diagnosis: Payment queue consumer exhaustion
  Supporting evidence: [metrics] [logs] [1 similar incident]
  AI confidence: 91% (heuristic signal, not a calibrated probability — see 09-ai-engine-architecture)

Recommended action: Restart payment-worker   Risk: MEDIUM -> Approval required
  [Approve] [Reject]

Timeline: 14:00:01 detected -> 14:00:04 notified -> 14:00:05 investigating -> ...
```

This is a Level 5+ deliverable, built incrementally: Level 2-3 ships the incident list/detail with status and a plain-text diagnosis; the evidence panel, concurrency timing, and grounding tags layer on as the backend telemetry to support them lands (see [03-scope-and-roadmap](03-scope-and-roadmap.md)).

## Notification UI (MVP scope)
An in-app notification indicator (e.g., a badge) when a new incident affects the user's team; no email/Slack UI in MVP (see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md)).

## Admin dashboards — real data only
Sourced from the actual telemetry/evaluation pipeline ([13-observability](13-observability.md), [14-evaluation-strategy](14-evaluation-strategy.md)) — no decorative/mocked charts. If a metric has no data yet, show an empty state, not a placeholder number.

## Related docs
[01-pdd](01-pdd.md) · [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) · [17-ui-information-architecture](17-ui-information-architecture.md) · [15-security-and-rbac](15-security-and-rbac.md)
