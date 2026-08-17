## 14. Synchronization: Locks, Semaphores & Queues

### 14.1 The Problem: Shared, Mutable State Accessed by Concurrent Code Corrupts Silently

§9.2 established that threads share their process's memory — any two threads can read and write the same object. When two threads read a value, both compute an update based on what they read, and both write back, one update can silently overwrite the other, producing a result that's simply wrong, with no exception raised and no obvious symptom beyond a number that doesn't match what should have happened. Async code sharing state across coroutines can hit a related, if narrower, version of this problem across `await` points, where another coroutine gets a chance to run and mutate shared state in between.

### 14.2 Engineering Constraint: A Race Condition Is a Timing-Dependent Bug, Which Makes It Uniquely Hard to Catch

A **race condition** — the outcome depending on the precise, unpredictable interleaving of two or more concurrent operations — is directly hard to catch in testing because it may not manifest at all under low load or in a single-threaded test, and may manifest only rarely under real concurrent production traffic, exactly the kind of bug that passes code review and CI and surfaces as an intermittent, hard-to-reproduce production incident weeks after deployment.

### 14.3 Python Mechanism: A Lock Grants Exclusive Access to a Critical Section

A **Lock** (`threading.Lock` for threads, `asyncio.Lock` for coroutines) ensures that only one thread/coroutine at a time can be inside the code region it guards (the **critical section**) — any other thread/coroutine attempting to acquire the same lock waits until the current holder releases it. This directly solves §14.1's read-modify-write race: wrapping the read, the computation, and the write inside one lock-protected section guarantees no other thread/coroutine can interleave its own read-modify-write in the middle.

### 14.4 Decision Framework: Lock Everything That's Shared and Mutated, Nothing That Isn't

The discipline is precise, not approximate: any state that is (a) shared across threads/coroutines and (b) mutated by more than one of them needs a lock around every access that reads-then-writes it, including reads that inform a subsequent decision. State that's read-only after initial setup, or state that's genuinely private to one thread/coroutine, needs no locking at all — adding locks defensively everywhere has a real performance cost (every lock acquisition serializes access, directly reducing the concurrency the whole exercise was meant to provide) without any corresponding safety benefit for state that was never actually at risk.

### 14.5 Python Mechanism: A Semaphore Generalizes a Lock to N Concurrent Holders

A **Semaphore** initialized with a count N allows up to N threads/coroutines to hold it simultaneously (a Lock is exactly a Semaphore with N=1) — the direct backend use case is bounding concurrency against a resource with a known capacity limit: at most N simultaneous connections to a downstream API, at most N concurrent file-processing operations, preventing an unbounded burst of concurrent work from overwhelming a resource that can only handle a fixed amount at once (directly connecting to §15's backpressure discussion).

### 14.6 Python Mechanism: A Queue Coordinates Producers and Consumers Safely

A **Queue** (`queue.Queue` for threads, `asyncio.Queue` for coroutines) is a thread/coroutine-safe FIFO structure specifically designed for the producer-consumer pattern: one or more producers put items in, one or more consumers take items out, with all the necessary locking handled internally by the Queue itself — the correct default mechanism for passing work between concurrent producers and consumers, rather than manually coordinating a shared list with your own locks (which is both more error-prone and rarely necessary once a Queue's built-in semantics already fit the need).

### 14.7 Implementation

```python
import asyncio

class BookingCounter:
    def __init__(self):
        self._count = 0
        self._lock = asyncio.Lock()          # protects _count (§14.3)

    async def increment(self):
        async with self._lock:                # critical section: read,
            current = self._count              # modify, write, all atomic
            await asyncio.sleep(0)             # simulates a yield point where
                                                 # a race WOULD occur unlocked
            self._count = current + 1

async def race_demo():
    counter = BookingCounter()
    await asyncio.gather(*[counter.increment() for _ in range(100)])
    print(counter._count)                      # reliably 100, BECAUSE of the
                                                 # lock -- remove it and, due
                                                 # to the yield point above,
                                                 # this becomes unreliable

# A semaphore bounding concurrent calls to a rate-limited downstream API:
api_semaphore = asyncio.Semaphore(5)            # at most 5 concurrent calls

async def call_downstream_api(item_id: str):
    async with api_semaphore:                    # blocks here if 5 are
        await asyncio.sleep(0.1)                   # already in flight (§14.5)
        return f"result-{item_id}"

asyncio.run(race_demo())
```

`asyncio.Lock` protects `BookingCounter`'s read-modify-write sequence exactly as §14.3 describes — the deliberate `await asyncio.sleep(0)` inside the critical section simulates a real yield point (a genuine I/O wait would create the same opportunity), demonstrating that without the lock, another coroutine could interleave its own read of the stale `current` value during that yield, producing a final count less than 100. `api_semaphore = asyncio.Semaphore(5)` ensures no more than five `call_downstream_api` calls are ever in flight simultaneously, regardless of how many are requested at once — directly protecting a downstream dependency from an unbounded concurrent burst.

### 14.8 Production Considerations

A lock held across a slow operation (a network call inside a critical section, rather than just the in-memory computation) serializes everything waiting on that lock for the *entire* duration of the slow operation, often turning what should be a fast, contention-free critical section into a severe throughput bottleneck — critical sections should be kept as short as possible, holding the lock only around the genuinely shared-state mutation, not around unrelated slow work that merely happens to be nearby in the code. A related, more severe risk: acquiring two locks in inconsistent order across different code paths can produce a **deadlock** (each thread/coroutine holding one lock while waiting for the other) — a strict, codebase-wide convention of always acquiring multiple locks in the same, fixed order eliminates this risk structurally rather than relying on careful case-by-case reasoning every time.

### 14.9 Debugging

**Symptoms:** A shared counter, cache, or aggregate value occasionally produces a slightly wrong result under real concurrent load, despite looking correct in every sequential test; an application occasionally hangs completely, with no CPU activity, no error, and no progress. **Investigation:** For the wrong-result case, identify the shared, mutated state and check whether every read-modify-write sequence touching it is actually wrapped in a lock — a single unlocked access path is enough to reintroduce the race even if every other access is correctly locked. For the hang, check for multiple locks acquired in different orders across different code paths — the classic deadlock signature. **Root cause:** A race condition from missing or incomplete locking (§14.1-14.3), or a deadlock from inconsistent lock-acquisition order (§14.8). **Fix:** Add the missing lock around every access path to the shared state, not just the most obvious one; for deadlocks, enforce a single, consistent global ordering for acquiring multiple locks anywhere in the codebase.

### 14.10 Interview Thinking

"How would you safely increment a shared counter across many concurrent requests?" is a direct test of §14.3-14.4's discipline — a strong answer identifies the read-modify-write race specifically (not just "add a lock" as an unexplained incantation) and states precisely what the lock must wrap (the full read-modify-write sequence, not just the final write), since a lock around only the write still leaves the read racy.

### 14.11 Mini Lab

Reproduce §14.7's `BookingCounter` example, but first run it *without* the lock (replace `async with self._lock:` with nothing) and confirm the final count is unreliably below 100 across a few runs — directly observing the race condition yourself. Then restore the lock and confirm the count is reliably exactly 100 every time. Separately, implement a semaphore-bounded batch of 20 simulated API calls with a semaphore limit of 5, and add a print statement confirming no more than 5 are ever "in flight" (tracked via a simple shared counter) at once.

---
