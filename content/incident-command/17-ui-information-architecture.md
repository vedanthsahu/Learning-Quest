# 17 — UI Information Architecture

## Status
Proposed.

## Navigation shape (role- and production-assignment-filtered)

```
/                          -> redirect to /incidents if authenticated, else /login
/login                     -> Google SSO entry
/productions               -> My Productions (assigned productions + their services)
/incidents                 -> incident list, scoped to assigned productions, SLA-sorted
/incidents/:incidentId     -> incident detail: evidence, diagnosis, recommendation, timeline
/history                   -> resolved incident history
/notifications             -> notification center (in-app)
/admin/users               -> ADMIN
/admin/teams               -> ADMIN
/admin/roles               -> ADMIN
/admin/productions         -> ADMIN (production/service catalog, ownership)
/admin/sla-policies        -> ADMIN (seeded view; editable is Good to Have)
/admin/tools               -> ADMIN (registry, read-only)
/admin/audit               -> ADMIN
/admin/analytics           -> ADMIN (MTTx, SLA-breach rate, routing distribution, cost)
```

No `/chat` route — chat is not the product's front door (see [01-pdd](01-pdd.md)); any conversational follow-up on an incident, if built, is a panel within `/incidents/:incidentId`, not a standalone surface.

Route guards check the backend-issued permission set *and*, for incident routes, the caller's `production_assignments` — a route guard denying access to an incident from an unassigned production is UX convenience; the actual security boundary is the backend query scoping (see [15-security-and-rbac](15-security-and-rbac.md)).

## Component boundary sketch
- `IncidentDetailView` (status, evidence, diagnosis, approval controls) is composed of independently-loadable panels (`EvidencePanel`, `TimelinePanel`, `ApprovalPanel`) so a slow evidence-gathering fetch doesn't block the rest of the incident view from rendering.
- The SLA countdown is a self-contained, independently-updating component (polling or SSE) so it doesn't depend on the rest of the page re-rendering to stay accurate.

## Related docs
[16-ui-product-and-design-spec](16-ui-product-and-design-spec.md) · [15-security-and-rbac](15-security-and-rbac.md)
