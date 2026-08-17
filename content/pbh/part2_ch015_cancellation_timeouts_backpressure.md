## 15. Cancellation, Timeouts, Race Conditions, Deadlocks & Backpressure

### 15.1 The Problem: Concurrent Work Must Be Stoppable, Bounded in Time, and Bounded in Volume

Part II has built up the mechanisms for running concurrent work (threads, processes, coroutines) and coordinating shared state safely (§14). This closing chapter addresses three related failure modes that emerge specifically once a backend is handling real, unpredictable production load: work that needs to be abandoned before it finishes (a client disconnected, a request was superseded), work that must not be allowed to run indefinitely (a hung downstream dependency), and more work arriving than the system can currently process (a traffic spike exceeding capacity).

### 15.2 Python Mechanism: Cancelling a Task Raises `CancelledError` Inside It

Calling `.cancel()` on an `asyncio.Task` doesn't stop it instantly from the outside — it schedules a `CancelledError` to be raised at the Task's next `await` point, giving the coroutine a chance to run any necessary cleanup (releasing a lock, closing a partially-open connection) via a `try`/`finally` or `except asyncio.CancelledError:` block before actually stopping. This is a deliberately cooperative design (consistent with §12.2's cooperative-multitasking model throughout `asyncio`) — a coroutine that never `await`s anything, or that swallows `CancelledError` without re-raising it, cannot be cleanly cancelled at all.

### 15.3 Decision Framework: Timeouts Are Cancellation With a Clock Attached

A **timeout** is exactly cancellation (§15.2), triggered automatically after a deadline rather than by explicit external request — `asyncio.timeout()` (or the older `asyncio.wait_for`) wraps a coroutine and cancels it if it hasn't completed within the given duration. Every external call a backend makes (a downstream API, a database query, a cache lookup) should have an explicit timeout — without one, a single unresponsive dependency can hold a request (and, per §12.2, potentially the entire event loop if that dependency is called incorrectly without yielding) open indefinitely, directly the mechanism underlying companion §67's circuit-breaker and retry chapter.

### 15.4 Tradeoff: A Timeout Value Is a Genuine Business Decision, Not Just an Engineering Default

Too short a timeout cancels genuinely slow-but-successful operations, wasting the work already done and potentially triggering an unnecessary retry storm (companion §64's incident pattern); too long a timeout lets a single slow dependency hold resources and degrade overall latency for far longer than acceptable. The correct value depends on the specific operation's actual expected latency distribution (companion §54's profiling and percentile-based reasoning) — a default, uniform timeout applied identically to a fast cache lookup and a slow report-generation call is very likely wrong for at least one of them.

### 15.5 Consolidating Race Conditions and Deadlocks as Named Failure Modes

§14 introduced race conditions (unsynchronized shared-state access, §14.1-14.2) and deadlocks (inconsistent lock-ordering, §14.8) as the two central risks of concurrent shared-state access. This chapter names them explicitly as the failure-mode counterparts to this chapter's cancellation/timeout/backpressure concerns: a race condition is a *correctness* failure (the wrong answer, silently); a deadlock is a *liveness* failure (no answer, ever, with no error raised); a missing timeout is a related liveness failure specifically caused by an external dependency rather than internal lock contention. All three share the same underlying lesson — concurrent systems fail in ways that produce no exception and no obvious symptom, which is exactly why explicit, deliberate handling (locks scoped correctly, timeouts on every external call) must be a default discipline, not a reactive fix applied only after the first incident.

### 15.6 Python Mechanism: Backpressure Is Refusing or Slowing Input Once Capacity Is Exceeded

**Backpressure** is the discipline of a system explicitly signaling "I cannot accept more work right now" — via a bounded queue that blocks or rejects new items once full (`asyncio.Queue(maxsize=N)`), a semaphore (§14.5) bounding concurrent in-flight operations, or an HTTP-level 429 response — rather than silently accepting unbounded work and degrading (or crashing) once actual capacity is exceeded. An **unbounded** queue is a specific, common anti-pattern: it looks safe (nothing is ever rejected) but simply defers the failure from "an explicit, immediate rejection" to "eventual memory exhaustion once enough backlog accumulates," which is a strictly worse failure mode — later, less predictable, and harder to diagnose.

### 15.7 Implementation

```python
import asyncio

async def call_flaky_dependency(item_id: str) -> str:
    await asyncio.sleep(2.0)          # simulates an occasionally-slow call
    return f"result-{item_id}"

async def call_with_timeout(item_id: str, timeout_s: float = 1.0) -> str | None:
    try:
        async with asyncio.timeout(timeout_s):    # §15.3: cancellation on a clock
            return await call_flaky_dependency(item_id)
    except TimeoutError:
        print(f"{item_id}: timed out after {timeout_s}s, giving up")
        return None


async def bounded_worker_pool(items: list[str], max_concurrency: int = 3):
    queue: asyncio.Queue[str] = asyncio.Queue(maxsize=max_concurrency)  # §15.6:
                                                                          # bounded,
                                                                          # not unbounded

    async def producer():
        for item in items:
            await queue.put(item)     # BLOCKS here if the queue is full --
                                        # this IS the backpressure signal
        for _ in range(max_concurrency):
            await queue.put(None)      # sentinel: tells each worker to stop

    async def worker():
        while True:
            item = await queue.get()
            if item is None:
                return
            result = await call_with_timeout(item)
            print(f"worker processed: {result}")

    await asyncio.gather(producer(), *[worker() for _ in range(max_concurrency)])

asyncio.run(bounded_worker_pool(["a", "b", "c", "d", "e"]))
```

`asyncio.timeout(timeout_s)` wraps the call to the (deliberately slow, 2-second) `call_flaky_dependency`, and since the timeout is 1 second, it cancels the call and raises `TimeoutError` before it would have completed — directly §15.2-15.3's mechanism, with the `except TimeoutError:` block handling the failure gracefully rather than letting it propagate as an unhandled crash. `asyncio.Queue(maxsize=max_concurrency)` bounds how much work can be buffered at once; `producer()`'s `await queue.put(item)` genuinely blocks once the queue is full, exactly the backpressure signal §15.6 describes — the producer cannot outrun the workers' actual processing capacity.

### 15.8 Production Considerations

Every external call in a production backend should have an explicit, deliberately-chosen timeout (§15.4) — a codebase audit checking for HTTP client calls, database queries, and cache lookups with no timeout configured is one of the highest-leverage, lowest-effort production-hardening exercises available, since a single unbounded call is enough to eventually cause a systemic incident under the right (or wrong) conditions. Backpressure mechanisms (bounded queues, semaphores, explicit rate limiting at the API boundary, companion §61) should be paired with clear, immediate feedback to the caller (a 429 with a `Retry-After` header, not just a dropped connection) — silently blocking or dropping requests without signaling why is a debugging burden shifted onto whoever investigates the resulting confusion later.

### 15.9 Debugging

**Symptoms:** A request occasionally hangs far longer than any individual operation in its path should reasonably take; under a traffic spike, memory usage grows continuously until the process crashes, with no single query or object obviously to blame. **Investigation:** For the hang, check every external call in the request's path for a missing or unreasonably long timeout (§15.3-15.4). For the memory growth, check for an unbounded queue or unbounded list accumulating work faster than it's being drained (§15.6's exact anti-pattern). **Root cause:** A call with no timeout waiting indefinitely on an unresponsive dependency; an unbounded buffer deferring, rather than preventing, capacity exhaustion. **Fix:** Add an explicit, latency-appropriate timeout to every external call; replace unbounded queues/buffers with bounded ones that reject or signal backpressure once a defined capacity limit is reached.

### 15.10 Interview Thinking

"Your service occasionally hangs under load with no errors in the logs — what do you check first?" is testing whether missing timeouts (§15.3) and unbounded queues (§15.6) are near the top of your default diagnostic checklist, ahead of more exotic explanations — these two causes account for a large fraction of real "silent hang" incidents specifically because neither one raises an obvious, loud error on its own.

### 15.11 Mini Lab

Extend §15.7's `bounded_worker_pool` to accept 20 items with `max_concurrency=3`, and add a print statement in `producer()` immediately before and after each `queue.put(item)` call, so you can observe the producer actually blocking (a visible pause in the printed output) once three items are already queued and being processed — directly witnessing backpressure in action rather than only reading about it. Then change `max_concurrency` to 10 and observe the producer blocking far less often, since the pipeline can now absorb more concurrent work before applying pressure back on the producer.

---
