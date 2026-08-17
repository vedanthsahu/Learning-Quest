## 54. CPU & Memory Profiling

### 54.1 The Problem: "It Feels Slow" Is Not a Diagnosis

A backend reported as "slow" could be slow for entirely different reasons — CPU-bound computation genuinely taking a long time, memory pressure causing excessive garbage collection, a blocking I/O call stalling the event loop (companion §12.2), or a database query taking most of the actual wall-clock time (companion §30). Guessing at the cause and optimizing the wrong thing wastes engineering effort and often doesn't fix the actual reported slowness at all — profiling exists specifically to replace guessing with measurement.

### 54.2 Python Mechanism: `cProfile` — Function-Level CPU Time Attribution

`cProfile` (Python's built-in deterministic profiler) instruments every function call during a profiled run, recording exactly how much cumulative time was spent inside each function (including or excluding time spent in functions it called, both reported separately) — the direct, standard tool for answering "which specific function is actually consuming the CPU time" rather than guessing from code review alone. Its output, sorted by cumulative time, reliably surfaces the actual bottleneck function even in code the profiling engineer didn't write or doesn't fully understand yet.

### 54.3 Decision Framework: `cProfile`'s Overhead Makes It a Development/Staging Tool, Not an Always-On Production Instrument

`cProfile`'s per-function-call instrumentation adds real overhead (commonly estimated at roughly 2-5x slower execution, though the exact factor varies by workload) — acceptable for a deliberate, time-boxed profiling session against a reproduction of a suspected slow code path, but not something to leave permanently enabled against live production traffic. For *continuous* production-level performance visibility (as opposed to a deep, deliberate investigation), a lower-overhead sampling profiler (`py-spy`, which samples the call stack periodically from outside the running process, adding negligible overhead and requiring zero code changes to attach) is the more appropriate always-on or on-demand production tool.

### 54.4 Python Mechanism: `py-spy` — Attaching to a Running Production Process Without Restarting It

`py-spy` attaches to an already-running Python process from the outside (given its process ID) and samples its call stack at a configurable interval, producing either a flame graph (a visual, hierarchical view of where time is being spent) or a `top`-like live view of current CPU consumption per function — critically, without requiring the target process to be restarted, modified, or even aware it's being profiled, making it the practical tool for investigating a genuinely live, currently-slow production process in real time rather than only after the fact against a reproduction.

### 54.5 Python Mechanism: `tracemalloc` and `memory_profiler` — Attributing Memory Growth to Specific Allocations

`tracemalloc` (also built into the standard library) tracks memory allocations and can report exactly which lines of code are responsible for the largest current memory usage, or compare two snapshots taken at different points in time to identify what's actually *growing* between them — the direct tool for investigating a suspected memory leak (memory usage climbing steadily over the application's lifetime rather than staying roughly stable) by attributing the growth to specific, identifiable code rather than a vague "memory is increasing" observation with no actionable next step.

### 54.6 Decision Framework: A Memory Leak in Python Is Almost Always an Unintended Reference, Not a True Language-Level Leak

Python's garbage collector reclaims memory for any object with no remaining references — a genuine, unbounded "memory leak" in the C/C++ sense (memory allocated and never freed even in principle) is rare in pure Python code. What's commonly *called* a memory leak in a Python backend is almost always an **unintended, growing reference** — a module-level list or dict that code keeps appending to and never clears (directly companion §1.5's mutable-default-argument trap, but manifesting as accumulation across the application's entire lifetime rather than within a single function call), or an event listener/callback registered repeatedly without ever being deregistered, each registration holding a reference that prevents the referenced object from ever being collected. `tracemalloc`'s snapshot-diff capability (§54.5) is specifically suited to finding exactly this kind of unintended, growing reference.

### 54.7 Implementation

```python
import cProfile
import pstats
import io

def profile_function(func, *args, **kwargs):
    profiler = cProfile.Profile()
    profiler.enable()
    result = func(*args, **kwargs)
    profiler.disable()

    stream = io.StringIO()
    stats = pstats.Stats(profiler, stream=stream).sort_stats("cumulative")
    stats.print_stats(10)                # top 10 functions by cumulative time
    print(stream.getvalue())
    return result


import tracemalloc

def find_memory_growth(operation_fn, iterations: int = 100):
    tracemalloc.start()
    snapshot_before = tracemalloc.take_snapshot()

    for _ in range(iterations):
        operation_fn()                    # run the suspected-leaking
                                            # operation repeatedly

    snapshot_after = tracemalloc.take_snapshot()
    diff = snapshot_after.compare_to(snapshot_before, "lineno")

    print("Top 5 memory growth sources:")
    for stat in diff[:5]:
        print(stat)                        # shows the EXACT file/line
                                            # responsible for the growth (§54.6)
```

`profile_function` wraps `cProfile`'s enable/disable calls around a target function call, formatting the result via `pstats` sorted by cumulative time — running this against a suspected-slow endpoint's handler function (or the specific service-layer function it calls) directly surfaces which nested function call is actually consuming the time, rather than requiring manual, ad hoc `time.perf_counter()` calls scattered through the code to narrow it down by hand. `find_memory_growth` runs a suspected operation repeatedly and diffs memory snapshots before and after — the growth attributed to specific lines by `compare_to` is exactly the actionable signal §54.6 describes: not "memory is growing" in the abstract, but "this specific line is where the growing allocations originate."

### 54.8 Production Considerations

Profiling a synthetic, isolated reproduction of a slow operation is valuable but should be validated against production-representative data volume and concurrency (companion §118.4's environment-parity principle, applied to performance investigation specifically) — a function profiled as fast against a small test dataset may behave very differently against real production data size, especially if its actual bottleneck is data-volume-dependent (companion §30's N+1 problem is a direct example: invisible against 3 test rows, severe against 3,000 real ones). `py-spy`'s ability to attach to a live production process without restarting it (§54.4) makes it specifically valuable during an active incident — profiling the actual, currently-struggling process in real time, rather than only being able to investigate after the fact against a reproduction that may not perfectly capture whatever made that specific moment slow.

### 54.9 Debugging

**Symptoms:** An endpoint is reported as slow, but its own code "looks fine" on manual review, and the actual bottleneck isn't obvious from reading it; an application's memory usage climbs steadily over days of uptime, eventually requiring a restart to recover. **Investigation:** For the slow-endpoint case, profile the actual handler function via `cProfile` (§54.2) against a realistic reproduction before making any changes based on assumption alone — the actual bottleneck is very often a specific, non-obvious function deep in a call chain (a serialization step, an unexpectedly expensive validator) rather than the code a developer's intuition first suspects. For the memory-growth case, use `tracemalloc`'s snapshot-diff (§54.5-54.6) to identify the specific accumulating reference, rather than guessing at which of several plausible module-level collections might be the culprit. **Root cause:** An unexpected, specific function actually dominating execution time once measured rather than assumed; an unintended, growing reference (a module-level collection, an unregistered callback) accumulating across the application's lifetime. **Fix:** Optimize the specific function `cProfile` identifies as the actual bottleneck, not the function initially suspected without measurement; clear or bound the specific accumulating reference `tracemalloc` identifies, or ensure callbacks/listeners are correctly deregistered when no longer needed.

### 54.10 Interview Thinking

"An endpoint is slow, but the code looks fine — how do you investigate?" is testing whether measurement-first profiling (§54.2, §54.4) is your default response, rather than reasoning from code review alone or guessing which part "seems" slow — a strong answer names the specific tool (`cProfile` for a deliberate investigation, `py-spy` for a live production process) matched to the actual investigation context, rather than a vague "I'd profile it" without specifying how.

### 54.11 Mini Lab

Write a function containing a deliberately inefficient nested loop (an O(n²) operation disguised inside a few levels of function calls, so it's not obvious from a quick read) alongside a fast, unrelated function, and call both from a single top-level function. Profile the top-level function using `profile_function` from §54.7 and confirm the profiler output correctly identifies the inefficient nested function as the dominant cost, not the fast one, even without you telling it which function you suspect. Then write a small script that appends to a module-level list in a loop without ever clearing it, and use `find_memory_growth` to confirm `tracemalloc` correctly attributes the growth to that specific append line.

---
