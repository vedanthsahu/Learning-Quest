# PART II — PASS 2: ENGINEERING DEPTH

## 25. OS Internals: Scheduling, Memory Management, Virtual Memory, Syscalls, I/O Models

### 25.1 What This Chapter Adds to §2

§2 gave you the mental model: the OS gives every process the illusion of owning the CPU and all of memory, and I/O is fundamentally a "waiting" cost. This chapter opens up each of those illusions and shows the actual mechanism underneath, because debugging a real production performance problem eventually requires knowing what's really happening below the abstraction.

### 25.2 Scheduling: How the OS Actually Decides Whose Turn It Is

A CPU scheduler's job is to pick, from all the runnable threads, which one runs next and for how long. Three families of scheduling policy matter conceptually:

- **Round-robin / time-slicing**: every runnable thread gets a fixed time slice (a **quantum**) in turn. Simple and fair, but ignores priority or urgency.
- **Priority-based scheduling**: higher-priority threads preempt lower-priority ones. This introduces **priority inversion** (Part V §91.B): a low-priority thread holding a lock that a high-priority thread needs can block the high-priority thread indefinitely if a medium-priority thread is meanwhile monopolizing the CPU — the classic fix is **priority inheritance**, temporarily boosting the lock-holder's priority.
- **Completely Fair Scheduler (CFS)**-style algorithms (used by Linux): rather than fixed time slices, track each thread's accumulated "virtual runtime" and always run whichever runnable thread has received the least CPU time so far, weighted by its priority (**nice value**). This approximates ideal fair-sharing without the fixed-quantum tradeoffs of pure round-robin.

```
CFS core loop (conceptual):
    runnable_threads: a red-black tree keyed by vruntime (virtual runtime)
    loop:
        pick the thread with the SMALLEST vruntime  (leftmost node)
        run it for a calculated slice
        vruntime += (time_run / priority_weight)
        reinsert into the tree at its new vruntime
```

The engineering-relevant consequence: a thread that sleeps frequently (waiting on I/O) accumulates vruntime slowly, so schedulers naturally favor waking it promptly when it becomes runnable again — which is why I/O-bound threads tend to feel "responsive" even under CPU pressure from other threads, without any special-casing.

### 25.3 Virtual Memory: How the "Every Process Owns All of Memory" Illusion Is Built

§2.5 asserted this illusion exists; here is the mechanism. Every memory address a program uses is a **virtual address**, translated by hardware (with OS-maintained tables) into a **physical address** before it actually touches RAM. The translation structure is a **page table**: memory is divided into fixed-size chunks (**pages**, commonly 4KB), and the page table maps each virtual page to a physical page frame — or marks it as not currently resident in RAM at all.

```
Virtual address:  [ page number | offset within page ]
                          |
                          v
                  Page table lookup
                          |
            +-------------+-------------+
            |                           |
     page is resident            page is NOT resident
     -> physical frame #          -> PAGE FAULT
     -> access proceeds           -> OS loads page from disk (swap),
                                     updates page table, retries access
```

Because a full page-table walk on every memory access would be prohibitively slow, the CPU caches recent translations in a **Translation Lookaside Buffer (TLB)** — a small, extremely fast cache of virtual-to-physical mappings. A **TLB miss** forces a full page-table walk; a workload that jumps around a very large address space unpredictably (poor locality) suffers more TLB misses and is measurably slower for reasons invisible at the application code level. This is also the mechanism behind **huge pages** (§58): using larger page sizes reduces the number of translations needed to cover the same memory, reducing TLB pressure for memory-intensive workloads.

**Thrashing** — introduced conceptually in §2.5 — is now precisely explainable: when the working set of actively-touched pages exceeds physical RAM, the OS must continuously evict resident pages to disk to make room for others, and if those evicted pages are needed again almost immediately, the system spends most of its time servicing page faults rather than running actual instructions. The fix is either reducing the working set (better algorithms, more locality) or adding physical memory — no scheduling change can fix this, because the bottleneck is memory capacity itself.

### 25.4 System Calls: The Only Door Between User Code and the Kernel

Ordinary application code runs in **user mode**, a restricted CPU mode that cannot directly touch hardware or other processes' memory. Anything that requires privileged access — reading a file, sending network data, creating a thread — must cross into **kernel mode** via a **system call (syscall)**: a controlled, well-defined entry point where the CPU switches privilege levels, the kernel performs the requested privileged operation on the process's behalf, and control returns to user mode. This transition has real, measurable cost (a **context switch**-like overhead, though not a full context switch to another process) — which is precisely why performance-sensitive code tries to minimize the *number* of syscalls made (batching reads/writes, using larger buffers) rather than making one syscall per small unit of work.

### 25.5 I/O Models: Making §2.6's Two Strategies Concrete

§2.6 described two conceptual strategies for handling slow I/O: dedicate a thread to wait, or ask to be notified. Here are their real implementations:

- **Blocking I/O**: a thread calls `read()`, and the OS suspends that thread until data is ready. Simple to program; one OS thread is consumed per concurrent in-flight operation.
- **Non-blocking I/O with readiness notification** (`select`/`poll`/`epoll` on Linux): a single thread registers interest in many file descriptors at once and asks the OS, "tell me which of these are ready," then services only the ready ones — one thread can service thousands of concurrent connections, at the cost of restructuring code around an event loop rather than straight-line logic. `epoll` scales far better than the older `select`/`poll` because it avoids re-scanning the entire set of watched descriptors on every call — the OS maintains the interest list internally and only returns what's changed.
- **Asynchronous I/O** (`io_uring` on modern Linux): rather than asking "what's ready" and then issuing the actual read/write yourself, you submit the operation itself (read this much, into this buffer) to the kernel up front, and are notified when it's *complete*, not merely ready — reducing the number of syscalls further and enabling very high-throughput I/O with minimal per-operation overhead.

This progression — one thread per operation, one thread for many operations via readiness notification, then fully asynchronous completion-based I/O — is the exact mechanism behind the historical progression of server concurrency models (thread-per-connection web servers → event-loop-based servers → the highest-throughput async runtimes), and it is why "which I/O model does this framework use" is a legitimate, consequential engineering question rather than an implementation detail.

### 25.6 Common Mistakes and Production Debugging Signals

- Sizing a thread pool without considering that thread-per-blocking-operation models consume one OS thread per in-flight I/O operation — under sufficient concurrent load, this exhausts OS thread limits before any CPU limit is reached.
- Diagnosing "high CPU" without distinguishing time spent in genuine computation from time spent servicing page faults or excessive syscalls — the same "100% CPU" symptom has very different fixes depending on which it is (`vmstat`/`perf` can distinguish these).
- Assuming a slow request is "the network" or "the database" without checking whether the host itself is swapping (§25.3) or scheduling-starved (§25.2) — the fix is entirely different (add memory / reduce working set vs. optimize a query).

### 25.7 Engineering Intuition

> **How do I know I need OS-level knowledge for a given problem?** When application-level metrics (request latency, error rate) look fine in isolation but degrade under concurrent load on the same host, or when `top`/`vmstat`-level signals (high swap, high context-switch rate, high syscall rate) correlate with the symptom.
>
> **What symptoms indicate a scheduling problem?** Latency spikes that correlate with the number of concurrently-runnable threads rather than actual request volume; a specific thread starved despite the system overall having spare CPU (classic priority inversion).
>
> **What metrics indicate it?** Run queue length, context switch rate, page fault rate (major faults specifically, which indicate disk I/O, not just minor faults which are cheap), TLB miss rate where available.
>
> **What breaks first if ignored?** Thread-per-connection architectures hit OS thread limits under concurrency long before CPU is saturated — this is the historic "C10K problem" and the direct motivation for the readiness/async models in §25.5.
>
> **When should you not need this depth?** For the overwhelming majority of application development — this level of detail is for capacity planning at scale, debugging genuinely OS-shaped production incidents, or building latency-critical infrastructure, not ordinary feature work.
>
> **What would a hyperscale company do?** Tune kernel scheduling parameters, use huge pages, and choose I/O models (often `io_uring`-based async runtimes) deliberately based on measured syscall overhead at their request volume (§58).
>
> **What would a two-person startup do?** Use whatever I/O model their language/framework defaults to (often an event-loop-based one already) and never tune kernel parameters directly.
>
> **What changes with scale?** At low concurrency, blocking I/O with one thread per connection is invisible overhead. Past thousands of concurrent connections on one host, the choice of I/O model (§25.5) becomes the dominant factor in how many connections a single machine can actually serve.

### 25.8 Exercises

1. A service's `top` output shows high CPU utilization, but `perf` shows most of that time is spent in the kernel's page-fault handler, not in application code. Using §25.3, explain what's likely happening and what class of fix (not a specific tool) would address it.
2. Explain, using §25.5, why moving from a thread-per-connection model to an `epoll`-based event loop lets one machine serve far more concurrent connections, and what the code-structure cost of that change is.

### 25.9 Further Reading

- Silberschatz, Galvin, Gagne, *Operating System Concepts* — full mechanism-level treatment of scheduling and virtual memory.
- Julia Evans, "Async IO on Linux: select, poll, epoll, io_uring" — a concise, practitioner-level bridge from §25.5's summary to the real syscalls involved.

---
