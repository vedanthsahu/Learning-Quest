# 11 — Tool Calling and Grounding

## Status
Proposed.

## Core principle (strengthened for this domain)
Never allow an LLM to blindly execute arbitrary operations — and in this project, a tool call can mutate a (simulated) production system, so the safety pipeline is not academic. Every tool call passes through validation, authorization, timeout, and observability before execution and before its result reaches the model or the user.

## Tool registry (incident-ops tools, from source brief §16-17)

| Tool | Risk | MVP? |
|---|---|---|
| `get_service_status` | Low | Must Have |
| `get_recent_logs` | Low | Must Have |
| `get_metrics` | Low | Must Have |
| `search_previous_incidents` | Low | Must Have (retrieval-backed) |
| `get_recent_deployments` | Low | Good to Have (folds into evidence gathering) |
| `restart_service` | Medium | Must Have (the one write action the MVP demonstrates end-to-end) |
| `scale_service` | High | Good to Have |
| `rollback_deployment` | High | Good to Have |

Each entry: `name, description, input_schema, output_schema, permission_required, risk_level, timeout_ms, retry_policy` (see [08-data-architecture](08-data-architecture.md) `tools` table).

## Risk policy — invariant, not configurable away in the MVP

- **Low risk** (read-only): may execute automatically within the caller's permission scope, as part of evidence gathering.
- **Medium/High risk** (anything with a side effect — restart/scale/rollback/config change): may only be *recommended*; execution requires an explicit human approval from an OPERATOR/ADMIN authorized on that production. This is stronger than the source brief's example, which lists "restart" under Medium and describes automatic execution as reserved for "low-risk, well-defined, authorized" actions — since restart is Medium, it already falls under required-approval, and this doc makes that explicit and permanent for the MVP rather than a tunable policy default that could accidentally be loosened.

## Execution pipeline

Implementation ownership (2026-10-01): Python executes scoped read-only evidence calls and returns structured action proposals. Spring Boot owns approval records and all simulator writes; Python has no write credential. Bind approval to immutable action/target/arguments, incident version, approver, and expiry. Recheck permission and state at execution. Persist idempotency and reconcile ambiguous outcomes before retrying a write. Tool risk comes from the registry, never a model-generated value. See [25-build-blueprint](25-build-blueprint.md).

```
Model/router requests tool call (name, arguments)
        |
        v
  Input validation (arguments against input_schema)
        |
        v
  Authorization (permission_required, AND risk-based approval gate if
  Medium/High -- see above)
        |
        v
  Execution against the Production Simulator's API (with timeout_ms,
  bounded retry_policy on transient failure -- see 22-production-simulator)
        |
        v
  Result validation (output against output_schema)
        |
        v
  Observability (span: tool name, incident_id, latency, success/fail,
  retry count) + tool_calls audit row
        |
        v
  Result returned to the router / context builder
```

Any stage failing short-circuits with a structured error — the model must not receive a malformed or partial tool result silently.

## Grounding

Every diagnosis/recommendation should distinguish, per claim:

- **Deterministic fact** — e.g., service ownership, from the database.
- **Tool result** — e.g., current metrics/logs/health, from the simulator.
- **Retrieved prior incident** — from `memory_records`.
- **Model reasoning** — the model's own synthesis combining the above.

This is what the incident view's "Diagnosis (external model, reasoning-tier): ... Supporting evidence: [metrics], [logs], [1 similar incident]" display depends on ([01-pdd](01-pdd.md)), and what evaluation's diagnosis-accuracy metric checks against ground truth ([14-evaluation-strategy](14-evaluation-strategy.md)).

## Related docs
[09-ai-engine-architecture](09-ai-engine-architecture.md) · [22-production-simulator](22-production-simulator.md) · [14-evaluation-strategy](14-evaluation-strategy.md) · [15-security-and-rbac](15-security-and-rbac.md)
