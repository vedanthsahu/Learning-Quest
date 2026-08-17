## 76. Why Are Workers Hanging?

### 76.1 Symptoms

One or more worker processes (Uvicorn workers, companion §16.8, or Celery workers, companion §33.6) stop making progress on their assigned work entirely — no longer serving requests or processing tasks — while still appearing "alive" at the process level (not crashed, not exited), often only detected because a liveness or readiness probe (companion §66.2-66.3) eventually flags the worker as unhealthy, or because task/request queue depth grows without any corresponding completion.

### 76.2 Possible Causes

A deadlock — two or more execution contexts each waiting on a resource (a lock, companion §11.7, or a database row lock, companion §27.7) held by the other, with neither able to proceed; an `await` on something that will genuinely never complete — a network call to a dependency that's silently stopped responding with no timeout configured (companion §32.4), leaving the coroutine suspended indefinitely; a worker process stuck in an infinite loop or performing a very long, uninterruptible CPU-bound computation (companion §9.5) that starves the event loop (for an async worker) or the single-threaded worker itself from processing anything else; or a genuine but very slow operation (a large report generation, an unbounded query, companion §30) that isn't actually hung, only extremely slow, and is being misdiagnosed as "hanging" rather than "still working, but far too slowly."

### 76.3 Metrics

Worker-level request/task completion rate — a worker showing zero completions over a sustained window while other workers continue processing normally isolates the problem to that specific worker rather than a systemic issue; CPU utilization for the specific hung worker process (near-zero CPU suggests waiting/deadlock; sustained high CPU suggests an infinite loop or extremely long computation, distinguishing §76.2's causes); thread/task stack traces if obtainable (companion §55.2's debug-mode techniques, or a signal-triggered stack dump) showing exactly where execution is currently suspended.

### 76.4 Logs

The last log line emitted by the specific hung worker before it stopped progressing, showing the last operation it started — frequently the single most useful diagnostic artifact, directly identifying the specific call that never returned; absence of any timeout-related log entry despite a long elapsed duration, itself suggesting a missing timeout configuration (companion §32.4) is the root cause.

### 76.5 Investigation

First isolate whether the issue affects one specific worker or all workers uniformly — a single stuck worker while others function normally points toward a specific request/task triggering a deadlock or infinite wait, while all workers stuck simultaneously points toward a shared, systemic resource (a shared lock, a shared downstream dependency that's stopped responding entirely). Obtain a stack trace or last-known-operation for the hung worker (via its logs, or a debugging signal handler registered specifically for this purpose) to identify precisely which call is suspended; cross-reference that call against whether it has an explicit, configured timeout (companion §32.4) — a suspended call with no timeout is the single most common explanation once a specific culprit call is identified.

### 76.6 Root Cause

In practice, the dominant real-world cause, by a wide margin, is a network call to a downstream dependency with no configured timeout (companion §32.4), where that dependency has stopped responding (a hung TCP connection, a downstream service itself frozen) — the calling worker `await`s or blocks on this call genuinely forever, since nothing tells it to give up after any bounded duration. A true deadlock (companion §27.7's lock-ordering problem) is a real but meaningfully less common cause in practice, typically introduced by a specific, identifiable code path acquiring two or more locks (or row locks) in inconsistent order across different call sites.

### 76.7 Fix

Add an explicit, bounded timeout (companion §32.4, or `asyncio.timeout` for async code) to every external call that currently lacks one — this single change converts an indefinite hang into a bounded failure that can be retried, logged, and alerted on, which is a categorically better failure mode even though it doesn't fix the downstream dependency's own unresponsiveness. For a genuine deadlock, establish and enforce a single, consistent lock-acquisition order across every code path that acquires more than one lock (companion §27.7's exact remediation), eliminating the possibility of two contexts waiting on each other in opposite orders.

### 76.8 Tradeoffs

Adding timeouts to every external call requires choosing an actual, deliberate timeout value for each — too aggressive risks false-positive failures on genuinely slow-but-successful calls (companion §32.5's calibration guidance), too permissive delays detection of a genuinely hung call; enforcing consistent lock ordering across a codebase is sometimes a real, non-trivial refactor if locks were acquired inconsistently across many, historically-uncoordinated call sites, but this cost is strictly necessary to eliminate deadlock risk rather than optional.

### 76.9 Prevention

Establish and enforce, as an unconditional code-review rule, that every network call to an external dependency must have an explicit, bounded timeout — no exceptions, since a single missed timeout reintroduces the entire hazard class this chapter describes; document and enforce a single canonical lock-acquisition order for any code that ever needs to hold more than one lock simultaneously; configure worker-level health checks (companion §66.2-66.3) specifically designed to detect a hung-but-not-crashed worker (a lack of recent progress, not just process liveness) and automatically restart it, providing a safety net for whatever specific hang cause hasn't yet been fixed at the root.

### 76.10 Engineering Intuition

> **Why is "the worker is still running, just not doing anything" a more insidious failure than a worker that crashes outright?** Because a crashed worker is immediately, unambiguously detectable (companion §66.2's liveness probe catches it instantly) and typically triggers an automatic restart, while a hung-but-alive worker can silently accumulate stuck requests or tasks for an extended period before any health check specifically designed to detect *lack of progress* (rather than mere process existence) catches it.

> **Why does adding a timeout to an external call feel like it "doesn't really fix the problem" but is still the single most important remediation?** Because it's true that a timeout doesn't fix the downstream dependency's own unresponsiveness — but it converts an *unbounded, indefinite* failure (a permanently hung worker) into a *bounded, recoverable* one (a timed-out call that can be logged, retried, or surfaced to the caller), which is the actual engineering goal; fixing the downstream dependency itself is a separate, second concern.

### 76.11 Decision Tree: Diagnosing a Hung Worker

```
Is ONE specific worker hung, or ALL workers hung simultaneously?
  ONE -> Likely a specific request/task triggering a suspended call
         or deadlock -- get its last log line / stack trace (§76.5).
  ALL -> Likely a shared resource (a shared lock, or a shared
         downstream dependency that has itself stopped responding).
What is the hung worker's CPU usage?
  NEAR-ZERO -> Waiting on something -- check the last operation for
         a missing timeout (§32.4) or a lock wait (§27.7).
  HIGH, sustained -> An infinite loop or extremely long CPU-bound
         computation (§9.5), not a wait -- profile it directly (§54).
```

### 76.12 Further Reading

- Companion §11.7 (Locks), §27.7 (Row Locking & Transactions), §32.4-32.5 (Timeouts), §66.2-66.3 (Health Checks) — the full mechanism depth behind this chapter's diagnostic framework.

---
