# ADR-001 — React vs Angular

## Status
Proposed

## Context
Frontend framework choice for a role-aware, streaming, dashboard-heavy UI. See [00-project-charter](../00-project-charter.md) learning goals.

## Problem
Which frontend framework best serves both the functional requirements (streaming chat, role-aware navigation, dashboards) and the learning goal (React + TypeScript explicitly named as the stretch area)?

## Options considered
- **React + TypeScript** — explicitly named in the source brief as the preferred/learning-goal framework.
- **Angular** — more opinionated, batteries-included framework; not named as a learning goal.
- **Vue** — not raised in the source brief; not seriously considered.

## Decision
React + TypeScript.

## Rationale
Named directly as the learning objective (source brief §4, §2). No functional requirement in [16-ui-product-and-design-spec](../16-ui-product-and-design-spec.md) demands Angular's more opinionated structure over React's flexibility; React's component/hook model fits the incremental, composable UI approach (chat core + separable trace/dashboard panels, see [17-ui-information-architecture](../17-ui-information-architecture.md)).

## Tradeoffs
React requires more manual decisions (routing library, state management, form handling) than Angular's batteries-included approach — acceptable since making those decisions deliberately is itself part of the learning goal.

## Consequences
Frontend tooling choices (router, state management, streaming client) will each need their own lightweight decision at implementation time; none are large enough to warrant separate ADRs unless a real tradeoff emerges.

## Reconsideration conditions
None currently anticipated — this decision is not expected to be revisited.
