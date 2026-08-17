## 39. Production Evaluation at Scale

### 39.1 The Problem: A Golden Dataset That Worked at Launch Doesn't Automatically Stay Representative

§29 developed evaluation mechanics for a single, largely static evaluation system. At production scale and over time, three new problems emerge that a launch-time evaluation setup doesn't anticipate: the golden dataset drifting out of sync with real evolving usage patterns, evaluation infrastructure itself becoming a cost and latency bottleneck as change velocity increases, and the need to evaluate not just single responses but entire multi-turn or multi-agent interactions.

### 39.2 Symptoms

Golden-dataset evaluation scores stay stable while real user satisfaction or production incident rate visibly changes — a sign the dataset no longer represents real traffic; evaluation runs take long enough (or cost enough) that engineers start skipping them for smaller changes, quietly eroding the regression-testing discipline (§29.5); multi-turn conversational or agentic (§25) features have no clear evaluation methodology, since existing golden-dataset scoring was designed around single-turn request/response pairs.

### 39.3 Possible Causes

The golden dataset (§29.2) was built once at launch and never systematically refreshed with new real production examples or newly-discovered failure modes; evaluation is run as a monolithic full-suite job on every change regardless of change scope, rather than being scoped to run relevant subsets quickly for small changes; no evaluation methodology exists for evaluating an entire conversation or agent trajectory holistically, only individual turns/steps in isolation, missing failures that only manifest across a full interaction (e.g., the agent looping, §36, or a conversation losing context over many turns, §45).

### 39.4 Metrics

Golden dataset "freshness" — the proportion of examples added within a recent time window vs. examples untouched since initial creation; evaluation suite runtime and cost per run, tracked as its own operational metric (an evaluation system that becomes too slow or expensive to run routinely defeats its own purpose); trajectory-level metrics for multi-turn/agentic features (task completion rate across an entire conversation or agent run, not just per-turn quality) alongside the existing per-turn metrics.

### 39.5 Investigation

Audit how recently the golden dataset was last updated with genuinely new examples, and cross-reference recent production incidents (§42) against whether each one is represented in the dataset — a persistent gap here is the direct, measurable sign of dataset staleness; profile evaluation suite runtime/cost to identify whether it has grown to a point discouraging routine use; review whether any current evaluation exists at the level of a full conversation or agent trajectory, or only at the level of isolated single turns/steps.

### 39.6 Root Cause

Frequently: no established process requiring every production incident to add a corresponding golden dataset example (§29.2's "living artifact" principle, stated conceptually but not operationally enforced); evaluation suite growth over time without corresponding investment in evaluation infrastructure efficiency (parallelization, incremental/scoped evaluation runs) to keep pace; evaluation design inherited from an early, simple single-turn product stage never revisited as the product added multi-turn and agentic (§25, Part IV's capstone stages) capabilities.

### 39.7 Mitigation

Formalize a required step (in incident postmortems, §42) adding a representative example to the golden dataset for every confirmed production failure; invest in evaluation infrastructure that supports scoped/incremental runs (evaluating only the subset of the golden dataset relevant to a specific change's scope) alongside periodic full-suite runs, rather than treating "run everything on every change" as the only option; add trajectory-level evaluation methodology (evaluating an entire conversation or agent run against a defined success criterion) as a distinct evaluation category from per-turn scoring, specifically for multi-turn/agentic features.

### 39.8 Tradeoffs

Scoped/incremental evaluation runs faster and cheaper per change but risks missing a regression outside the scoped subset — mitigated, not eliminated, by still running full-suite evaluation periodically (e.g., nightly) regardless of per-change scoping; requiring a golden-dataset addition for every incident adds process overhead to incident response, a cost justified by directly preventing recurrence but real nonetheless; trajectory-level evaluation is inherently more expensive per evaluated unit (an entire conversation, not one turn) than per-turn evaluation, requiring careful sampling rather than exhaustive coverage at high traffic volumes.

### 39.9 Prevention

Treat golden-dataset freshness and evaluation-suite runtime/cost as monitored operational metrics in their own right (§39.4), not just the quality scores the dataset produces; build the incident-to-dataset-addition pipeline into standard incident-response tooling (§42) so it happens by default rather than requiring individual engineer discipline; revisit evaluation methodology explicitly at each capstone-style capability expansion (§43-56's staged Nova buildout is the direct worked example) rather than assuming launch-time evaluation design remains adequate indefinitely.

### 39.10 Engineering Intuition

> **How do I know if my golden dataset has gone stale?** Cross-reference your last several production incidents against the dataset (§39.5) — if none of them are represented, your dataset is measuring yesterday's failure modes, not today's.

> **Why did engineers start skipping evaluation runs before smaller changes?** This is almost always a runtime/cost problem, not a discipline problem (§39.6) — fix the evaluation infrastructure's efficiency (scoped runs, §39.7) rather than trying to enforce compliance against an evaluation system that's genuinely too slow to use routinely.

> **What would over-engineering look like here?** Building exhaustive trajectory-level evaluation for every single production conversation before establishing basic per-incident golden-dataset-update discipline (§39.7), which is cheaper and addresses a more foundational gap.

### 39.11 Decision Tree: What Evaluation-at-Scale Investment Do I Need?

```
Do recent production incidents show up as examples in your
golden dataset?
  NO  -> Formalize incident-to-dataset-addition as a required
         postmortem step (§39.7) FIRST.
Are engineers skipping evaluation runs due to time/cost?
  YES -> Invest in scoped/incremental evaluation infrastructure
         (§39.7) rather than accepting reduced regression-testing
         coverage.
Do you have multi-turn conversational or agentic features with
NO trajectory-level (whole-conversation/whole-run) evaluation?
  YES -> Add trajectory-level evaluation as a distinct category
         (§39.7) -- per-turn metrics alone miss failures like
         agent loops (§36) or context loss across turns (§45).
```

### 39.12 Python Snippet: Auditing Golden Dataset Freshness Against Recent Incidents

```python
# Demonstrates §39.5: a concrete, automatable check for dataset
# staleness -- flagging incidents NOT represented in the golden
# dataset, directly actionable in a postmortem process.

def audit_dataset_freshness(golden_dataset, recent_incidents):
    dataset_incident_ids = {ex.get("source_incident_id")
                              for ex in golden_dataset
                              if ex.get("source_incident_id")}

    unrepresented = [inc for inc in recent_incidents
                     if inc["id"] not in dataset_incident_ids]

    coverage_pct = (1 - len(unrepresented) / max(len(recent_incidents), 1)) * 100
    print(f"Incident coverage in golden dataset: {coverage_pct:.0f}%")
    if unrepresented:
        print(f"Missing: {[inc['id'] for inc in unrepresented]}")
    return unrepresented
```

### 39.13 Further Reading

- §29.2 (Golden Dataset Construction), §29.5 (Regression Testing) — the foundational mechanics this chapter extends for scale and longevity.
- §42 (Production Incident Response) — the process this chapter's incident-to-dataset pipeline directly plugs into.

---
