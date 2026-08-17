## 55. Async Performance & Event Loop Tuning

### 55.1 The Problem: §54's General Profiling Tools Don't Directly Answer Async-Specific Performance Questions

§54's `cProfile`/`py-spy` measure CPU time attribution well, but an async application's performance problems are frequently *not* CPU-time problems at all — they're event-loop scheduling problems (a coroutine that should be running quickly is instead waiting behind other work), exactly the class of issue companion §12.2's blocking-call warning and §15's cancellation/timeout/backpressure chapter described conceptually. This chapter provides the specific tools for measuring and diagnosing *that* category of problem concretely.

### 55.2 Python Mechanism: Detecting a Blocked Event Loop via `asyncio`'s Debug Mode

Running `asyncio` with debug mode enabled (`asyncio.run(main(), debug=True)`, or the `PYTHONASYNCIODEBUG=1` environment variable) makes the event loop log a warning whenever a callback or task takes longer than a threshold (100ms by default) to yield control back — this is the direct, built-in mechanism for catching companion §12.2's exact failure mode empirically: a synchronous, blocking call accidentally left inside `async def` code, without needing to manually audit every code path for one by hand. This should be enabled routinely in development and staging environments specifically to catch this class of bug before it reaches production, not only reached for reactively after a production incident already occurred.

### 55.3 Python Mechanism: Uvloop as a Drop-In Event Loop Performance Upgrade

Companion §16.6 mentioned `uvloop` (a faster, Cython-based event loop implementation) as underlying Uvicorn's own performance; it can also be adopted explicitly for any asyncio application (`uvloop.install()` before running) — a genuine, measurable throughput improvement for I/O-heavy async workloads with essentially zero application-code changes required, since it's a drop-in replacement implementing the identical `asyncio` API surface. This is the rare case of a meaningful performance win requiring almost no engineering judgment or tradeoff analysis at all — the main caveat being platform support (uvloop doesn't support Windows natively), relevant for local development environment parity if the team develops across mixed operating systems.

### 55.4 Engineering Constraint: Task Scheduling Fairness — Many Small Coroutines Can Starve Each Other's Progress

Because `asyncio` is cooperatively scheduled (companion §12.2), a very large number of concurrently-running tasks, each doing a small amount of synchronous work between `await` points, can produce a subtle fairness problem: the event loop services tasks roughly in the order they become ready, and a task performing many small, individually-fast synchronous operations between its `await` points can still, in aggregate, delay other tasks' turns more than expected — a real, measurable latency effect distinct from any single blocking call, and one that shows up specifically under high concurrent task counts rather than in a simple, low-concurrency test.

### 55.5 Decision Framework: Measuring Async-Specific Latency — Time-in-Queue vs. Time-Executing

A request's total latency in an async application decomposes into time spent actually executing versus time spent *waiting* for the event loop to get around to running it (a distinction companion §37.9's Celery worker-capacity discussion made for queue-based systems, now applied to the event loop's own internal task scheduling) — a request handler that executes quickly once it actually starts running, but whose *total* latency is high because it waited a long time for the event loop to first schedule it, points to an event-loop-level congestion problem (too many tasks, or a specific slow task hogging execution turns), not a problem with that specific handler's own code at all. Distinguishing these two components (via explicit timing instrumentation around both the scheduling wait and the actual execution) is the key diagnostic step separating "this specific code is slow" from "the event loop itself is oversubscribed."

### 55.6 Implementation

```python
import asyncio
import time
import logging

logging.basicConfig(level=logging.DEBUG)   # surfaces asyncio's own slow-
                                             # callback warnings (§55.2)

async def main():
    # Enables the >100ms-callback warning mechanism directly (§55.2)
    asyncio.get_event_loop().set_debug(True)

    async def accidentally_blocking_task():
        time.sleep(0.3)                     # a MISTAKE inside async code --
                                              # debug mode will log a warning
                                              # about this specific callback

    await accidentally_blocking_task()


# Measuring scheduling delay vs. execution time (§55.5)
async def timed_handler(name: str, scheduled_at: float):
    start_execution = time.perf_counter()
    scheduling_delay_ms = (start_execution - scheduled_at) * 1000

    await asyncio.sleep(0.05)               # simulated real work
    execution_ms = (time.perf_counter() - start_execution) * 1000

    print(f"{name}: waited {scheduling_delay_ms:.1f}ms to start, "
          f"took {execution_ms:.1f}ms to execute")

async def run_many_concurrent(count: int):
    now = time.perf_counter()
    await asyncio.gather(*[
        timed_handler(f"task-{i}", now) for i in range(count)
    ])

# uvloop adoption (§55.3) -- typically at application startup, before
# any event loop is created:
# import uvloop
# uvloop.install()
```

Enabling `asyncio`'s debug mode makes `accidentally_blocking_task`'s `time.sleep(0.3)` produce a logged warning identifying exactly which callback exceeded the slow-callback threshold — directly surfacing companion §12.2's blocking-call mistake empirically, without needing to already suspect that specific function. `timed_handler`'s explicit measurement of `scheduling_delay_ms` separately from `execution_ms` demonstrates §55.5's diagnostic split concretely — running `run_many_concurrent` with a large `count` and observing `scheduling_delay_ms` growing with task count (while `execution_ms` per task stays roughly constant) is the direct, measured signature of event-loop-level congestion rather than any individual handler's own code being slow.

### 55.7 Production Considerations

`asyncio` debug mode's overhead (similar in spirit to `cProfile`'s, §54.3) makes it appropriate for development/staging, not permanently-enabled production use — the equivalent production-safe practice is periodically sampling and logging scheduling-delay metrics (§55.5's pattern, instrumented as ordinary structured logging/metrics, companion §64-65) as a standing, low-overhead signal rather than the full debug-mode instrumentation. `uvloop` adoption (§55.3), while low-risk, should still be validated in staging before production rollout — a genuine behavioral edge case in how uvloop handles a specific asyncio feature differently from the default event loop, while rare, is exactly the kind of low-probability-but-real risk that justifies the standard staged-rollout discipline (companion §46.3's canary/progressive-rollout principle) rather than a same-day production cutover with no validation window at all.

### 55.8 Debugging

**Symptoms:** An async application's per-request execution time (measured in isolation) looks fast, but end-to-end latency under real concurrent load is noticeably higher than that isolated measurement would predict. **Investigation:** Instrument requests with the scheduling-delay-versus-execution-time split (§55.5-55.6) under realistic concurrent load, not just a single-request test — a growing scheduling delay specifically correlated with concurrent task count, while execution time itself stays flat, is the direct signature of event-loop congestion rather than a code-level performance problem in any individual handler. **Root cause:** Too many concurrently-scheduled tasks (or one or more mis-behaving tasks doing excessive synchronous work between `await` points, §55.4) competing for the event loop's single thread of execution. **Fix:** Reduce concurrent task volume via backpressure/bounding (companion §15.6-15.7) if genuinely oversubscribed; audit for and fix any task performing unexpectedly large amounts of synchronous work between yield points, breaking it into smaller units with more frequent `await` points if necessary.

### 55.9 Interview Thinking

"Your async application's individual request handlers profile as fast, but overall latency under load is worse than expected — why?" is testing whether you distinguish execution time from event-loop scheduling delay (§55.5) as two genuinely separate latency components — a strong answer proposes measuring both separately under realistic concurrency, rather than continuing to profile individual handlers in isolation, which by construction cannot reveal a scheduling-congestion problem that only manifests under real concurrent load.

### 55.10 Mini Lab

Implement `timed_handler` and `run_many_concurrent` as in §55.6, running with a small count (10) and then a much larger count (2000). Compare the average `scheduling_delay_ms` between the two runs and confirm it grows meaningfully at higher concurrency while `execution_ms` per task stays roughly constant — directly observing §55.5's diagnostic split in your own measured data. Then enable `asyncio` debug mode and deliberately introduce a `time.sleep()` call inside one of the concurrent tasks, confirming the debug-mode warning correctly identifies it.

---
