# 23 — Incident Lifecycle and SLA Model

## Status
Proposed. This is the core domain model the entire product revolves around (see [01-pdd](01-pdd.md)).

## What constitutes an incident (concrete definition, not left implicit)

An incident is created when a **deterministic detection rule** (a threshold or pattern over simulator-exposed signals — error rate, latency, queue backlog, health flag) fires for a service, and no open incident already exists for that service/rule combination (to avoid duplicate incidents for the same ongoing problem). Detection rules are configured per service/signal, not inferred by a model. See [09-ai-engine-architecture](09-ai-engine-architecture.md) invariant: detection is never an LLM decision.

## Severity and SLA

```
Incident Category  --(mapped to)-->  Default Severity  --(mapped to)-->  SLA minutes
```

Example seed policy (illustrative, not final):

| Severity | Example trigger | SLA |
|---|---|---|
| P1 | Full service outage / >20% error rate | 30 min |
| P2 | Significant degradation / elevated latency | 90 min |
| P3 | Minor degradation, no customer-facing impact yet | 240 min |

Severity can be overridden by a human during triage; the SLA clock recalculates from the (possibly overridden) severity at the time of the change, with the override recorded in the timeline for audit.

## Lifecycle

```
DETECTED -> CREATED (SLA clock starts) -> ACKNOWLEDGED -> INVESTIGATING
   -> DIAGNOSED -> REMEDIATION_PROPOSED -> (APPROVED | REJECTED)
   -> REMEDIATING -> VERIFYING -> RESOLVED
```

Alternate paths: `INVESTIGATING -> ESCALATED_TO_HUMAN` (low AI confidence, unusual incident, or no acceptable automated/recommended path — see [09-ai-engine-architecture](09-ai-engine-architecture.md) §"Three outcomes"), and any state can move to `CLOSED_SLA_BREACHED` if the clock expires before `RESOLVED` — this is not a failure state to hide, it's a first-class outcome the evaluation strategy measures.

## Definitions that were explicitly left open in the source brief — resolved here for planning purposes

- **Resolution**: an incident is `RESOLVED` when (a) a remediation action has been executed (or the system determines no action was needed), and (b) the simulator's own health/metrics signals for the affected service return to their pre-incident baseline and stay there for a configured verification window (e.g., 3 consecutive healthy checks). Resolution is a verified state, not an assumed one.
- **Successful remediation**: the specific tool action executed without error **and** the resolution criteria above were met within a configured verification timeout. A tool call that succeeds mechanically but doesn't lead to recovery is not "successful remediation" — it's a failed diagnosis or an insufficient action, and should be distinguishable in evaluation data from a tool that simply errored.
- **AI-caused error vs. simulator-inherent failure**: because the simulator is scripted (see [22-production-simulator](22-production-simulator.md)), the "correct" outcome for each scenario is known in advance by construction. An AI-caused error is any deviation from the scenario's authored expected diagnosis/action/outcome; a simulator-inherent failure would be the simulator itself not behaving per its own script (a simulator bug) — these are distinguishable because the scenario's ground truth is fixed and known, not inferred.
- **Human escalation trigger**: confidence below a configured threshold, no matching tool/evidence path, or the incident category is marked as always-requiring-human-review in policy — not solely "the model said so." See the confidence-score caveat in [09-ai-engine-architecture](09-ai-engine-architecture.md).

## Ownership model (refinement from the source brief)

The source brief's example maps a whole production to one team. In practice a production likely contains services owned by *different* teams (e.g., Payments production's `payment-api` owned by Payments Team, but a shared `identity-check` dependency owned by Identity Team). **Ownership is modeled at the service level** (`services.owning_team_id`), not the production level — a production is just a grouping of services, and "who gets notified" is resolved per affected service, not per production. This is a small but real correction to the source brief's simplification.

## Notification and escalation (MVP scope — see [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md) for why this is trimmed)

MVP: in-app notification to the owning team's members on incident creation, plus one SLA-percentage-consumed warning (e.g., at 50% of SLA elapsed with no `RESOLVED`, escalate visibility — bold/red in the UI, plus a second in-app notification). The full multi-stage timer-based escalation policy engine from the source brief (§19) is Good to Have, built behind the same notification abstraction so it's additive, not a rework.

**Email channel — resolved implementation path** (2026-10-01): EventBridge Scheduler → Lambda (scans for SLA-proximity) → SQS → SES, for the explicit AWS-learning value of practicing Lambda IAM execution roles, scheduled triggers, and queue-based decoupling — see [19-aws-strategy](19-aws-strategy.md) "Amazon Lambda" and "Amazon SES" entries. Still Good to Have, not Must Have; this only decides *how* it'll be built once it is.

## SLA measurement (feeds [14-evaluation-strategy](14-evaluation-strategy.md))

Every state transition above is timestamped in `incident_events` (see [08-data-architecture](08-data-architecture.md)), which is what makes MTTA (time to `ACKNOWLEDGED`), MTTD/"time to diagnose" (time to `DIAGNOSED`), and MTTR (time to `RESOLVED`) computable directly from stored data rather than estimated.

## Related docs
[01-pdd](01-pdd.md) · [08-data-architecture](08-data-architecture.md) · [09-ai-engine-architecture](09-ai-engine-architecture.md) · [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md) · [14-evaluation-strategy](14-evaluation-strategy.md) · [22-production-simulator](22-production-simulator.md)
