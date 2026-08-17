## 70. Why Is FastAPI Slow?

### 70.1 The Purpose of This Part

Parts I-XI each taught a mechanism or discipline in isolation. This Part revisits the whole handbook through eight named, recurring production symptoms — the actual questions an on-call Python backend engineer asks when something is wrong — each following: Symptoms, Possible Causes, Metrics, Logs, Root Cause, Investigation, Fix, Tradeoffs, Prevention. "FastAPI is slow" is the single most common, least specific complaint a Python backend engineer receives, and this chapter's job is turning that vague complaint into a specific, diagnosable question.

### 70.2 Symptoms

Overall request latency is higher than expected or than a prior baseline; the slowness may be uniform across all endpoints or concentrated in specific ones; it may correlate with traffic volume (worse under load) or be constant regardless of load (suggesting a fixed, per-request cost rather than a capacity/contention issue).

### 70.3 Possible Causes

A blocking, synchronous call inside `async def` code stalling the entire event loop (companion §12.2, §55.2); an N+1 query problem (companion §30.5) scaling latency with result-set size; an undersized or exhausted database connection pool (companion §26.3, §26.7); missing or ineffective caching for expensive, repeated computation (companion §47); serialization overhead for large responses (companion §56.1-56.2); a slow, unindexed database query (companion §30.2-30.4); network latency to a downstream dependency with no timeout, holding requests open far longer than necessary (companion §32.4); or genuinely insufficient application capacity (too few worker processes, companion §16.8, for the actual traffic volume).

### 70.4 Metrics

Request latency percentiles (p50/p95/p99, companion §58.2) segmented by endpoint — never trust a blended average across all endpoints, since a few slow endpoints can be masked by many fast ones in an aggregate figure; database connection pool utilization and checkout wait time (companion §57.2); query count per request (companion §30.8's N+1 diagnostic); CPU utilization (high CPU suggests a computational bottleneck; low CPU with high latency suggests I/O waiting or event-loop blocking, companion §55.5's scheduling-delay-versus-execution-time split).

### 70.5 Logs

Structured logs with correlation IDs (§64.2-64.3) for a specific slow request, showing the full sequence and timing of operations within it; distributed trace spans (§65.5) if available, showing exactly which specific operation within the request accounted for the most time — the single most direct path from "this request was slow" to "this specific line of code or database call is why."

### 70.6 Investigation

Follow this order, from cheapest-to-check to most involved: (1) Check whether the slowness is uniform (suggesting a systemic cause — connection pool, event loop blocking) or endpoint-specific (suggesting a code-level issue in that specific handler). (2) Pull a distributed trace or profile (companion §54.2, §65.5) for a representative slow request and identify which specific span or function dominates. (3) If the dominant cost is a database operation, check for N+1 (companion §30.8) or a missing index (companion §30.2) specifically. (4) If the dominant cost is "waiting" rather than "executing" (companion §55.5), check for event-loop blocking (a synchronous call inside async code) or connection-pool exhaustion.

### 70.7 Root Cause

In practice, across real Python backends, the most common root causes — roughly in order of frequency — are: an accidental blocking call inside async code (companion §12.2); the N+1 query problem (companion §30.5); a connection pool sized for a lower traffic level than the application now actually serves (companion §26.3); and missing caching for an expensive, frequently-repeated computation (companion §47.2). A genuinely CPU-bound, computationally-intensive bottleneck (companion §54.2's actual profiling-identified hot function) is real but meaningfully less common than these four "the request is waiting on something, not actually computing" causes.

### 70.8 Fix

Match the fix precisely to the identified root cause rather than applying a generic "add caching" or "scale up" response to every case: wrap the specific blocking call in `run_in_executor` (companion §11.5) or replace it with an async-native equivalent; restructure the N+1 pattern into a single batched query (companion §30.6); resize the connection pool against actual measured concurrent demand (companion §26.9); add targeted caching (companion §47.6) for the specific expensive, repeated computation identified, with a deliberately-chosen cache key and invalidation strategy, not a blanket cache-everything approach.

### 70.9 Tradeoffs

Every fix in §70.8 has its own cost: `run_in_executor` consumes a bounded thread-pool slot per call (companion §11.4); batching an N+1 query requires restructuring the calling code, a real but one-time refactor cost; a larger connection pool consumes more database-side resources (companion §26.3) and must be balanced against the database's own actual capacity; caching introduces the staleness-versus-correctness tradeoff (companion §47.2) and a genuine ongoing invalidation-correctness burden.

### 70.10 Prevention

Enable `asyncio` debug mode (companion §55.2) routinely in development/staging to catch blocking calls before they reach production; add automated N+1 detection to the test suite (companion §30.10's query-counting pattern, run as an assertion in CI, not just a manual investigation technique); monitor connection-pool utilization and checkout wait time continuously (companion §57.2) as leading indicators, not only alerting on the hard pool-timeout failure; establish a routine practice of profiling (companion §54) any new, non-trivial endpoint before it ships, rather than only investigating after a slowness complaint arrives.

### 70.11 Engineering Intuition

> **What's the fastest way to distinguish "the event loop is blocked" from "the database is slow" as the cause of reported slowness?** Check CPU utilization alongside the symptom (companion §55.5) — a blocked event loop from a synchronous call typically shows a single core pegged near 100% during the blocking call's duration, while database-query slowness typically shows low application CPU with the time genuinely spent waiting on network I/O.

> **Why does "FastAPI is slow" so often turn out not to be about FastAPI at all?** Because FastAPI's own routing and validation overhead (companion §18, §21) is typically a tiny fraction of total request latency compared to database queries, external calls, and serialization — the framework itself is very rarely the actual bottleneck, even though it's the layer most visibly "in front of" the request.

### 70.12 Decision Tree: Diagnosing "FastAPI Is Slow"

```
Is the slowness uniform across ALL endpoints, or concentrated in
specific ones?
  UNIFORM -> Check connection pool utilization (§26/§57.2) and
             for event-loop blocking (§55.2) as systemic causes.
  SPECIFIC to certain endpoints -> Profile/trace that specific
             endpoint (§54.2, §65.5) directly.
Does the dominant cost, once identified, show as CPU-bound
computation or as "waiting" (I/O, lock, pool checkout)?
  CPU-BOUND -> Profile the specific function (§54.2); consider
             companion §10's multiprocessing if genuinely needed.
  WAITING -> Check for a missing timeout, an unbatched N+1 query,
             or event-loop-blocking synchronous call specifically.
```

### 70.13 Further Reading

- Companion §12 (AsyncIO), §26 (Async Sessions), §30 (Query Optimization), §54-55 (Profiling/Async Performance) — the full mechanism depth behind every cause in this chapter's catalog.

---
