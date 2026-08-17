## 32. Production Latency Engineering: "Why Did Latency Suddenly Increase?"

### 32.1 The Problem: Latency in an AI System Has More Independent Failure Points Than in Ordinary Software

An ordinary API's latency is dominated by a small number of familiar factors (database query time, network hops, companion §50). An AI system's latency chain (§15.7) adds prefill time, decode time, retrieval time (§21), tool-call time (§25.2), and GPU-contention time — meaning "latency increased" has meaningfully more independent candidate root causes than in a typical service, and requires the AI-specific instrumentation from §31.2, §31.6 to actually localize.

### 32.2 Symptoms

Time-to-first-token increases while total generation time stays flat (or vice versa, §15.7); p50 latency stays healthy while p95/p99 degrade sharply (a tail-latency-specific problem, not a uniform slowdown); latency increases correlate with specific request characteristics (longer inputs, specific users, specific times of day) rather than occurring uniformly across all traffic.

### 32.3 Possible Causes

Increased average input/context length (§15.5, §45's context-management failure) inflating prefill time; increased average output length inflating decode time; GPU memory pressure from KV cache (§18.4) reducing effective concurrency and causing request queuing; retrieval latency regression (§21, e.g., a vector index needing re-tuning as corpus grew, §22.9); a model provider's own latency degradation (outside your control, but detectable via monitoring, §31.6); loss of prompt-cache hit rate (§24.6) due to a prompt-structure change that broke prefix stability; GPU cold-start events from reactive autoscaling (§27.8) during a traffic spike.

### 32.4 Metrics

Time-to-first-token and total generation time, tracked as separate percentile distributions (p50/p95/p99, §31.6), segmented by input length, output length, and model; retrieval-stage latency as its own separate span (§31.2); GPU utilization and KV-cache occupancy (§31.5); prompt-cache hit rate (§24.6) over time; request queue depth/wait time at the serving layer.

### 32.5 Investigation

Use distributed tracing (§31.2) to determine which stage of the pipeline (retrieval, prefill, decode, tool calls) accounts for the increase, rather than treating "latency" as a single undifferentiated number; correlate the timing of the increase against known deployment events (a prompt change, a model version change, a traffic-pattern shift) using the versioning captured in prompt logs (§31.3); check whether the increase is uniform across percentiles (suggesting a systemic cause like a provider slowdown) or concentrated in the tail (suggesting a resource-contention or specific-request-type cause).

### 32.6 Root Cause

Frequently one of: unmanaged growth in conversation history or retrieved context (§24.7) silently inflating prefill time over the lifetime of long-running conversations; a prompt-caching-breaking change (moving variable content earlier in the prompt structure, §24.6) that went unnoticed because cache-hit-rate wasn't being monitored as its own metric; GPU memory pressure from increased concurrent load exceeding what KV cache capacity (§18.4) was originally sized for.

### 32.7 Mitigation

Add context-window management (§24.5, §45's truncation/summarization) if history/context growth is the driver; restore prompt structure to place stable content first (§24.6) if a caching regression is the cause; add model/tensor parallelism or additional GPU capacity (§18.4, §28.3) if KV-cache-driven concurrency limits are the bottleneck; add a fallback model (§31.7) for provider-side latency degradation outside your control.

### 32.8 Tradeoffs

Aggressive context truncation reduces latency but risks losing genuinely needed information (§24.7's allocation tradeoff); adding GPU capacity resolves concurrency-driven latency at direct additional cost (§33); restructuring prompts for caching may reduce few-shot example flexibility if example content must now be held constant across requests.

### 32.9 Prevention

Continuous monitoring of prompt-cache hit rate, context length distribution, and KV-cache occupancy as first-class dashboards (§31.4-31.6), not just aggregate latency; regression-test latency alongside quality on every prompt/pipeline change (§29.5); load-test with realistic concurrency (§18.8) before trusting single-request latency measurements.

### 32.10 Engineering Intuition

> **How do I quickly tell if a latency regression is a prefill problem or a decode problem?** Check whether time-to-first-token or total generation time moved (§15.7, §32.2) — they have almost entirely disjoint root causes (input-side vs. output-side), and conflating them wastes investigation time.

> **Why did latency increase gradually over weeks rather than suddenly?** Gradual latency creep strongly suggests unmanaged growth (§32.6) — conversation history, corpus size outgrowing an ANN index's tuning (§21.5), or accumulating context — rather than a discrete deployment event; check trend correlation against usage growth, not just deployment timestamps.

> **What would over-engineering look like here?** Adding GPU capacity (§32.7) to fix a latency regression that's actually caused by a broken prompt-cache hit rate (§32.6) — the cache fix is nearly free; more GPUs is a recurring cost that treats the symptom, not the cause.

### 32.11 Decision Tree: Diagnosing a Latency Regression

```
Did TIME-TO-FIRST-TOKEN specifically increase?
  YES -> Check input/context length trend (§24.7) and retrieval-
         stage latency (§21) and prompt-cache hit rate (§24.6)
         first -- these are the dominant prefill-side causes.
Did TOTAL GENERATION TIME specifically increase (TTFT flat)?
  YES -> Check output length trend and GPU decode-phase
         contention/KV-cache pressure (§18.4) -- these are the
         dominant decode-side causes.
Is the regression concentrated in p95/p99 only (p50 healthy)?
  YES -> Look for concurrency/queuing effects (KV-cache capacity,
         §18.4) or cold-start events during traffic spikes (§27.8)
         rather than a systemic per-request cause.
Is the regression uniform across ALL percentiles?
  YES -> Check for a provider-side degradation (add a fallback
         model, §31.7) or a broad configuration/deployment change
         correlated by timestamp (§32.5).
```

### 32.12 Python Snippet: Segmented Latency Percentile Analysis

```python
# Demonstrates §32.4/§31.6: computing percentiles SEGMENTED by
# request characteristics, not one blended average -- the
# diagnostic step that actually localizes a regression.

import numpy as np

def segmented_latency_report(records):
    # records: list of dicts with 'ttft_ms', 'total_ms', 'input_tokens'
    buckets = {"short_input": [], "long_input": []}
    for r in records:
        bucket = "long_input" if r["input_tokens"] > 4000 else "short_input"
        buckets[bucket].append(r["ttft_ms"])

    for label, values in buckets.items():
        if not values:
            continue
        arr = np.array(values)
        print(f"{label}: p50={np.percentile(arr,50):.0f}ms "
              f"p95={np.percentile(arr,95):.0f}ms "
              f"p99={np.percentile(arr,99):.0f}ms  (n={len(arr)})")

# A regression showing up ONLY in "long_input" strongly implicates
# prefill/context-length-driven causes (§32.3), not a uniform
# provider-wide slowdown.
```

### 32.13 Further Reading

- The companion handbook's §50 (Latency Engineering) — the general tail-latency diagnostic discipline this chapter applies AI-specifically.
- §15 (Token Economics), §18.4 (KV Cache), §24.6 (Prompt Caching) — the mechanisms most directly implicated in this chapter's root causes.

---
