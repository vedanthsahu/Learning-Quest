## 26. Concurrency: Threads, Locks, Atomics, Lock-Free Structures, Async/Event Loops

### 26.1 What This Chapter Adds to §2.4

§2.4 established that threads share memory, and that sharing is precisely what makes concurrency bugs possible. This chapter covers the actual mechanisms used to make concurrent access safe, their real performance costs, and the failure modes each one introduces.

### 26.2 The Race Condition, Made Precise

A **race condition** occurs when the correctness of a result depends on the relative timing of two or more threads' operations. The canonical example: two threads both execute `counter = counter + 1` on a shared variable. This is not one atomic operation — it is read, increment, write — and if both threads read the same original value before either writes back, one increment is silently lost.

```
Thread A                  Thread B
--------                   --------
read counter (=5)
                           read counter (=5)
compute 5+1=6
                           compute 5+1=6
write counter=6
                           write counter=6

Result: counter = 6, not 7. One increment vanished.
```

This is exactly the coordination failure category from §1.3.2, now shown at the instruction level.

### 26.3 Locks (Mutexes): The Straightforward Fix, and Its Costs

A **mutex** (mutual exclusion lock) ensures only one thread executes a protected section of code (a **critical section**) at a time — any other thread attempting to acquire the lock blocks until the holder releases it. This directly prevents §26.2's interleaving. The cost is threefold: (1) threads that block on a contended lock waste time waiting rather than doing useful work; (2) a thread holding a lock and getting preempted (§25.2) can cause every other thread waiting on that lock to stall for the preempted thread's entire remaining time slice; and (3) locks acquired in inconsistent order across different code paths produce **deadlock** — two threads each holding a lock the other needs, with neither able to proceed.

```
Deadlock:
   Thread A: holds Lock1, wants Lock2
   Thread B: holds Lock2, wants Lock1
   -> neither can ever proceed.

   Prevention: always acquire locks in the same global order,
   everywhere in the codebase.
```

### 26.4 Atomics: Avoiding Locks for Simple Operations

For simple operations like incrementing a counter, taking a full lock is often more overhead than necessary. Modern CPUs provide **atomic instructions** — operations like compare-and-swap (CAS) that are guaranteed by hardware to execute as a single, indivisible step, even under concurrent access from multiple cores.

```
Atomic increment via compare-and-swap (conceptual):
    loop:
        old = counter                  (read)
        new = old + 1
        if CAS(counter, old, new):     (atomic: only succeeds if
            break                       counter still equals `old`)
        # else: someone else changed it first; retry
```

This "optimistic retry" pattern — try, detect if someone else interfered, retry if so — is the foundation of **lock-free data structures**: structures that guarantee some thread always makes progress (unlike a lock, where a preempted holder stalls everyone), at the cost of significantly more complex implementation and subtler correctness reasoning. Lock-free structures are not "faster in every case" — under low contention, a simple lock is often just as fast and much easier to reason about; the benefit of lock-free approaches appears specifically under high contention or when strict progress guarantees matter (e.g., code that must not block, such as within a signal handler or a real-time system).

### 26.5 False Sharing: A Performance Bug With No Logical Race

A subtler problem, invisible to correctness reasoning entirely: CPUs cache memory in fixed-size lines (commonly 64 bytes). If two unrelated variables, each used by a different thread on a different core, happen to sit within the same cache line, then every write by either thread invalidates the other core's cached copy of that line — even though the two threads never touch each other's actual variable. This is **false sharing** (Part V §91.B): a pure performance problem, with no data race and no incorrect result, that can nonetheless slow a supposedly-parallel workload dramatically, because the cache-coherence protocol forces constant, unnecessary cache-line transfers between cores. The fix is padding or restructuring data so that independently-accessed variables don't share a cache line.

### 26.6 The Async/Event-Loop Alternative: Concurrency Without Shared-Memory Threads

§25.5 introduced event-loop-based I/O as an alternative to thread-per-operation. From a concurrency-correctness standpoint, a single-threaded event loop has an important structural advantage: because only one thread ever executes application code at a time (I/O happens via OS-level notification, not additional application threads), most of §26.2–26.5's shared-memory hazards simply don't arise for code running on that one thread — there is no possibility of two pieces of your logic interleaving mid-operation, because they never run simultaneously. The tradeoff: a single event loop can only use one CPU core's worth of computation; scaling an event-loop-based system across multiple cores typically means running multiple independent event-loop processes (or workers), each handling its own subset of connections, sidestepping shared-memory concurrency rather than solving it — a deliberate architectural choice, not an accident.

### 26.7 Common Mistakes and Production Debugging Signals

- Forgetting that a "thread-safe" data structure only guarantees safety for individual operations on it — a sequence of two thread-safe operations (check-then-act, e.g., "check if a key exists, then insert it") is not atomic as a whole unless explicitly made so, reintroducing §26.2's race at a higher level.
- Holding a lock across a blocking I/O call, which can stall every other thread waiting on that lock for the full duration of a slow network or disk operation — locks should be held for the shortest possible time, ideally never across I/O.
- Diagnosing "the CPU usage is low but throughput is bad" without considering lock contention — heavily contended locks produce exactly this signature, since threads are blocked waiting, not consuming CPU.

### 26.8 Engineering Intuition

> **How do I know I have a race condition?** Symptoms that are intermittent, non-reproducible in isolation, and correlate with concurrent load rather than any specific input — this is the signature that distinguishes a race from an ordinary logic bug.
>
> **What metrics indicate lock contention specifically?** Low CPU utilization coexisting with high request latency and a high count of threads in a "blocked/waiting" state (visible via thread dump or profiler) rather than "runnable."
>
> **What breaks first if concurrency is handled carelessly?** Data corruption under load that never appears in single-threaded testing — precisely why concurrency bugs are notorious for passing code review and all existing tests, then appearing only in production under real concurrent traffic.
>
> **When should you avoid locks and atomics entirely?** When a single-threaded event-loop model (§26.6) is sufficient for your workload — sidestepping shared-memory concurrency entirely is simpler and safer than getting locking right, whenever your workload allows it.
>
> **What would a hyperscale company do?** Use carefully-reviewed lock-free structures in their most contended, latency-critical code paths, while defaulting to simple locks or event-loop models everywhere contention isn't proven to be a bottleneck — lock-free code is reserved for where profiling justifies its complexity.
>
> **What would a two-person startup do?** Use whatever concurrency primitives their language/framework provides by default (often a simple mutex or an async/event-loop runtime) and never hand-roll a lock-free structure.
>
> **What changes with scale?** At low concurrency, almost any locking strategy performs adequately. Under high contention on many cores, naive locking becomes a bottleneck, motivating finer-grained locks, atomics, or a redesign to reduce shared mutable state altogether.

### 26.9 Exercises

1. Using §26.2's diagram as a template, show how the same interleaving problem can occur with a "check if exists, then insert" sequence on a thread-safe hash map, even though each individual operation is safe.
2. Explain, using §26.5, why two threads that never touch the same variable can still slow each other down, and why no amount of code review focused on correctness would ever catch this.

### 26.10 Further Reading

- Maurice Herlihy & Nir Shavit, *The Art of Multiprocessor Programming* — the definitive text on lock-free and wait-free data structures underlying §26.4.
- Martin Thompson et al., the "Mechanical Sympathy" blog — a widely-read practitioner treatment of false sharing and cache-line effects (§26.5) on real-world performance.

---
