# 15 — Security and RBAC

## Status
Proposed.

## Identity vs. authorization (unchanged principle)
Google authenticates identity; the application database owns authorization. A newly-seen `google_sub` provisions with a default (lowest-privilege) role; role/team/production-assignment changes happen only through the application's own admin flow.

## Roles and permissions (updated for the incident domain)

Roles: USER/Viewer, OPERATOR/Developer, ADMIN (Auditor open — see [20-open-questions-and-risks](20-open-questions-and-risks.md)). See [01-pdd](01-pdd.md) for the capability table.

Permissions: `incidents.read`, `incidents.investigate`, `incidents.approve` (Medium/High-risk actions), `tools.execute` (Low-risk only, implicitly), `production.read`, `production.manage`, `teams.manage`, `users.manage`, `roles.manage`, `sla_policy.manage`, `audit.read`, `analytics.read`. (`chat.use`, `conversation.read`, `memory.read/manage` from the original chatbot permission set are dropped or repurposed — there is no standalone chat surface in this product; memory permissions fold into `incidents.investigate` since memory retrieval is part of investigation, not a separate user-facing capability.)

## The critical authorization dimension: production assignment, not just role

A role alone is not sufficient here — a USER assigned as Operator on Payments but Viewer on Orders must be able to approve a Payments incident's remediation but not an Orders one. Every incident-scoped authorization check is `(role for the incident's production, permission)`, not just `(global role, permission)`. This is a materially more complex authorization model than the original chatbot's flat per-user ownership check, and it is a genuine Must Have — see [08-data-architecture](08-data-architecture.md) `production_assignments`.

## Core principle (unchanged)
UI visibility is convenience; backend authorization is security. Every permission/production-scope check is enforced in Spring Boot; the approval gate for Medium/High-risk tool execution is additionally enforced in the Python engine's tool pipeline (see [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md)) as defense in depth, since a tool call has real (simulated) production consequences.

## Resource ownership
A user cannot read/act on an incident for a production they're not assigned to, by changing an ID — enforced by filtering every incident query by the caller's `production_assignments` at the query layer.

## Application RBAC vs. AWS IAM
Kept separate, as before. At the Level 10 AWS phase, an ADMIN application role implies nothing about AWS permissions (e.g., the ability to start/stop the EC2-hosted Simulator is an AWS IAM concern, not an application permission) — see [19-aws-strategy](19-aws-strategy.md).

## Service-to-service auth (Spring Boot -> Python engine, and both -> Simulator) — open
Unchanged open question from the original charter, now with a third leg (calls to the Simulator's action endpoints, which are consequential). See [20-open-questions-and-risks](20-open-questions-and-risks.md).

## Secrets management
Local dev: `.env`, not committed. AWS phase: candidate for AWS Secrets Manager, evaluated as part of the Level 10 progressive adoption (see [19-aws-strategy](19-aws-strategy.md)) — not decided yet.

## Related docs
[07-system-architecture](07-system-architecture.md) · [08-data-architecture](08-data-architecture.md) · [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md) · [19-aws-strategy](19-aws-strategy.md) · [20-open-questions-and-risks](20-open-questions-and-risks.md)
