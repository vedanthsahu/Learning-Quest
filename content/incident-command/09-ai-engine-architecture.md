# 09 — AI Engine Architecture: Adaptive Incident Reasoning

## Status
Target design updated 2026-10-01; see [25-build-blueprint](25-build-blueprint.md) for implementation gates. The existing gateway supports Ollama; OpenRouter remains a stub. Start with explicit local-only and external-free modes, then add measured rule-based routing.

## Internal shape

```
Investigate(incident_id, context)
        |
        v
      Router  <-------------------------- 14-evaluation-strategy measures this
        |
        +-- known deterministic fact? (e.g., "who owns this service")
        |       -> database lookup, no model call
        +-- needs current simulator state? (e.g., "is it healthy now")
        |       -> tool call (read-only)
        +-- needs summarization of a large evidence blob (logs)?
        |       -> small local model
        +-- needs prior-incident context?
        |       -> retrieval (pgvector)
        +-- needs cross-evidence reasoning / root-cause hypothesis?
        |       -> benchmark-qualified local or free external model
        +-- confidence too low / incident unusual / policy requires it?
                -> human escalation
        |
        v
  Evidence Gathering (bounded concurrency across independent sources
  -- see 12-concurrency-and-efficiency)
        |
        v
  Context Builder (assembles metrics + logs + deployment history +
  similar-incident evidence into the reasoning-tier's context)
        |
        v
  Model Gateway -> diagnosis + proposed registered action
  Tool Registry -> authoritative risk classification
        |
        v
  Grounding (every claim tagged: deterministic fact / tool result /
  retrieved prior incident / model reasoning)
        |
        v
  Three possible outcomes (source brief §15):
    - Automatic: only for Low-risk, well-defined, already-authorized
      read/diagnostic actions -- NEVER a write action in the MVP
    - Recommended: sufficient evidence, approval required before execution
    - Human escalation: insufficient confidence / unusual incident / policy
```

## Architecture invariant: AI is not responsible for everything

Explicit, non-negotiable for this project (source brief §11):

- **"Is this service returning 5xx / is a health check failing?"** — deterministic, computed from simulator signals, no model call. This is what creates the incident in the first place ([23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md)).
- **"Who owns this service?"** — a database lookup (`services.owning_team_id`), not a model inference, even though it's phrased as a question in the source brief's example. It's already known, structured data.
- **AI is reserved for genuinely ambiguous, contextual, or reasoning-heavy steps**: correlating multiple evidence sources, summarizing large evidence sets, finding historical similarities, forming a root-cause hypothesis, recommending remediation, and — critically — recognizing when its own uncertainty is too high to proceed without a human.

## Model escalation ≠ human escalation (source brief §14, load-bearing distinction)

A stronger model provides more reasoning capability. A human provides authority, judgment, and accountability. The router must reason about these as **two separate axes**, not one ladder: "summarize logs" only ever needs more model capability; "roll back production" always needs human authority, regardless of how confident the model is. Concretely: risk level (from the tool registry, see [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md)) drives whether human approval is required; model tier drives only how the diagnosis/recommendation was *derived*, never whether it can be *executed* without a human.

## Confidence scores — explicit methodological caution

If the model reports a confidence percentage (as in the source brief's "AI confidence: 91%" UI example), **that number must not be treated as a calibrated probability**. LLMs are known to be poorly calibrated at self-reported confidence. Concrete handling:
- Display it as a heuristic signal only, never as the sole basis for an automatic/no-approval decision.
- Evaluation ([14-evaluation-strategy](14-evaluation-strategy.md)) should separately measure *actual* diagnosis correctness against ground truth (the scenario's authored answer) rather than trusting the model's stated confidence — the two can and will diverge, and that divergence is itself a useful thing to measure.
- If a confidence-based threshold is used to trigger human escalation, it should be tuned against real evaluation data, not assumed to be meaningful at face value out of the box.

## Model Gateway

Target contract: `generate(task, evidence, schema, deadline, policy) -> validated result + metadata`. Implement adapters for installed Ollama Llama models and explicitly allowlisted free OpenRouter models. AgentNow is pending provider identification; Bedrock remains optional. Capability differences belong in adapters/configuration, not assumptions that all models support identical JSON/tool/streaming features. See [ADR-009](adr/ADR-009-local-model-strategy.md), [ADR-010](adr/ADR-010-api-cloud-model-strategy.md).

Routing selects by task, context size, measured quality/latency, quota/health, and remaining time. Local inference is not an obligatory extra step before external inference. A proposed initial budget is two model invocations total (including retries/repair), one concurrent local inference, bounded waiting, and a total investigation deadline. Failed routes are not revisited in a loop. Exhaustion returns evidence plus a visible incomplete/unavailable outcome for human investigation.

Responses carry evidence IDs, hypothesis, limitations, proposed registered action/arguments, provider/model, routing reason, elapsed time, token usage when available, and fallback history. Validate schemas and evidence references; untrusted logs/retrieval cannot instruct execution. Risk comes from the tool registry. Spring Boot alone authorizes and executes simulator writes in the MVP; Python has read-only simulator access. The [blueprint](25-build-blueprint.md) defines approval binding and idempotency.

## Explicit boundary: this is not a second application backend

The Python engine receives an already-authorized `(user_id, permissions, incident_id)` from Spring Boot. It does not own user/session records, OIDC validation, notification delivery, or the authoritative incident record — it returns investigation results; Spring Boot persists them. See [07-system-architecture](07-system-architecture.md).

## Related docs
[07-system-architecture](07-system-architecture.md) · [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md) · [12-concurrency-and-efficiency](12-concurrency-and-efficiency.md) · [14-evaluation-strategy](14-evaluation-strategy.md) · [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md)
