## 49. Why Is My Lambda Cold-Starting (or Timing Out)?

*(Prerequisite: companion §2, Lambda)*

### 49.1 Symptoms
A subset of requests to a Lambda-backed API show noticeably higher latency than the rest (a bimodal, not uniform, latency distribution) — or, distinctly, invocations are hitting the configured execution timeout and failing outright.

### 49.2 Possible Causes
**For cold starts**: a new execution environment being initialized (no warm environment available to reuse), heavier initialization work (large dependencies, a VPC-attached ENI needing provisioning, a large deployment package) increasing that initialization cost, or a traffic pattern with long idle gaps between invocations causing environments to be recycled between requests. **For timeouts**: a downstream call (a database query, an external API) taking longer than expected with no independent timeout of its own, genuinely more computational work than the function's timeout budget allows, or a missing `await`/blocking call stalling execution silently.

### 49.3 Metrics
Duration's p50 versus p99 (a large gap is the direct signature of cold starts affecting a minority of requests, not a uniform slowdown); the `Init Duration` reported in Lambda's own logs specifically isolates initialization time from execution time; `Throttles` and `ConcurrentExecutions` approaching the account/function limit.

### 49.4 Logs
CloudWatch Logs for the specific invocation show `Init Duration` separately from `Duration` — a request showing a large `Init Duration` is a cold start; one showing normal `Init Duration` but `Duration` approaching the configured timeout is a genuinely slow execution, not initialization.

### 49.5 Investigation
Check whether the slow requests correlate with periods of low invocation frequency (suggesting environments are being recycled between requests, forcing repeated cold starts) or with a specific downstream dependency being slow (via X-Ray, companion §18, showing which segment of the trace dominates). Distinguish cold-start latency from genuine execution slowness before choosing a fix — they have different remedies entirely.

### 49.6 Root Cause
In practice, the most common causes are: a VPC-attached function (ENI provisioning adds meaningfully to cold-start time, though this has improved significantly in recent years with Hyperplane ENIs), a large deployment package or heavy import-time initialization work, and — for timeouts specifically — a downstream call with no independent timeout, letting a single slow dependency consume the entire function timeout budget.

### 49.7 Fix
For cold starts: reduce deployment package size and defer non-essential initialization to first use rather than import time; use Provisioned Concurrency (companion §2) for latency-critical functions where cold starts are genuinely unacceptable; avoid unnecessary VPC attachment if the function doesn't actually need to reach VPC-only resources. For timeouts: set explicit, tighter timeouts on every downstream call than the function's own overall timeout, so a slow dependency fails fast and visibly rather than silently consuming the whole budget.

### 49.8 Tradeoffs
Provisioned Concurrency eliminates cold starts for its reserved capacity but bills for that capacity whether invoked or not (companion §2's cost model) — worth it only where cold-start latency has a genuine, quantifiable cost (a user-facing API with a strict SLA), not applied reflexively to every function. Reducing package size sometimes means restructuring dependencies, a one-time engineering cost.

### 49.9 Prevention
Monitor p99 Duration and `Init Duration` as leading indicators, not just average latency. Set per-downstream-call timeouts deliberately, always shorter than the function's own configured timeout. Load-test cold-start-sensitive endpoints specifically under a low-frequency-invocation pattern that would trigger cold starts, not just under sustained load where environments stay warm.

### 49.10 Decision Tree
```
Is the slow-request latency bimodal (most fast, some notably slower) or uniformly slow?
  BIMODAL -> Check Init Duration in logs -- likely a cold start. Consider Provisioned
             Concurrency or reducing package/init weight.
  UNIFORM, approaching timeout -> Trace via X-Ray: is time dominated by a specific
             downstream call? Add/tighten that call's own timeout.
```

---
