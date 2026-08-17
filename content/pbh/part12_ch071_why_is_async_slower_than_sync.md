## 71. Why Is Async Slower Than Sync (Sometimes)?

### 71.1 Symptoms

A codebase migrated from synchronous to async (or a new async implementation compared against an equivalent synchronous one) shows *worse* throughput or latency than the synchronous version, contradicting the general expectation (companion §12.1, §12.4) that async should improve I/O-bound concurrency.

### 71.2 Possible Causes

The workload is actually CPU-bound, not I/O-bound (companion §9.5) — async provides no benefit at all for CPU-bound work, and the overhead of coroutine scheduling can make it marginally *worse* than straightforward synchronous code for this specific workload shape; a synchronous, blocking call remains somewhere in the "async" code path, stalling the entire event loop (companion §12.2) for every request, which is categorically worse than a purely synchronous, thread-per-request model where one slow request doesn't block every other concurrent request; excessive, fine-grained `await` points creating scheduling overhead disproportionate to the actual work being yielded around (companion §55.4); or a genuinely low-concurrency workload where async's single-thread model provides no advantage over synchronous code at all, while still paying async's real, if usually modest, per-coroutine overhead.

### 71.3 Metrics

CPU utilization pattern (a single core near 100% during "slow" async requests strongly suggests either genuine CPU-bound work or an event-loop-blocking synchronous call, companion §55.2); the scheduling-delay-versus-execution-time split (companion §55.5-55.6) — if scheduling delay dominates, the issue is event-loop congestion, not the async model itself being unsuitable; a direct, controlled before/after comparison of the same workload under both models using genuinely equivalent test conditions (companion §58.5's noise-controlled benchmarking methodology).

### 71.4 Logs

`asyncio` debug-mode warnings (companion §55.2) identifying specific slow callbacks; distributed trace spans (companion §65.5) showing where time is actually spent within a "slow" async request, distinguishing genuine work from waiting.

### 71.5 Investigation

First confirm the workload's actual nature — CPU-bound or I/O-bound (companion §9.5) — since this single determination resolves most cases of this symptom immediately: if genuinely CPU-bound, async was never expected to help, and the "regression" is actually just the removal of any accidental parallelism the prior synchronous implementation happened to have via multiple worker processes/threads (companion §16.8, §10). If genuinely I/O-bound, audit every I/O operation in the async code path for a synchronous, blocking call masquerading as async-compatible (companion §12.2, §26.4's exact async-driver-versus-sync-driver distinction).

### 71.6 Root Cause

The two dominant real-world causes, by far: (1) the workload was actually CPU-bound, and async was applied to a problem it was never designed to solve (companion §9.5's category mismatch), or (2) a synchronous database driver, HTTP client, or other blocking call remained in the "async" code path (frequently a partial migration, where some but not all I/O calls were converted to their async-native equivalents), making the async version strictly worse than synchronous code for exactly the reason companion §12.2 explains — one blocking call in async code affects *every* concurrent request, not just the one that triggered it.

### 71.7 Fix

For genuinely CPU-bound work, move it to a process pool (companion §10.6) or accept that async provides no benefit here and revert to (or retain) a simpler synchronous implementation, reserving async specifically for the application's genuinely I/O-bound portions. For a lingering blocking call, replace it with its genuine async-native equivalent (companion §26.4, §32.2's `httpx` over `requests`) or, if no async-native option exists, explicitly wrap it in `run_in_executor` (companion §11.5) rather than calling it directly.

### 71.8 Tradeoffs

Moving CPU-bound work to a process pool (companion §10.4) trades simplicity for genuine parallelism, at the real cost of serialization overhead for data crossing the process boundary; reverting to synchronous code for a genuinely low-concurrency, CPU-bound workload is often simply the correct, lower-complexity choice, and treating this as a "fix" that needs further optimization beyond this recognition would be over-engineering (companion §108.10's proportionality principle).

### 71.9 Prevention

Explicitly classify a workload's nature (CPU-bound vs. I/O-bound, companion §9.5) *before* choosing between sync and async implementation, rather than defaulting to async as a presumed-always-better choice; conduct async migrations completely, auditing every I/O call for a genuine async-native replacement, rather than partially converting a codebase and leaving synchronous calls scattered through what now looks like async code; benchmark before and after any sync-to-async migration (companion §58.4, under realistic concurrent load, not just single-request timing) to confirm the expected benefit actually materializes rather than assuming it by default.

### 71.10 Engineering Intuition

> **How do I quickly tell if "async is slower" is a workload-mismatch problem or a lingering-blocking-call problem?** Check CPU utilization during the slow requests — consistently high, single-core CPU usage throughout suggests genuine CPU-bound work (a mismatch, §71.2's first cause); high CPU only briefly, correlated with request start, followed by low CPU while still "processing," suggests waiting on I/O that should be async but isn't yielding correctly.

> **Why might a simple, low-traffic internal tool actually run visibly worse after converting to async?** Because at genuinely low concurrency, async provides essentially no benefit over synchronous code (there's nothing to overlap when there's only ever one request in flight at a time), while still incurring a small, real per-coroutine scheduling overhead — async's benefit only manifests under genuine concurrent load.

### 71.11 Decision Tree: Diagnosing "Async Is Slower"

```
Is the workload genuinely I/O-bound (network/disk waits dominate)
or CPU-bound (real computation dominates)?
  CPU-BOUND -> Async was not expected to help at all (§9.5) --
             this isn't a regression to "fix" within async; consider
             a process pool (§10.6) if parallelism is genuinely needed.
  I/O-BOUND -> Audit every I/O call in the path for a genuine
             async-native implementation vs. a lingering
             synchronous call (§12.2, §26.4) -- this is almost
             always the actual root cause for this symptom shape.
```

### 71.12 Further Reading

- Companion §9 (Processes/Threads/GIL), §12 (AsyncIO), §26.4 (Async Database Drivers), §55 (Async Performance Tuning) — the full mechanism depth behind this chapter's diagnostic framework.

---
