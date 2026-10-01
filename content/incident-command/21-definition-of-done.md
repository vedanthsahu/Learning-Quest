# 21 — Definition of Done

## Status
Proposed. Applies per-feature and per-level.

## Functional
Does the feature work end-to-end through the real UI/API against the real (simulated) production, not just in isolation?

## Security
Is authentication enforced? Is authorization enforced server-side, scoped by *both* role and production assignment (see [15-security-and-rbac](15-security-and-rbac.md)), independent of UI visibility? Can a user not act on an incident for a production they're not assigned to by changing an ID?

## Safety (new dimension, specific to this project)
For any feature touching tool execution: is the Medium/High-risk approval gate actually enforced, in code, with no path that lets an AI-recommended write action execute without human approval? This is checked, not assumed, for every tool-related change — see [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md).

## Reliability
For any network call, tool execution, or model call: is there a defined, bounded behavior on timeout/failure/partial failure/retry exhaustion? See [12-concurrency-and-efficiency](12-concurrency-and-efficiency.md).

## Performance
Are relevant latency numbers actually measured, not guessed — especially for anything touching evidence-gathering concurrency or SLA-clock behavior?

## Observability
Does the feature emit trace spans/structured logs sufficient to reconstruct "what happened" for a given incident's investigation after the fact? See [13-observability](13-observability.md).

## Testing
Unit tests for non-trivial logic (SLA-clock calculation, risk-gating, ownership resolution, routing decisions). Integration tests for cross-service paths that are Must Have (detection→incident creation, evidence gathering→diagnosis, approval→remediation→verification).

## AI quality
Where the feature affects routing, evidence gathering, diagnosis, or tool selection: has it been run against at least one fixed scenario, or is it explicitly flagged as not yet evaluated? See [14-evaluation-strategy](14-evaluation-strategy.md).

For the [2026-10-01 build plan](25-build-blueprint.md), verify local-only operation without external requests, free-model allowlisting, bounded timeout/429/invalid-output handling, and a visible incomplete result when providers fail. Compare routing with pinned local/external baselines and record actual provider/model and evidence IDs. A model's risk label or confidence must never bypass the registry or approval gate. Integration tests must use isolated data rather than the developer's normal database.

## Documentation
If the feature changed an architectural decision recorded in an ADR or a docs/ file, is that file updated in the same change?

## Demoability
Can the feature be shown live against the Production Simulator, to someone who wasn't in the room while it was built?

## How this applies to the maturity levels
Per [03-scope-and-roadmap](03-scope-and-roadmap.md), Functional, Security, Safety, and Demoability are non-negotiable for every level from Level 4 onward (once tools exist); Observability from Level 2; Testing/AI-quality/Performance depth scales with which level is being closed out.

## Related docs
[03-scope-and-roadmap](03-scope-and-roadmap.md) · [14-evaluation-strategy](14-evaluation-strategy.md) · [00-project-charter](00-project-charter.md) success criteria
