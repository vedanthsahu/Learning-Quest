## §174. Deadlocks, Race Conditions, and Poison Messages

### 1. The Vocabulary

- **Deadlock** — two or more processes each hold a resource the other needs and each wait
  indefinitely for the other to release theirs — neither can proceed, and neither will, without
  outside intervention (a timeout or a database's own deadlock detector).
- **Race condition** — the correctness of the outcome depends on the unpredictable timing/ordering
  of concurrent operations — the bug may appear only occasionally, exactly when timing happens to
  align a certain way, making it notoriously hard to reproduce.
- **The core distinction** — a deadlock is a *hang*: things stop and wait forever. A race condition
  is a *wrong answer*: things complete, but the result depends on timing and is sometimes incorrect.
- **Poison message** — a queue message that fails processing every time it's attempted (a malformed
  payload, a permanently-failing side effect) and, without a dead-letter queue, gets redelivered
  and re-fails indefinitely, blocking the queue behind it.

### 2. Where It Sits, and Why Teams Use It

These three are grouped as a "if someone says this term, what do I say" lookup because they're
each a specific, nameable shape of concurrency/reliability bug, distinct from each other in ways
that matter for diagnosis: a deadlock presents as a hang (requests time out, nothing crashes, load
looks oddly low for the amount of waiting happening); a race condition presents as intermittent,
hard-to-reproduce wrong answers; a poison message presents as a queue that never drains, with the
same message ID showing up in redelivery logs repeatedly.

### 3. What Actually Breaks

- **Deadlock from inconsistent lock ordering** — two transactions acquiring the same two locks in
  opposite order is the textbook cause; the fix is establishing and enforcing one consistent lock
  acquisition order everywhere, or relying on the database's deadlock detector to abort one
  transaction and retry it.
- **A race condition assumed to be "rare enough to ignore"** — an intermittent bug that only
  reproduces under specific timing is tempting to deprioritize, but it will eventually happen in
  production at real concurrency levels, usually at the worst possible moment (a payment or
  inventory double-processing bug is a very common real-world race condition).
- **No dead-letter queue for a message that can permanently fail** — a malformed or permanently-
  failing message retried indefinitely doesn't just fail itself — depending on the queue's ordering
  guarantees, it can block every message queued behind it (a specific manifestation of §173's
  head-of-line blocking).
- **Confusing a deadlock with a slow query** — both look like "the request is hanging," but the fix
  is completely different (breaking a lock cycle versus optimizing a query), so correct diagnosis
  matters before attempting a fix.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I distinguish a deadlock (a hang, from circular resource waiting) from a race condition (a
  wrong answer, from timing-dependent outcomes) — they need completely different diagnosis and
  fixes."
- "For race conditions, I don't dismiss an intermittent bug as too rare to matter — at real
  production concurrency, it will eventually happen."
- "I always configure a dead-letter queue for anything that could permanently fail, so one poison
  message can't block everything behind it indefinitely."

### 5. Interview-Ready Answer

> "I keep these distinct: a deadlock is a hang, from two things each waiting on a resource the
> other holds, usually fixed by consistent lock ordering or relying on the database's own deadlock
> detection and retry. A race condition is a wrong answer, from an outcome that depends on
> unpredictable timing between concurrent operations — I don't treat an intermittent, hard-to-
> reproduce bug as low priority just because it's rare, since it will eventually surface at real
> production concurrency. And for queues, I always configure a dead-letter queue, since a message
> that can permanently fail will otherwise be redelivered indefinitely and can block everything
> queued behind it."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §14 (Synchronization: Locks, Semaphores & Queues)
chapter and companion Python Backend Engineering Handbook's §15 (Cancellation, Timeouts, Race
Conditions, Backpressure) chapter for full deadlock-detection and race-condition-prevention
techniques; this book's §43 (retries/DLQs/poison messages) and §33 (isolation levels/deadlocks/
optimistic locking) for the database-transaction and queueing versions of these exact failure
modes.

---
