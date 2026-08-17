## 10. Multiprocessing & Process Pools

### 10.1 The Problem: §9's CPU-Bound Work Actually Needs to Run in Parallel

§9.5 established that CPU-bound work needs separate processes to genuinely use multiple cores, since each process has its own GIL. This chapter develops the actual mechanism and its very real costs — because unlike switching between threads, switching to processes trades away the shared-memory convenience §9.2 described, and that trade has to be paid for explicitly.

### 10.2 Engineering Constraint: Processes Don't Share Memory — Data Must Be Serialized to Cross the Boundary

Because each process has its own separate memory space (§9.2), passing data into a worker process (the input to a function) and getting a result back out both require **serialization** — converting the Python object into a byte stream (via `pickle` by default) that can be sent across the process boundary, then deserialized on the other side. This has a real, measurable cost proportional to the size of the data being passed, meaning multiprocessing is a poor fit for workloads that need to pass large amounts of data per task relative to how much actual computation happens on it.

### 10.3 Tradeoff: Process Startup Cost vs. a Reusable Pool

Starting a new process is meaningfully more expensive than starting a new thread — the OS must set up an entirely separate memory space and (on some platforms) re-import the Python interpreter and application modules from scratch. `multiprocessing.Pool` (or `concurrent.futures.ProcessPoolExecutor`) amortizes this cost by starting a fixed set of worker processes once and reusing them across many tasks, rather than paying process-startup cost per task — the same amortization principle as a database connection pool (companion §26), applied to OS processes instead of database connections.

### 10.4 Decision Framework: When the Serialization Cost Is Worth Paying

Multiprocessing is worth its overhead specifically when a task's actual CPU computation time is large relative to the size of the data being passed in and out — a function that takes a small input (a file path) and does substantial computation (parsing and transforming a large file) is a good fit; a function that needs to pass a huge in-memory data structure for only a small amount of computation is a poor one, since serialization cost can dominate or even exceed any parallelism benefit gained.

### 10.5 Python Mechanism: `ProcessPoolExecutor` Mirrors `ThreadPoolExecutor`'s Interface Deliberately

`concurrent.futures.ProcessPoolExecutor` exposes the same `submit`/`as_completed`/`map` interface as `ThreadPoolExecutor` (§9.6) — the two are largely interchangeable at the call-site level, which is a deliberate design choice letting you switch between thread-based and process-based parallelism by changing one line, once you've correctly diagnosed (§9.5) which one the workload actually needs.

### 10.6 Implementation

```python
from concurrent.futures import ProcessPoolExecutor
import time

def compute_heavy(n: int) -> int:
    total = 0
    for i in range(10_000_000):     # genuinely CPU-bound work, no I/O at all
        total += i % (n + 1)
    return total

if __name__ == "__main__":           # required on Windows/spawn-based platforms
                                       # (§10.7) -- worker processes re-import
                                       # this module, so top-level code must be
                                       # guarded
    inputs = [1, 2, 3, 4]

    start = time.perf_counter()
    with ProcessPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(compute_heavy, inputs))
    elapsed = time.perf_counter() - start
    print(results, f"{elapsed:.2f}s")   # meaningfully faster than running all
                                          # four sequentially, on a 4+ core
                                          # machine -- genuine parallelism (§9.3)
```

`pool.map(compute_heavy, inputs)` serializes each input integer (cheap, since it's small, §10.4), sends it to a worker process, runs `compute_heavy` there using that process's own GIL independently of the other three, and serializes the small integer result back. Because each input is tiny and each computation is substantial, the serialization overhead (§10.2) is negligible relative to the parallelism gained — the opposite would be true if `inputs` were large in-memory objects instead of small integers.

### 10.7 Production Considerations

The `if __name__ == "__main__":` guard is not a style preference — on Windows and on platforms using the "spawn" process-start method, worker processes re-import the main module from scratch, and without the guard, code at module level (including the pool-creation code itself) would re-execute recursively in every worker, either crashing or spawning an unbounded cascade of processes. A second real production consideration: exceptions raised inside a worker process are captured, serialized, and re-raised in the calling process when `.result()` is accessed — but this means the worker-side traceback's *original* stack frames are not directly available for debugging the same way an in-process exception's would be, making clear, descriptive exception messages (companion §7) even more valuable for multiprocessing code than for single-process code.

### 10.8 Debugging

**Symptoms:** A multiprocessing-based job runs correctly on Linux in CI but hangs, crashes, or spawns runaway processes on a developer's Windows machine; a worker process silently fails with no clear traceback context. **Investigation:** Check for a missing `if __name__ == "__main__":` guard around top-level pool-creation code (§10.7); for silent worker failures, ensure `.result()` is actually being called/awaited somewhere, since an unretrieved future's exception can otherwise go unnoticed. **Root cause:** Platform-dependent process-start behavior interacting badly with unguarded module-level code. **Fix:** Add the `__name__ == "__main__"` guard around any code that creates a process pool or otherwise triggers module re-execution in workers, and always retrieve (or explicitly handle) every submitted future's result.

### 10.9 Interview Thinking

"When would you choose multiprocessing over threading in Python?" directly tests §9.5's decision framework — but a stronger answer adds §10.2's serialization-cost caveat unprompted: multiprocessing isn't a strictly-better replacement for threading whenever CPU-bound work is involved, it's the right choice specifically when the computation-to-data-size ratio makes the serialization overhead worth paying.

### 10.10 Mini Lab

Take the sequential and threaded CPU-bound sum-of-squares functions from §9.11's Mini Lab and add a third version using `ProcessPoolExecutor` with the same four chunks. Time all three and confirm the process-pool version is now meaningfully faster than both the sequential and threaded versions — directly observing the contrast between §9's GIL-bound result and this chapter's genuine parallelism.

---
