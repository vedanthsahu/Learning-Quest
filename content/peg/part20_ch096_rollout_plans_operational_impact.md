## §96. Rollout Plans, Backward Compatibility, and Operational Impact

### 1. The Vocabulary

- **Rollout plan** — the deliberate sequence for releasing a change safely (canary, staged
  percentage, specific customer segments first), not just "deploy it."
- **Backward compatibility** — whether the change breaks anything currently depending on the old
  behavior (§23, §32).
- **User impact vs. operational impact** — what changes for the people using the product, versus
  what changes for the people running/supporting it (new alerts needed, new failure modes, new
  on-call considerations).

### 2. Where It Sits, and Why Teams Use It

This is where individual technical decisions (§14's deployment strategies, §23's versioning) come
together into an actual plan for a specific change — the difference between knowing the
techniques and being able to apply deliberate judgment about which ones a given change actually
needs.

### 3. What Actually Breaks

- **A rollout plan that only considers the happy path** — not thinking through what monitoring
  will show a problem, or what the rollback trigger criteria are, means a bad rollout is
  discovered late and reacted to improvised, rather than caught early against a plan.
- **Operational impact not considered until after launch** — a new feature that introduces a new
  failure mode, a new dependency, or a new alert nobody configured means on-call is caught
  off-guard the first time something goes wrong with it.
- **Assuming "backward compatible" without actually checking** — a change that seems safe in
  isolation can still break an integration, a batch job, or an old client version nobody thought
  to check against.
- **No clear rollback trigger** — "we'll roll back if something goes wrong" without a specific,
  measurable definition of "wrong" (a specific error rate threshold, a specific metric) leaves
  the actual decision to be made under pressure, inconsistently, mid-incident.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "My rollout plan includes what I'm watching, what would trigger a rollback, and who needs to
  know it's happening — not just the mechanical steps of deploying."
- "I think about operational impact explicitly — new failure modes, new alerts needed — as part
  of the rollout, not an afterthought discovered during the first real incident."
- "I verify backward compatibility concretely against actual known consumers, rather than
  asserting it from the change looking safe in isolation."

### 5. Interview-Ready Answer

> "A rollout plan is more than 'deploy it' — it includes what I'm monitoring during the rollout,
> a specific, measurable trigger for rolling back rather than a vague 'if something looks wrong,'
> and who on the team needs to know it's happening, including on-call if the change introduces
> any new failure mode. I also verify backward compatibility concretely, against actual known
> consumers of whatever's changing, rather than assuming a change is safe just because it looks
> safe in isolation."

### 6. Go Deeper

companion Software Systems Handbook's §92 (High-Level Design (HLD): The Architect's Repeatable
Framework) chapter and companion Software Systems Handbook's §102 (Engineering Decision Catalog:
10 worked decision trees) chapter; this book's own §14 (Deployment Strategies) and §58 (On-Call &
Rollback).

---
