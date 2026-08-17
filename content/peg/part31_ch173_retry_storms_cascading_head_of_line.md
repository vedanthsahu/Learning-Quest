## §173. Retry Storms, Cascading Failures, and Head-of-Line Blocking

### 1. The Vocabulary

- **Retry storm** — when a dependency starts failing or slowing down, clients retry aggressively,
  and the extra retry traffic itself makes the dependency's problem worse — a self-reinforcing
  failure loop, not just an inconvenience.
- **Cascading failure** — one service's failure or slowness consumes a shared resource (connection
  pool, thread pool, downstream capacity) needed by other, otherwise-healthy services, spreading
  the failure beyond its original boundary.
- **Head-of-line blocking** — one slow item at the front of a queue or a single-threaded processing
  path blocks everything queued behind it, even though the items behind it might be individually
  fast.
- **Backoff and jitter (the fix for retry storms)** — recapped from §54: retries should wait
  progressively longer between attempts (backoff), with randomization (jitter) so many clients
  don't retry in synchronized waves.

### 2. Where It Sits, and Why Teams Use It

These three describe how a small, localized problem turns into a large, systemic outage — the
actual mechanism behind many real "why did the whole platform go down over one service's blip"
incidents. A retry storm is specifically self-inflicted damage: the retries themselves, done
without backoff, are what convert a brief blip into a sustained outage. Cascading failure describes
how that damage spreads across service boundaries via shared resources (§55's bulkhead pattern is
the direct architectural defense). Head-of-line blocking is a narrower, specific mechanism where
strict ordering (a single queue, a single connection) turns one slow item into a delay for
everything behind it.

### 3. What Actually Breaks

- **Retries with no backoff or jitter** — every client retrying immediately, and all retrying again
  at the same fixed interval, synchronizes into repeated traffic waves that can keep a recovering
  dependency from ever actually recovering.
- **No circuit breaker in front of a failing dependency** — without one (§55), every request keeps
  trying the failing dependency at full rate, wasting resources on calls very likely to fail anyway
  instead of failing fast and preserving capacity.
- **Shared thread or connection pools with no isolation (no bulkheads)** — one slow downstream
  dependency can occupy every available thread/connection waiting on it, starving unrelated
  requests that don't even depend on that slow dependency.
- **Single-threaded or strictly-ordered processing where one slow item blocks unrelated fast
  items** — a single Kafka partition, a single database connection processing sequentially, or a
  single-threaded event loop blocked by one slow synchronous call (§123) can each produce
  head-of-line blocking in their own specific context.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I make sure retries always use backoff and jitter, since naive immediate retries are what turn
  a brief dependency blip into a sustained retry storm."
- "I use circuit breakers and bulkheads together — fail fast on a known-bad dependency, and
  isolate its resource usage so it can't starve unrelated requests."
- "I check for head-of-line blocking specifically anywhere strict ordering exists — a single
  partition, a single connection, a single-threaded path — since one slow item there delays
  everything behind it."

### 5. Interview-Ready Answer

> "A retry storm is what happens when clients retry a failing dependency aggressively and without
> backoff, and the retry traffic itself prevents the dependency from recovering — I prevent that
> with backoff and jitter, plus a circuit breaker so requests fail fast instead of hammering a
> known-bad dependency. Cascading failure is the broader pattern where one dependency's problem
> consumes a shared resource other, unrelated requests also need — bulkheads are the fix, isolating
> resource pools so one slow dependency can't starve everything else. And I specifically check for
> head-of-line blocking anywhere strict ordering exists, since one slow item there can delay every
> fast item queued behind it."

### 6. Go Deeper

companion Software Systems Handbook's §52 (Reliability Engineering Deep Dive) chapter for full
circuit-breaker and bulkhead implementation; this book's §54-55 (timeouts/retries/backoff/jitter,
circuit breakers/bulkheads) for the foundational resilience patterns this chapter's failure modes
motivate.

---
