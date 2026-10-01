# 25 — Build Blueprint

## Direction and status — 2026-10-01

Build an incident workspace that turns a reproducible failure into evidence, a diagnosis, a human decision, and verified recovery. Retain React, Spring Boot, the Python AI engine, and the Python simulator. Use the user's existing Ollama Llama models and free OpenRouter models behind one gateway. AWS is an optional deployment and learning track, not a dependency for a successful product demo.

This document defines the proposed implementation plan and acceptance gates. It does not claim these capabilities already exist. It supersedes older sequencing statements that require Bedrock first or completion of every local level before any individual cloud experiment.

Repository inspection shows incident/identity domain code, detection, investigation, UI components, an Ollama adapter, PostgreSQL migrations, and S3 integration code. The OpenRouter adapter still raises `NotImplementedError`. Docker Compose currently defines PostgreSQL and MinIO only. Authentication, approval enforcement, PostgreSQL migration behavior, and the full runtime flow need verification; entity classes and a passing context test do not establish completion of a roadmap level.

## Component responsibilities

| Component | Responsibility |
|---|---|
| React | Incident queue, SLA deadline, evidence, diagnosis, approvals, recovery timeline; never provider keys or authorization decisions |
| Spring Boot | Authentication, production-scoped authorization, detection, incident lifecycle, persistence, approval and action execution, audit, notifications |
| Python AI engine | Read-only evidence collection, context construction, retrieval, model selection, structured diagnosis and action proposals |
| Python simulator | Repeatable telemetry and controlled remediation endpoints; separate scenario controls and evaluator-only ground truth |
| PostgreSQL + pgvector | Authoritative application state and later scoped similarity search |
| MinIO / optional S3 | Reports and larger artifacts; export failures do not undo incident resolution |

For the MVP, Spring Boot owns the write-action executor. Python may propose a registered action, but does not receive simulator write credentials. The simulator validates the backend's service credential on write endpoints. Read-only tool orchestration remains in Python. Authentication and action isolation must be proven before exposing services beyond the development environment.

## First complete demonstration

1. Start Scenario A: a payment worker stops consuming. Record the scenario seed and start time outside the investigation context.
2. A deterministic detector creates one incident for the active failure, assigns its service/team, and stores its SLA deadline.
3. Gather metrics, logs, and deployment history sequentially, retaining source, timestamp, evidence ID, and collection errors.
4. Diagnose with one configured Ollama model. Display a structured hypothesis, evidence references, missing information, and a proposed registered action.
5. An authorized operator approves the exact action and arguments. Spring Boot rechecks authorization, incident state, expiry, and idempotency before execution.
6. Execute through the simulator, record the result, and verify recovery with fresh telemetry. A successful HTTP response alone does not resolve the incident.
7. Show the timeline and export a report. Capture actual latency and outcomes.

## Delivery sequence and acceptance gates

| Milestone | Deliverable | Evidence required before proceeding |
|---|---|---|
| A — Reproduce the existing foundation | Document Windows/WSL commands, local PostgreSQL on host port 5433, MinIO bucket setup, service health and configuration; isolate test databases | Fresh setup runs; migrations apply to an empty database; incident survives restart; no test writes to the developer's normal database |
| B — Finish the safe vertical slice | Scenario A through diagnosis, approval, action, and recovery; authentication and production-scoped authorization | Denied/unassigned user cannot read or act; rejection/expired approval cannot execute; duplicate requests cannot repeat a write; recovery verified |
| C — Add free external inference | Implement OpenRouter adapter, explicit free-model allowlist, structured response validation, bounded fallback | Same evidence works through both adapters; simulated 429, timeout, invalid output, and unavailable model produce visible bounded outcomes; no paid fallback |
| D — Measure and improve | Benchmark local versus external; add rule-based routing and bounded concurrent evidence gathering | Identical scenario/evidence comparison, recorded model/prompt versions, sequential versus concurrent measurements, failures included |
| E — Add memory and remaining scenarios | Approved runbooks/resolved incidents in pgvector; Scenarios B–E; in-app notification and one SLA warning tier | Retrieval respects production access; embedding model/version recorded; poisoned or stale context cannot authorize actions; each scenario repeatable |
| F — Package the demonstrable product | Repeatable evaluation command, usable incident UI, trace links, setup guide, sample non-secret configuration | Full demo from documented setup; published results tied to run IDs; unresolved limitations stated |
| G — Optional AWS experiments | Move one proven component at a time | Relevant local gate passes; current cost/credit verified; rollback and teardown documented; same acceptance checks pass remotely |

These milestones execute the capabilities in [03-scope-and-roadmap](03-scope-and-roadmap.md), not a second feature backlog. Tracing, tests, and authorization start when the corresponding feature is introduced. Level 8 is observability completion, not the first trace; Level 9 is evaluation completion, not the first measurement.

## Model policy

- **Deterministic first for known facts:** detection, ownership, SLA arithmetic, authorization, risk classification, and recovery criteria never require an LLM.
- **Use installed models first:** inventory Ollama tags during implementation. The code currently defaults to `llama3.2:1b`; that is configuration, not proof of what is installed or adequate. Benchmark installed Llama models before downloading or selecting replacements.
- **Local and external are capabilities, not ranks:** local can diagnose if its measured quality and latency suffice; a free external model is not necessarily stronger. Avoid an obligatory local summarization call before every external call.
- **Modes:** `local_only`, `external_free`, and `adaptive` are proposed configuration modes. Build the first two to establish baselines before adaptive routing. In `local_only`, no evidence leaves the machine.
- **Adaptive rules:** select using task, evidence size, model capabilities, measured latency, provider health/quota, and remaining investigation time. Escalate for missing/contradictory evidence or invalid output; never rely solely on self-reported confidence.
- **Bounded work:** start with one active local inference and a bounded queue. Set a total investigation deadline, per-source timeout, context/output limits, and a proposed maximum of two model invocations per investigation, including retries or output repair. Tune from measurements and record configuration.
- **Failure behavior:** respect rate-limit backoff only within the remaining deadline. Try an allowed alternative once if policy/time allow; never cycle back to an attempted route. If no usable model remains, return collected evidence with an explicit unavailable/incomplete status for human investigation. Do not fabricate a diagnosis.
- **Free means explicit:** select a verified free model ID from an allowlist. Do not use unrestricted automatic model selection or silently enable paid providers. Recheck availability/pricing when choosing a model; quotas are account-dependent and may change.
- **AgentNow:** user-named candidate, exact URL/API and free access unverified. Older documents called a candidate AgentRouter; do not assume these are the same service. Add a second adapter only after validating the supplied provider documentation, terms, authentication, and a real response. This does not block Ollama/OpenRouter work.

OpenRouter documents [free model variants](https://openrouter.ai/docs/guides/routing/model-variants/free) and [API limits](https://openrouter.ai/docs/api_reference/limits). Verify the account's current limits when configuring runs rather than copying a quota into application logic. Its [privacy policy](https://openrouter.ai/privacy/) also makes provider data handling relevant: send only permitted, minimized synthetic evidence and keep API keys server-side.

## Contracts to implement

Version the Spring Boot ↔ Python request/response schema. Request fields include investigation ID, incident ID, authorized production/service scope, trace ID, deadline, routing mode, and bounded evidence references. The service authenticates the caller; a user ID or permission list in a request is not by itself proof of authority.

The diagnosis response includes status, hypothesis, supporting evidence IDs, limitations, proposed tool ID and validated arguments, provider/model identity, routing reason, elapsed time, token usage when supplied, and failure/fallback history. Validate evidence references and tool schemas in code. Keep model explanations separate from observed facts; provenance is not proof that a conclusion is correct.

Model output never defines tool risk or grants approval. An approval binds to an immutable action ID, target, arguments, incident version, approver, and expiry. Persist action attempts and outcomes so retries/restarts cannot silently duplicate writes; ambiguous execution outcomes require reconciliation before another attempt.

Logs and retrieved text are untrusted data, not instructions. The diagnosis path cannot access scenario labels/ground truth. Prefer explicit orchestration functions and typed schemas over adding an agent framework before there is a demonstrated need.

## Evidence that the design works

Compare deterministic/manual investigation, local-only, external-free-only, and adaptive runs on the same versioned scenario inputs. Separate model quality from provider availability and separate investigation time from approval wait/recovery time. Record correctness, unsupported claims, invalid output, timeout/rate-limit rates, routing choices, latency, token usage, and measured/reported cost (unknown stays unknown). Test provider failures with fixtures; use limited live calls to verify integration. Never make live free APIs a prerequisite for the unit test suite.

Only index reviewed runbooks and confirmed resolved incidents. Use a separately selected embedding model with fixed dimensions/version; a chat model is not automatically an embedding model. Preserve production scope and source timestamps through retrieval. Begin with one schema and pgvector; Redis, a second vector database, and multiple orchestration frameworks remain deferred.

## Immediate next implementation task

Reproduce Scenario A against local PostgreSQL and MinIO, document startup, and verify actual authentication/approval gaps. Finish the approval-gated recovery loop, then implement the existing OpenRouter adapter stub. Documentation changes alone do not complete these tasks.
