## 33. Production Cost Engineering: "Why Did Costs Suddenly Double?"

### 33.1 The Problem: Token-Priced Cost Has Far Higher Variance Than Ordinary Compute Cost

§15.9 established that per-request cost variance is inherent to token-based pricing. This chapter develops the diagnostic discipline for when that variance turns into an actual, unexpected budget event — the single most common "surprise" in AI product operations (§14.3), and one that a purely aggregate monthly-bill view (§14.9's decision tree) is specifically designed to catch too late.

### 33.2 Symptoms

Total spend increases faster than user/request growth would explain; cost-per-request increases without a corresponding, deliberate model or feature change; a specific customer, feature, or time window accounts for a disproportionate and unexplained share of total spend.

### 33.3 Possible Causes

Average tokens-per-request increased silently (context/history growth, §24.7, §45; a retrieval change returning larger or more chunks, §21.6); traffic shifted toward a more expensive model without a corresponding routing update (§27.5); a reasoning-model feature (§19.7) is consuming substantially more (often hidden) reasoning tokens than estimated; a caching regression (§24.6) is causing full-prefix reprocessing on requests that used to hit cache; retry/error-handling logic is silently reprocessing the same request multiple times, multiplying cost per logical user action; an abusive or malfunctioning client is generating disproportionate token volume (§13.6, §31.8).

### 33.4 Metrics

Cost and token consumption broken down per user, per feature, per model, and per pipeline stage (§31.4) — never only as an aggregate total; cost-per-request trend over time compared against request-volume trend (divergence between the two curves is the key signal); reasoning-token consumption tracked explicitly and separately from visible output tokens (§19.7); retry/error rate correlated with cost.

### 33.5 Investigation

Walk the token-economics chain (§15.13's estimation snippet) using *actual* production token counts for the suspected time window, not the original estimate used at launch; compare the dimensional cost breakdown (§31.4) across the period before and after the cost increase to isolate which dimension (user, feature, model, stage) actually changed; check prompt-cache hit rate (§24.6) for a regression coincident with the cost increase; check for a routing configuration change (§27.5) or a model-provider-side pricing change.

### 33.6 Root Cause

Frequently: conversation history or retrieved context growing unmanaged over the lifetime of long sessions (§24.7); a reasoning-model or agentic (§25) feature's real per-request token cost being substantially higher than the pre-launch estimate assumed, because that estimate didn't account for reasoning tokens or multi-step tool-calling loops (§25.11's `max_steps` safeguard existing specifically to bound this); a retry loop silently re-sending full, expensive requests on transient errors without cost-aware backoff.

### 33.7 Mitigation

Add or restore context-window management (§24.5, §45) to cap the actual, not just assumed, token growth; add model routing (§27.5) so simpler requests use cheaper models; add explicit reasoning-token budgets/limits for reasoning-model features; add token-budget-based rate limiting (§31.8, §31.13) to bound worst-case exposure from any single client; fix retry logic to avoid re-incurring full request cost on transient failures.

### 33.8 Tradeoffs

Capping context/history aggressively risks losing genuinely relevant information the user expects the system to remember; routing to cheaper models risks a quality regression for borderline-complex requests that the router misclassifies as simple (§27.5's routing-accuracy dependency); tighter token-budget rate limits risk rejecting legitimate high-volume users, requiring a tiered-limit design rather than one global limit.

### 33.9 Prevention

Continuous dimensional cost monitoring (§31.4) as a standing dashboard, not a monthly review; regression-test cost as a first-class evaluation metric on every change (§29.7), catching cost regressions before deployment rather than after; proactively test fallback and retry logic for cost-safety (does a retry re-incur full cost?) as part of the same testing discipline applied to correctness.

### 33.10 Engineering Intuition

> **How do I quickly localize a sudden cost increase?** Compare the dimensional cost breakdown (§31.4) for the suspect period against a healthy baseline period — the dimension that diverged (a specific feature, model, or user) is almost always where the root cause lives; never start by re-examining the whole system uniformly.

> **Why is my reasoning-model feature far more expensive than the pre-launch estimate?** Reasoning tokens (§19.7) are frequently invisible in a naive estimate that only counts the visible final answer — always measure actual reasoning-token consumption from the API response directly, not an assumption based on visible output length.

> **What would over-engineering look like here?** Building elaborate cost-anomaly-detection ML infrastructure before simply adding dimensional cost dashboards (§33.4) and comparing before/after periods directly — most cost regressions are diagnosable with straightforward breakdowns, not sophisticated anomaly detection.

### 33.11 Decision Tree: Diagnosing a Cost Spike

```
Did cost-per-request increase (not just total volume)?
  YES -> Check average tokens-per-request trend (§24.7) and
         reasoning-token consumption (§19.7) first.
Did the increase coincide with a model/routing/prompt change?
  YES -> Check prompt-cache hit rate (§24.6) and routing
         configuration (§27.5) for a regression.
Is a SPECIFIC user/feature/model responsible for a
disproportionate share (§31.4's dimensional breakdown)?
  YES -> Investigate that dimension specifically -- possible
         abuse (§13.6, add token-budget rate limiting §31.8) or a
         feature-specific bug (retry loop, context growth).
Is the increase uniform and proportional to request volume?
  YES -> This may be healthy, expected growth -- confirm against
         the original per-request cost estimate (§15.13) rather
         than assuming a problem exists.
```

### 33.12 Python Snippet: Cost-Per-Request Trend Divergence Detector

```python
# Demonstrates §33.5: the key diagnostic signal is DIVERGENCE
# between cost trend and volume trend, not the cost trend alone.

def detect_cost_divergence(daily_records, threshold_pct=20):
    # daily_records: list of {"date":..., "total_cost":..., "requests":...}
    alerts = []
    baseline_cost_per_req = (daily_records[0]["total_cost"] /
                              daily_records[0]["requests"])

    for day in daily_records[1:]:
        cost_per_req = day["total_cost"] / day["requests"]
        pct_change = ((cost_per_req - baseline_cost_per_req) /
                      baseline_cost_per_req) * 100

        if abs(pct_change) > threshold_pct:
            alerts.append({
                "date": day["date"],
                "cost_per_request": round(cost_per_req, 4),
                "pct_change_from_baseline": round(pct_change, 1),
            })

    return alerts
# A rising total_cost with a STABLE cost_per_req is healthy growth;
# a rising cost_per_req -- flagged here -- means SOMETHING per-
# request changed (§33.3), not just more traffic.
```

### 33.13 Further Reading

- The companion handbook's §78 (Cloud Cost Engineering / FinOps) — the general cost-anomaly diagnostic discipline this chapter extends with token-specific dimensions.
- §15 (Token Economics), §19.7 (Reasoning Models), §27.5 (Model Routing) — the mechanisms most directly implicated in this chapter's causes.

---
