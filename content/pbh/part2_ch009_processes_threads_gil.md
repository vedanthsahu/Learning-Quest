## 9. Processes, Threads & the GIL

### 9.1 The Problem: A Backend Must Do More Than One Thing at Once, Somehow

A production backend handles many requests concurrently, some of which are waiting on I/O (a database query, an external API call) and some of which do real CPU work (parsing a large file, computing a report). Python offers several genuinely different mechanisms for "doing more than one thing at once" — processes, threads, and (§12) async coroutines — and choosing the wrong one for a given workload either wastes hardware capacity or, worse, silently fails to actually run things in parallel at all.

### 9.2 Engineering Constraint: A Process Has Its Own Memory; a Thread Shares Its Process's Memory

A **process** is an independent running program with its own memory space — two processes cannot see each other's variables directly, and communicating between them requires explicit mechanisms (pipes, shared memory, a queue). A **thread** runs *within* a process and shares that process's entire memory space with every other thread in it — any thread can read and write any object any other thread in the same process can see, which is exactly what makes threads lightweight to create and share data through, and exactly what makes them dangerous without careful synchronization (§14).

### 9.3 Engineering Constraint: The GIL Means Only One Thread Executes Python Bytecode at a Time

CPython has a **Global Interpreter Lock (GIL)** — a single lock that only one thread may hold at any moment, required to execute Python bytecode at all. The direct, load-bearing consequence: multiple Python threads in the same process **cannot** execute Python code truly simultaneously on multiple CPU cores — at any instant, only one thread is actually running Python, with the OS rapidly switching which thread holds the GIL. This single fact is the reason the rest of this chapter's decision framework exists at all.

### 9.4 Tradeoff: Why Threads Still Help Despite the GIL — I/O-Bound vs. CPU-Bound Work

The GIL is released automatically whenever a thread is blocked waiting on I/O (a network call, a disk read) — during that wait, another thread can acquire the GIL and make progress. This means threads genuinely help for **I/O-bound** work (a thread waiting on a slow database query lets another thread's Python code run during the wait) but provide **no** parallel speedup for **CPU-bound** work (two threads both doing pure computation still take turns holding the GIL, executing serially in wall-clock terms, often *slower* than a single thread once GIL-switching overhead is included).

### 9.5 Decision Framework: Processes for CPU-Bound Work, Threads (or Async) for I/O-Bound Work

For genuinely CPU-bound work (image processing, heavy data transformation, cryptographic hashing at scale) that needs to use multiple cores in parallel, use **multiprocessing** (§10) — separate processes each have their own GIL, so N processes on N cores genuinely run Python bytecode simultaneously, at the cost of separate memory spaces and the communication overhead that implies. For I/O-bound work (the overwhelming majority of a typical backend's workload — waiting on databases, caches, and external APIs), threads or async (§12) are the right tool, since the GIL's constraint doesn't bind during I/O waits in the first place.

### 9.6 Python Mechanism: `threading` and `concurrent.futures`

The `threading` module provides raw `Thread` objects; `concurrent.futures.ThreadPoolExecutor` provides a higher-level pool that manages a fixed number of worker threads and hands them callables to run, returning a `Future` representing the eventual result — almost always the preferred interface over raw `Thread` management for backend code, since it handles pool sizing and result collection for you.

### 9.7 Implementation

```python
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch_from_slow_api(item_id: str) -> dict:
    time.sleep(0.5)                      # simulated I/O wait -- GIL released
                                           # during this sleep (§9.4)
    return {"item_id": item_id, "data": f"result-for-{item_id}"}

item_ids = ["a", "b", "c", "d", "e"]

start = time.perf_counter()
with ThreadPoolExecutor(max_workers=5) as pool:
    futures = {pool.submit(fetch_from_slow_api, iid): iid for iid in item_ids}
    for future in as_completed(futures):
        result = future.result()
        print(result)
elapsed = time.perf_counter() - start
print(f"Total: {elapsed:.2f}s")           # ~0.5s, NOT 5x0.5=2.5s -- the five
                                           # sleeps overlapped (§9.4)
```

`ThreadPoolExecutor(max_workers=5)` starts five worker threads; `pool.submit` hands each a call to `fetch_from_slow_api` and returns immediately with a `Future`. Because `time.sleep` (standing in for a real I/O wait) releases the GIL, all five threads' sleeps overlap rather than running one after another — the whole batch finishes in roughly the time of *one* call, not five, directly demonstrating §9.4's I/O-bound speedup. Running the identical pattern with a genuinely CPU-bound function in place of the sleep would show no such speedup, since the GIL would force the five threads' actual computation to serialize.

### 9.8 Production Considerations

Sizing a thread pool too large for I/O-bound work has a real, if softer, cost than sizing it correctly — beyond a certain point, more threads mostly add scheduling overhead without meaningfully more overlap, and each thread still consumes real memory (its own stack) regardless of how little CPU work it does. A more dangerous production mistake: accidentally running CPU-bound work (an unexpectedly expensive data-transformation step added later to an I/O-bound-designed thread pool) inside that same pool — it silently degrades every other request's throughput because that CPU-bound thread now holds the GIL for its entire computation, blocking the I/O-bound threads that would otherwise have been swapping in during the wait.

### 9.9 Debugging

**Symptoms:** A backend using threads for what was assumed to be pure I/O-bound work shows worse throughput than expected under load, sometimes *worse* than a single-threaded baseline. **Investigation:** Profile (companion §54) whether the "I/O-bound" code actually spends meaningful wall-clock time in CPU computation, not just waiting — a JSON-parsing step, a data transformation, or a templating call embedded inside what looks like an I/O-bound handler is a common, easy-to-miss culprit. **Root cause:** CPU-bound work executing inside a thread pool sized and reasoned about as if it were purely I/O-bound, subject to the GIL's serialization (§9.4). **Fix:** Move the genuinely CPU-bound portion to a process pool (§10) or an entirely separate worker service, keeping the thread pool for the actual I/O-waiting portions only.

### 9.10 Interview Thinking

"Why doesn't adding more threads speed up this CPU-bound function?" is a direct GIL-comprehension test — a strong answer states the GIL constraint precisely (only one thread executes Python bytecode at a time, §9.3) and immediately proposes multiprocessing as the correct fix, rather than describing the GIL as a vague, un-actionable limitation.

### 9.11 Mini Lab

Write two versions of a function computing the sum of squares for a large range of numbers (a genuinely CPU-bound task). Run one version sequentially across four chunks of the range, then run it again using a `ThreadPoolExecutor` with four workers, one chunk per thread. Time both and confirm the threaded version is not meaningfully faster (and may be slower) — directly observing §9.4's constraint yourself rather than only reading about it.

---
