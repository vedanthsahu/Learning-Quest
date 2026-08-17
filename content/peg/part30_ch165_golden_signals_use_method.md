## §165. The Four Golden Signals and the USE Method

### 1. The Vocabulary

- **The Four Golden Signals** (Google SRE's framework) — **Latency** (how long requests take),
  **Traffic** (how much demand the system is under), **Errors** (rate of failing requests), and
  **Saturation** (how "full" the system is — how close to its capacity limit).
- **USE Method** (Brendan Gregg's framework, resource-focused) — for every resource (CPU, memory,
  disk, network, a connection pool): **Utilization** (percent busy), **Saturation** (queued/waiting
  work), **Errors** (error count for that resource).
- **The distinction between the two frameworks** — Golden Signals are typically applied at the
  service/request level (is the service healthy from a user's perspective); USE is applied at the
  resource level (is this specific piece of infrastructure the bottleneck).

### 2. Where It Sits, and Why Teams Use It

These two named frameworks exist to answer "what should our dashboards actually show" without
reinventing the question from scratch for every new service. Golden Signals give a minimal,
sufficient service-level dashboard: if you can only monitor four things for a service, these are
the four. USE gives the same minimal-sufficient answer one level down, for diagnosing *which*
resource is actually the bottleneck once Golden Signals tell you something's wrong — saturation
specifically is the metric most teams under-monitor, since utilization alone can look fine while a
queue behind that resource is quietly growing.

### 3. What Actually Breaks

- **Monitoring utilization but not saturation** — a resource can show "60% CPU utilization" (looks
  fine) while requests queue up waiting for it because of how work is scheduled or batched;
  saturation, not utilization, is what predicts user-visible slowness.
- **Dashboards built ad hoc, missing one of the four golden signals entirely** — a dashboard with
  latency and errors but no traffic or saturation can't distinguish "the system got slow because
  demand spiked" from "the system got slow for no external reason" — a materially different
  incident story.
- **Averages used instead of percentiles for latency** — the same trap as §50: golden-signal
  latency dashboards need percentiles (p95/p99), not just an average, to be actually useful during
  an incident.
- **No resource-level (USE) breakdown to follow up a golden-signal alert** — knowing "errors are
  up" without a resource-level view to check CPU, memory, disk, network, and connection pool
  saturation each in turn leaves the actual root cause to be found by guesswork.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "For a service dashboard, I check that all four golden signals are covered — latency, traffic,
  errors, and saturation — not just the ones that were easiest to instrument first."
- "I specifically watch saturation, not just utilization, since a resource can look fine on
  utilization while a queue behind it is quietly growing."
- "When a golden-signal alert fires, I use the USE method to check each individual resource — CPU,
  memory, disk, network, connection pools — to localize the actual bottleneck."

### 5. Interview-Ready Answer

> "For a service-level dashboard I check against the four golden signals — latency, traffic,
> errors, and saturation — since together they're the minimal sufficient view of whether a service
> is healthy from a user's perspective. When something's wrong, I drop down to the USE method per
> resource — utilization, saturation, errors for CPU, memory, disk, network, connection pools — to
> localize which specific resource is actually the bottleneck. I pay particular attention to
> saturation specifically, since utilization alone can look healthy while a queue behind that
> resource is already growing."

### 6. Go Deeper

companion Software Systems Handbook's §16 (Mental Model: Observability) chapter and companion
Software Systems Handbook's §71 (Observability at Scale: sampling, cardinality, telemetry cost)
chapter for the full framework history and dashboard design guidance; this book's §47-53 (logs/
metrics/traces, latency percentiles, SLIs/SLOs) for the surrounding observability foundation.

---
