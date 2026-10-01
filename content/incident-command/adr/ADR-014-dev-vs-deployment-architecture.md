# ADR-014 — Local/Dev vs. Deployment Architecture

## Status
**Confirmed** direction (local-first, then progressive AWS) — exact per-phase topology remains Open, decided phase by phase.

## Context
The original ADR deferred all cloud-architecture decisions indefinitely, per the instruction not to decide deployment architecture prematurely. The incident-command revision adds a concrete, budgeted AWS track ($100 credit, 161 days, ap-south-1 — see [00-project-charter](../00-project-charter.md)), which changes "indefinitely deferred" into "progressive, starting once local is correct."

## Problem
Given real AWS credits, should cloud architecture be decided now, deferred entirely as before, or adopted incrementally?

## Options considered
- **Decide the full cloud architecture now** — still rejected; nothing has been measured locally yet.
- **Defer AWS entirely until the very end** — the original stance; no longer the best use of a real, time-bounded credit grant (161 days is a real clock, separate from but analogous to the product's own SLA-clock thesis).
- **Progressive, phase-by-phase adoption, each phase gated on the corresponding local piece being correct** — adopted; matches the source brief's explicit phased plan (Phase 1 local → Phase 2 Bedrock → Phase 3 EC2 simulator → Phase 4 RDS → Phase 5 S3 → Phase 6 frontend hosting → Phase 7 integrated).

## Decision

**2026-10-01 amendment:** [18-deployment-strategy](../18-deployment-strategy.md) defines optional component-specific AWS acceptance gates; completion of all Levels 0–9 is not a prerequisite for an individual experiment. Bedrock is optional and is not first in a mandatory provider sequence. [25-build-blueprint](../25-build-blueprint.md) uses installed Ollama models plus free OpenRouter for the initial product. Historic phase ordering in the options above is superseded by this amendment. Verify credit balance/expiry before a billable experiment, and require an explicit decision before paid inference.
Local development via Docker/`docker compose` remains the baseline for all core development. AWS adoption proceeds progressively per the phase plan in [19-aws-strategy](../19-aws-strategy.md) and [18-deployment-strategy](../18-deployment-strategy.md), with each phase started only once its local counterpart is correct and measured — never as a parallel-track distraction from core product correctness (see Risk R9 in [20-open-questions-and-risks](../20-open-questions-and-risks.md)).

## Rationale
The credit window (161 days from 2026-09-02) is real enough to plan around without rushing; treating it as "eventually, maybe" would waste a genuine learning opportunity the source brief explicitly asks for, while treating it as "do it all immediately" would risk building on an unproven local system.

## Tradeoffs
Progressive AWS adoption adds real scheduling discipline — a temptation to jump to the "interesting" cloud work before local correctness must be actively resisted (see Risk R9).

## Consequences
[19-aws-strategy](../19-aws-strategy.md) carries the full per-service justification and phase plan; this ADR records only the sequencing decision.

## Reconsideration conditions
Revisit if the credit grant is exhausted or expires before the local system reaches Level 9 — at that point, remaining AWS phases would need to be explicitly scoped down or dropped rather than pursued at the user's own expense without a fresh decision.
