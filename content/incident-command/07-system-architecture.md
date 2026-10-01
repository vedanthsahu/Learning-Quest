# 07 — System Architecture

## Status
Proposed.

## Component diagram

```
React + TypeScript (browser)
        |  HTTPS (REST + SSE for live incident/investigation updates)
        v
Java + Spring Boot — Application Backend
  - Google OIDC / Spring Security, RBAC
  - Users, Teams, Productions, Services, Production Assignments
  - Incidents, SLA policies, Incident Events (timeline), Notifications
  - Audit
  - service-to-service call to the AI engine
        |
        v
Python — Adaptive Incident Reasoning Engine
  - Router (deterministic / tool / retrieval / local model / external model / human)
  - Model gateway (installed Ollama models, free OpenRouter; other adapters optional)
  - Evidence-gathering orchestration (concurrent, bounded)
  - Read-only tool orchestration and structured action proposals
  - Grounding, confidence handling
  - Evaluation harness (offline, against fixed scenarios)
        |
        +-----------------------+------------------------+
        v                       v                        v
  PostgreSQL              Production Simulator      AI Providers
  (incident metadata,     (health/metrics/logs/     (Ollama, OpenRouter/
  memory, tool calls,     deployments/actions —     optional later
  model runs, pgvector    see 22-production-        Bedrock)
  for retrieval)          simulator)
```

Notification delivery (in-app now; Slack/email/webhook later) is a Spring Boot–owned concern, not a Python one — it's triggered by incident-domain state transitions (see [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md)), which live in Java.

## Why Java owns the incident/SLA/notification domain, not Python

Same rationale as the original architecture's Java/Python split, reinforced by the new domain: incidents, SLA policy, team/production ownership, and notification are transactional, security-scoped, audit-relevant state — exactly what Spring Boot is for. The Python engine receives an incident (or a specific investigation request against one) with an already-resolved `(user_id, permissions, incident context)` and does AI-runtime work only. It must not grow its own notion of "who owns this incident" beyond what it was handed.

## Why the Simulator is a peer component, not a Python-engine module

The simulator represents "the thing that's broken," and the AI engine represents "the thing investigating it" — conflating them would blur the exact separation the source brief calls out as valuable (§ Additional Context, "Production Simulator on EC2"). Keeping them as separate services (and, at the AWS phase, on separate infrastructure — see [19-aws-strategy](19-aws-strategy.md)) means the investigation genuinely queries an external system rather than reading its own internal state, which is a more honest test of the tool-calling/evidence-gathering design.

## Request lifecycle (incident investigation, target shape by Level 5)

```
1. Simulator scenario advances -> a threshold is crossed
2. Spring Boot's detection rule (polling or simulator webhook) fires ->
   creates incident, applies SLA policy, resolves owning team/service,
   sends in-app notification
3. Spring Boot calls Python engine: investigate(incident_id, context)
4. Python engine:
   a. Router decides which evidence sources are needed
   b. Concurrently (bounded): query metrics, logs, deployments, similar
      incidents (retrieval) -- see 12-concurrency-and-efficiency
   c. Context builder assembles evidence
   d. Model gateway calls the appropriate tier for diagnosis/hypothesis
   e. Grounding ties the diagnosis to the evidence that supports it
   f. Risk policy classifies the recommended action's risk level
5. Python engine returns diagnosis + recommendation + risk + evidence
   trail to Spring Boot
6. Spring Boot persists investigation results, updates incident state,
   requests human approval if risk requires it
7. On approval, Spring Boot revalidates the bound action, permissions,
   expiry and idempotency, then calls the Simulator's authenticated write endpoint
8. Verification: poll the Simulator's health signal until recovery
   criteria met or timeout -> incident RESOLVED or ESCALATED
```

Every stage in 4 must emit trace spans (see [13-observability](13-observability.md)) — required for the UI's evidence/timeline view ([01-pdd](01-pdd.md)), not an add-on.

## Service boundaries — what NOT to let leak across

Updated implementation contract: [25-build-blueprint](25-build-blueprint.md). Python does not receive simulator write credentials. PostgreSQL is owned by Spring Boot for incident state; retrieval access is restricted to authorized production scope. The provider labels below are conceptual, not evidence that their adapters exist; AgentNow remains unverified and is not assumed to be AgentRouter.

- Spring Boot must not embed diagnosis/routing/model-selection logic.
- The Python engine must not become the authorization decision point, must not own notification delivery, and must not directly mutate incident state in PostgreSQL — it returns results; Spring Boot is the only writer of incident-domain truth.
- The Simulator must not know anything about users, roles, or incidents — it only knows about its own simulated services/scenarios and exposes read/action endpoints.

## Related docs
[08-data-architecture](08-data-architecture.md) · [09-ai-engine-architecture](09-ai-engine-architecture.md) · [22-production-simulator](22-production-simulator.md) · [15-security-and-rbac](15-security-and-rbac.md) · [ADR-008](adr/ADR-008-sse-vs-websockets.md)
