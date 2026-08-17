## 11. Thread Pools & When Threads Still Matter

### 11.1 The Problem: Not Every I/O-Bound Library Speaks Async

§9 established threads as the right tool for I/O-bound work, and Part III will introduce `asyncio` as an alternative, often-preferred mechanism for the exact same I/O-bound category. This raises a real, recurring decision: given that async (§12) exists, when do threads remain the correct choice rather than an outdated one? The answer centers on a specific, common constraint — many mature, widely-used Python libraries (certain database drivers, certain cloud SDKs, most CPU-adjacent file-format libraries) are written in a purely synchronous, blocking style with no async equivalent, and a backend cannot simply wish that constraint away.

### 11.2 Engineering Constraint: A Blocking Call Inside an Async Function Blocks the Entire Event Loop

§12 will develop the event loop in full, but the load-bearing fact needed here: an `async def` function running on an event loop is expected to periodically yield control back to the loop (at every `await`) so other coroutines can run. A genuinely blocking, synchronous call (a synchronous database driver's query call, a CPU-bound computation with no `await` inside it) does not yield — it blocks the *entire* event loop for its duration, meaning every other coroutine waiting on that same loop, across every other concurrent request, is frozen until it returns. This is a severe, whole-application-affecting failure mode, not a localized one.

### 11.3 Decision Framework: Offload Blocking Calls to a Thread Pool From Within Async Code

The standard, correct fix for §11.2's problem is `loop.run_in_executor(...)` (or, in modern FastAPI code, `starlette.concurrency.run_in_threadpool`) — running the blocking call in a thread pool *managed alongside* the event loop, so the event loop itself remains free to keep servicing other coroutines while the blocking call proceeds on its own thread. This is precisely the case where threads and async are not competitors but collaborators: async handles the large volume of naturally-async I/O, while a thread pool handles the smaller set of unavoidably-blocking calls without letting them stall everything else.

### 11.4 Tradeoff: Offloading Has Real Cost, and a Bounded Pool Is Not Optional

Every call offloaded to a thread pool consumes one of a limited number of worker threads for its duration — if blocking calls arrive faster than the pool can drain them, requests queue up waiting for a free thread, exactly the same backpressure concern §15 develops formally. Sizing this pool too small under-utilizes available capacity; sizing it unbounded risks the same resource-exhaustion failure mode as an unbounded queue, since an unlimited number of simultaneously-blocked threads still each hold real OS and memory resources. The pool must be explicitly, deliberately sized — never left as an afterthought defaulting to "whatever the framework happens to pick."

### 11.5 Python Mechanism: `run_in_executor` Bridges Sync Code Into an Async World

```python
import asyncio
import time

def blocking_legacy_db_call(query: str) -> dict:
    time.sleep(0.3)                       # stands in for a real synchronous,
                                            # blocking driver call
    return {"query": query, "rows": 42}

async def handle_request(query: str) -> dict:
    loop = asyncio.get_running_loop()
    # Offload the blocking call to the loop's default thread pool executor --
    # the event loop stays free to service OTHER coroutines during this call.
    result = await loop.run_in_executor(None, blocking_legacy_db_call, query)
    return result

async def main():
    # Three "requests" handled concurrently -- without run_in_executor, these
    # would serialize completely (§11.2); with it, they overlap (§9.4's
    # I/O-overlap benefit, now achieved for a SYNC call from ASYNC code).
    results = await asyncio.gather(
        handle_request("SELECT 1"),
        handle_request("SELECT 2"),
        handle_request("SELECT 3"),
    )
    print(results)

asyncio.run(main())
```

`loop.run_in_executor(None, blocking_legacy_db_call, query)` submits `blocking_legacy_db_call` to the event loop's default thread pool (passing `None` uses the loop's built-in default executor; a custom, explicitly-sized `ThreadPoolExecutor` can be passed instead per §11.4's sizing concern) and returns an awaitable — `await`-ing it suspends only the current coroutine, letting the event loop run other coroutines (including the other two `handle_request` calls) while the blocking call proceeds on its own thread.

### 11.6 Production Considerations

The single most common production incident this mechanism prevents (or, if forgotten, causes) is an entire FastAPI application becoming unresponsive to *every* request the moment one request calls a blocking library directly, with no `run_in_executor` wrapping it — because §11.2's event-loop-blocking effect is global, not scoped to the one slow request, this failure mode looks like "the whole service is down" rather than "one endpoint is slow," and is directly diagnosed in companion §71 (Why Is Async Slower Than Sync?). The executor's thread pool size should be tuned based on how many concurrent blocking calls the application actually expects to offload simultaneously, not left at a language or framework default sized for a generic, unrelated workload.

### 11.7 Debugging

**Symptoms:** A FastAPI (or other async-framework) application becomes completely unresponsive — not just slow — whenever a specific endpoint is called, recovering once that endpoint's request completes. **Investigation:** Check that endpoint's handler for a synchronous, blocking call (a sync DB driver, a sync HTTP client, `time.sleep` instead of `asyncio.sleep`) made directly inside an `async def` function without `run_in_executor`/`run_in_threadpool`. **Root cause:** A blocking call is stalling the entire event loop for its duration (§11.2), not just the one request that triggered it. **Fix:** Wrap the blocking call in `run_in_executor` (or replace the library with a genuinely async-native equivalent, if one exists and is a better long-term fix).

### 11.8 Interview Thinking

"Your async FastAPI app freezes entirely whenever this one endpoint is called — why?" is one of the most common real-world-derived Python backend interview/debugging prompts, and it is testing exactly §11.2's mechanism — a candidate who immediately asks "does that endpoint call anything synchronous and blocking?" rather than guessing at unrelated causes (memory, networking) has correctly identified the single most likely, most Python-specific root cause.

### 11.9 Mini Lab

Write an async FastAPI-style handler (or a plain `asyncio` script simulating one) that calls a blocking `time.sleep`-based function directly, with no `run_in_executor`. Using `asyncio.gather` on three concurrent calls, time the result and observe that they take roughly 3x one call's duration (serialized, per §11.2) rather than overlapping. Then fix it using `run_in_executor` as in §11.5 and confirm the calls now overlap, taking roughly 1x one call's duration.

---
