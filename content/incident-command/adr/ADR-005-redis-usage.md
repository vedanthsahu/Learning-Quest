# ADR-005 — Redis Usage

## Status
Proposed — **unresolved**; this ADR documents a gap, not a settled decision.

## Context
Redis appears in the source proposed architecture (source brief §3, §12) as a caching/ephemeral-state layer, but no concrete use case was specified — the source brief itself says "do not introduce Redis everywhere just because it is available."

## Problem
Is there an actual, specific need for Redis in this system, or is it architecture decoration?

## Options considered
- **Session/token cache** — reduce PostgreSQL load for session lookups on every request. Plausible but PostgreSQL can handle this volume at this project's scale without difficulty; the win is marginal at POC scale.
- **Rate limiting** — protecting the expensive API-model tier from runaway calls (ties directly into Risk R3 in [20-open-questions-and-risks](../20-open-questions-and-risks.md)). This is the strongest concrete candidate.
- **Semantic cache for repeated model calls** — cache identical/near-identical prompts to avoid redundant expensive API calls. Plausible efficiency win, but is a Good to Have optimization, not core to demonstrating the routing thesis.
- **Drop Redis entirely for Level 0-4** — accept PostgreSQL for session state and no caching layer until a real need is measured.

## Decision
Defer. Do not build Redis into Level 0-2. Revisit specifically for **rate limiting the expensive model tier** if/when API spend becomes a real operational concern (see [ADR-010](ADR-010-api-cloud-model-strategy.md), Risk R3), or for **semantic caching** if evaluation data ([14-evaluation-strategy](../14-evaluation-strategy.md)) shows redundant expensive calls are common.

## Rationale
Introducing infrastructure ahead of a demonstrated need is exactly the "architecture as decoration" pattern the source brief warns against (§12, §23). Rate limiting can be implemented as a simple in-process bounded counter for a single-instance POC without Redis at all, at least initially.

## Tradeoffs
If rate limiting or caching needs later prove real, adding Redis at that point is low-cost (well-understood, fast to stand up) — deferring is low-risk.

## Consequences
[05-technology-stack](../05-technology-stack.md) and [04-must-have-vs-good-to-have](../04-must-have-vs-good-to-have.md) both list Redis as Good to Have, not Must Have, on the strength of this ADR.

## Reconsideration conditions
Revisit when: (a) API spend or rate-limit needs become concrete, or (b) evaluation data shows repeated-prompt redundancy worth caching.
