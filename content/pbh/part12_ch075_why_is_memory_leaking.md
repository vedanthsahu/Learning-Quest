## 75. Why Is Memory Leaking?

### 75.1 Symptoms

A long-running Python backend process's memory usage grows steadily over time (hours to days) rather than stabilizing at a steady-state level, eventually triggering an out-of-memory kill (companion §66.6's liveness-probe-triggered restart, which can mask the underlying leak by periodically "resetting" it) or degrading performance as available memory shrinks.

### 75.2 Possible Causes

An unbounded, ever-growing in-process cache or dictionary (companion §47.3's in-memory cache tier) with no eviction policy or size limit, accumulating entries indefinitely as new, unique keys are seen over the process's lifetime; a reference cycle involving objects with `__del__` methods or objects held by a C extension, which Python's cyclic garbage collector may handle more slowly or, in specific edge cases, not at all (companion §2.7's reference-counting-plus-cycle-detector model); event listeners, callbacks, or subscriptions registered but never unregistered, each accumulating a permanent reference to otherwise-unreachable objects (companion §12.7's task-reference pattern, generalized); a growing, unbounded queue or buffer (companion §11.8) accepting items faster than they're consumed, with no bounded-size backpressure mechanism; or large objects (companion §57.6) retained via a lingering reference — often a module-level or class-level variable accidentally accumulating results across requests instead of being properly scoped to a single request's lifetime.

### 75.3 Metrics

Process resident memory (RSS) over time (companion §57.6) — a genuine leak shows a persistent, roughly-monotonic upward trend across a timescale of hours-to-days, distinguishable from normal, bounded memory fluctuation that rises and falls with request load; Python-level heap statistics broken down by object type and count (`tracemalloc`, companion §57.7) taken as periodic snapshots, with a *growing* count of a specific object type across snapshots — rather than the absolute count at any single point — being the actual leak signature.

### 75.4 Logs

Periodic `tracemalloc` snapshot comparisons (companion §57.7) logged or exported at a fixed interval, showing which specific object type's count is growing unboundedly across snapshots; garbage collector statistics (`gc.get_stats()`) revealing an unusually high count of objects the collector is having to process, potentially indicating reference cycles.

### 75.5 Investigation

Take at least two `tracemalloc` snapshots (companion §57.7) separated by a meaningful time interval under representative load, and diff them — the object type(s) with the largest *growth* in count between snapshots (not the largest absolute count, which may simply reflect normal, bounded, steady-state usage) directly identifies the leaking allocation site. Once a specific object type is identified, trace backward through the code to find every place that type is created and confirm whether each creation site has a corresponding, guaranteed release — the same "acquire must have a guaranteed release" discipline as companion §72.5's connection-leak investigation, generalized from connections to any Python object.

### 75.6 Root Cause

In practice, the most common real-world causes, in order: an unbounded in-process cache or dictionary lacking any eviction policy (companion §47.3), silently growing as the application encounters new, unique inputs over its lifetime; a module-level or class-level variable accidentally used to accumulate data across requests instead of being correctly scoped per-request, often introduced when a developer familiar with a stateless, single-request mental model doesn't realize a specific variable's scope actually persists across every request the long-running process ever serves; and registered callbacks/listeners/subscriptions that are added but never correspondingly removed, each new registration permanently pinning a reference for the remaining lifetime of the process.

### 75.7 Fix

For an unbounded cache, impose an explicit maximum size with a genuine eviction policy (companion §47.3's LRU or similar), converting an unbounded structure into a bounded one; for an accidentally process-lifetime-scoped variable, correct its scope to the actual intended lifetime (a request, a session) rather than the accidental module/process lifetime; for unremoved listeners/callbacks, ensure every registration has a corresponding, guaranteed deregistration on the relevant object's cleanup path (the same guaranteed-cleanup discipline as companion §20.4's dependency pattern, generalized).

### 75.8 Tradeoffs

A bounded cache with eviction trades a theoretical maximum hit rate (an unbounded cache can never evict a value that might later be reused) for a bounded, predictable memory footprint — for any production system, this is essentially always the correct tradeoff, since an unbounded cache's eventual out-of-memory failure is a far worse outcome than a marginally lower hit rate; correcting variable scope has no real downside beyond the one-time engineering cost of identifying and fixing the specific mis-scoped variable.

### 75.9 Prevention

Default every in-process cache or accumulating structure to an explicit, bounded maximum size from the moment it's introduced, rather than only adding a bound after a leak is discovered in production; monitor process RSS over a timescale of hours-to-days, not only over a single request or a short load test (companion §57.6), specifically because a slow leak is by definition invisible on short timescales; establish a code-review habit of explicitly asking "what is this variable's actual intended lifetime, and does its declared scope match that lifetime?" for any variable declared outside a function's local scope in a long-running server process.

### 75.10 Engineering Intuition

> **Why is comparing two `tracemalloc` snapshots so much more useful than looking at a single snapshot's absolute numbers?** Because a large absolute count of some object type may simply reflect normal, bounded, steady-state application behavior (many objects are supposed to exist at any given moment); it's specifically the *growth* in count between two snapshots taken over time that distinguishes an actual, unbounded leak from ordinary, healthy memory usage.

> **Why do memory leaks in long-running Python backends often go undetected far longer than in other languages?** Because Python's automatic memory management (companion §2.7) removes the discipline of explicit allocation/deallocation that might otherwise prompt a developer to consciously consider an object's lifetime — the illusion that "Python handles memory for you" is true for individual objects' reference counts, but not true for the *logical* lifetime of a growing collection a developer chose to create and never bounded.

### 75.11 Decision Tree: Diagnosing a Memory Leak

```
Does RSS grow persistently over a HOURS-TO-DAYS timescale under
roughly steady load, rather than fluctuating and returning to a
stable baseline?
  NO -> Likely normal, bounded memory usage -- not a leak.
  YES -> Take two tracemalloc snapshots (§57.7) separated by time.
         Which object type shows the largest GROWTH in count
         (not largest absolute count) between the two snapshots?
    An application-defined cache/dict type -> Check for a missing
      eviction policy / size bound (§75.2, §47.3).
    A request-related or session-related type -> Check for
      accidental module/class-level (process-lifetime) scoping
      of what should be request-scoped state.
    A callback/listener/subscription type -> Check for missing
      deregistration on cleanup.
```

### 75.12 Further Reading

- Companion §2.7 (Memory Management & Garbage Collection), §47.3 (In-Process Caching), §57.6-57.7 (Memory Profiling with tracemalloc) — the full mechanism depth behind this chapter's diagnostic framework.

---
