## Project 11: Distributed Lock Service

### Problem Statement

Several independent server instances occasionally need to perform an operation that must only happen once at a time across the *entire* fleet — not once per instance, but once, period (e.g., only one instance should run a particular scheduled cleanup job at any given moment, even though all instances are capable of running it). The business wants a mechanism that lets any instance safely claim exclusive rights to such an operation, with other instances correctly waiting or backing off.

### Functional Requirements

- Allow any one of several independent processes to acquire an exclusive lock identified by a name.
- Ensure no two processes can hold the same named lock at the same time.
- Automatically release a lock if the process holding it crashes or becomes unresponsive, without requiring manual intervention.
- Allow a process to explicitly release a lock it holds when it's done.

### Non-Functional Requirements

- **Correctness above all else**: a bug allowing two processes to simultaneously believe they hold the same lock defeats the entire purpose and could cause real damage (e.g., the same cleanup job running twice concurrently, corrupting data).
- **No permanent deadlock**: a crashed lock-holder must not permanently block the lock from ever being acquired again.
- **Reasonable latency**: acquiring and releasing a lock should be fast relative to the operations it protects.
- **Fairness is not required**: it's acceptable if lock acquisition isn't strictly first-come-first-served, as long as correctness holds.

### Project Scope

**In scope**: exclusive lock acquisition and release across multiple processes, automatic release on holder failure. **Out of scope**: reader-writer locks (multiple simultaneous readers, one exclusive writer), distributed consensus algorithms built from scratch (use an existing coordination primitive rather than implementing Paxos/Raft yourself), lock queuing/fairness guarantees.

### Engineering Questions (Answer Them Yourself First)

- If a process acquires a lock and then crashes before releasing it, what mechanism ensures the lock doesn't stay held forever?
- What's the actual risk if a process holds a lock, believes it still holds it, but the lock coordination system has already considered it expired and given it to someone else?
- Why is "check if the lock is free, then set it" as two separate steps dangerous here, in the exact same way it was dangerous in an earlier project in this series?
- If the lock coordination system itself is a single instance, what have you actually built?

### Architecture Thinking

Sketch what has to happen, in order, for a process to safely acquire a lock: what single operation needs to be atomic for this to be correct under concurrent attempts? Consider what "automatic release on crash" implies about how a lock's lifetime should be bounded — does a lock need an expiration, and if so, what happens if the legitimate holder is still working when that expiration arrives? Estimate the actual risk window: if a lock has a 30-second expiration and the operation it protects sometimes takes 35 seconds, what could go wrong?

### Progressive Hint System

**Level 1**: Recall the atomic check-and-set problem from earlier in this series (rate limiting) — what similar atomic primitive would let you "acquire the lock" as a single, indivisible operation? **Level 2**: Consider giving every lock an expiration (a TTL) so a crashed holder's lock eventually frees itself automatically — but think about what happens if the real operation takes longer than that TTL. **Level 3**: Research "lock extension" or "heartbeat" patterns, where a legitimate holder periodically renews its lock's expiration while still working, and research using a unique token per acquisition so a process can only release (or extend) a lock it actually still holds. **Level 4**: A standard design uses an atomic "set if not exists, with expiration" operation (like Redis's `SET key value NX EX seconds`) to acquire a lock, storing a unique random token as the value; the holder periodically extends the TTL while still working (a heartbeat); releasing the lock requires checking that the stored token still matches the holder's own token before deleting it (an atomic compare-and-delete), preventing a process from accidentally releasing a lock that expired and was already reacquired by someone else.

### Common Engineering Traps

- **Checking whether a lock is held, then separately setting it as two distinct operations** — under what specific interleaving of two processes does this let both believe they hold the lock?
- **A lock with no expiration at all, relying entirely on the holder to release it** — what happens the moment a holder crashes without releasing?
- **A lock with an expiration, but no heartbeat/extension mechanism, sized so tightly that legitimate work sometimes exceeds it** — what happens when a legitimate holder is still working after its lock has already expired and been given to someone else?
- **Releasing a lock by simply deleting it, without first checking that you're still the legitimate holder** — construct a specific sequence of events where this causes a process to release a lock it no longer actually owns.

### Reflection Questions

- How would you test that your lock genuinely prevents two processes from both believing they hold it, under real concurrent load, not just sequential test calls?
- If your lock coordination system (wherever the lock state actually lives) becomes unavailable, what happens to every process trying to acquire or release locks?
- Is there a version of this problem where you'd need more than one process to hold overlapping access simultaneously (a reader-writer lock)? Why is that a genuinely different, harder problem than what this project asks for?

### Completion Checklist

- [ ] I have an atomic acquire mechanism, not a check-then-set pair.
- [ ] I have a TTL-plus-heartbeat mechanism handling both crash recovery and long-running legitimate work.
- [ ] I have a token-based release mechanism preventing a process from releasing a lock it no longer owns.
- [ ] I have considered what happens if the lock coordination system itself is a single point of failure.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
