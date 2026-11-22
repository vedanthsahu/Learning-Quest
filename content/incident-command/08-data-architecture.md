# 08 — Data Architecture

## Status
Proposed.

## Storage responsibilities

| Store | Owns | Does NOT own |
|---|---|---|
| PostgreSQL (+ pgvector) | Users, teams, roles, permissions, production/service catalog, production assignments, incidents, incident_events, SLA/escalation policy, notifications, tool metadata/calls, model runs, memory metadata + embeddings (pgvector), audit, evaluation metadata | Large binary artifacts |
| Milvus (Good to Have, see [ADR-006](adr/ADR-006-milvus.md)) | Only if pgvector proves insufficient at real corpus size | System of record, ever |
| Redis (deferred) | Nothing yet; candidate: external-API rate-limit counters | System of record |
| S3 (MinIO locally) | Incident artifacts, exported diagnostic reports, evaluation datasets | Anything queried relationally |

## Indicative schema areas (planning shape, from source brief §31, trimmed to what's actually needed)

```
users(id, google_sub, email, display_name, created_at)
teams(id, name)
team_memberships(user_id, team_id)
roles(id, name)
permissions(id, name)
user_roles(user_id, role_id)
role_permissions(role_id, permission_id)

production_environments(id, name)
services(id, production_id, name, owning_team_id)
service_dependencies(service_id, depends_on_service_id)
production_assignments(user_id, production_id, role)   -- per-production role

incident_categories(id, name, default_severity)
sla_policies(id, severity, sla_minutes)
incidents(id, service_id, category_id, severity, status,
          sla_policy_id, sla_deadline_at, created_at, resolved_at)
incident_events(id, incident_id, event_type, actor (user_id|system|ai),
                payload, created_at)   -- the timeline
investigations(id, incident_id, started_at, completed_at, status)
investigation_evidence(id, investigation_id, source_type, source_ref,
                        content, latency_ms, created_at)
recommendations(id, investigation_id, action_tool_id, risk_level,
                 confidence, rationale, created_at)
approvals(id, recommendation_id, approver_user_id, decision, created_at)

tools(id, name, description, input_schema, output_schema,
      permission_required, risk_level, timeout_ms, retry_policy)
tool_calls(id, incident_id, tool_id, input, output, status,
           latency_ms, created_at)
model_runs(id, investigation_id, provider, model_id, tier, tokens_in,
           tokens_out, estimated_cost, latency_ms, created_at)

memory_records(id, type, content, embedding, source_incident_id,
               confidence, importance, status, created_at, updated_at)

notifications(id, incident_id, team_id, channel, status, created_at)

audit_events(id, actor_user_id, action, resource_type, resource_id,
             created_at, metadata)
evaluation_runs(id, scenario_id, started_at, completed_at)
evaluation_results(id, evaluation_run_id, metric_name, value)
```

Not every entity from the source brief's longer list (§31) is included — e.g., `notification_attempts` as a separate table is folded into `notifications.status` transitions for MVP; a dedicated attempts table is Good to Have if multi-channel retry logic (Slack/email) is built later. This is illustrative for planning, not a final migration.

## Cross-cutting rule: resource ownership by production assignment

Every incident-domain read is scoped by the requesting user's `production_assignments` — a user can only see/act on incidents for services within productions they're assigned to, enforced at the query layer (see [15-security-and-rbac](15-security-and-rbac.md)), not by trusting client-supplied IDs.

## Why pgvector, not a separate Milvus deployment, for `memory_records`

Keeping the embedding as a column on `memory_records` (pgvector) rather than a separate Milvus service avoids a second store to keep in sync, at a corpus size (see [22-production-simulator](22-production-simulator.md) — dozens to low hundreds of incidents realistically) where pgvector's ANN performance is not a limiting factor. See [ADR-006](adr/ADR-006-milvus.md) for the full reversal rationale from the original charter.

## S3 vs. PostgreSQL boundary
Unchanged rule of thumb: structured/relational/small → PostgreSQL; blob/archive/bulk-by-key → S3. Candidate S3 use: exported incident post-mortem reports, evaluation run artifacts.

## Related docs
[07-system-architecture](07-system-architecture.md) · [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) · [10-memory-architecture](10-memory-architecture.md) · [ADR-004](adr/ADR-004-postgresql.md) · [ADR-006](adr/ADR-006-milvus.md)
