## §40. Redis in Practice: Data Structures, Locks, Pub/Sub

### 1. The Vocabulary

- **Redis** — an in-memory data store used as a cache, session store, rate limiter, and lightweight
  message bus, depending on which of its data structures you reach for.
- **Beyond plain key-value** — Redis also supports lists, sets, sorted sets (great for
  leaderboards/rankings), and hashes, each with their own atomic operations.
- **Distributed lock** — using Redis to coordinate "only one process should do this at a time"
  across multiple instances (commonly via `SETNX`/`SET ... NX` with an expiry).
- **Pub/Sub** — publishers send messages to a channel; subscribers listening on that channel
  receive them in real time, with no persistence — a message sent while nobody's subscribed is
  simply lost.

### 2. Where It Sits, and Why Teams Use It

Redis shows up far beyond "just a cache" in most real systems — it's often the simplest available
tool for session storage, rate limiting counters, and lightweight coordination between multiple
service instances, precisely because it's fast and already part of the stack.

### 3. What Actually Breaks

- **Treating Redis Pub/Sub as a reliable queue** — it has no persistence or delivery guarantee; a
  subscriber that's briefly disconnected simply misses whatever was published during that gap,
  with no way to catch up. A real queue (SQS, RabbitMQ, or Redis Streams specifically) is needed
  wherever delivery has to be guaranteed.
- **A distributed lock without an expiry** — if the process holding the lock crashes before
  releasing it, the lock is held forever and nothing else can ever acquire it; every distributed
  lock needs a TTL as a safety net.
- **A hot key** — one extremely popular key (a viral post's like-count, a trending item)
  receiving a disproportionate share of traffic can bottleneck a single Redis node even though the
  cluster overall has plenty of headroom.
- **Using Redis as a primary data store without understanding its persistence tradeoffs** — Redis
  can persist to disk, but its durability guarantees are weaker than a real database's by design;
  treating it as the only copy of important data is a real data-loss risk.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Redis is more than a cache — I'd reach for it for rate limiting, session storage, and
  leaderboards too, using its sorted-set and atomic-increment operations."
- "Redis Pub/Sub has no persistence — I use it only when losing a message during a brief
  disconnect is acceptable, and reach for a real queue otherwise."
- "Any distributed lock I build on Redis gets an expiry, so a crashed lock-holder can't hold it
  forever."

### 5. Interview-Ready Answer

> "I think of Redis as a toolbox beyond plain caching — sorted sets for leaderboards, atomic
> increments for rate limiting and counters, and short-TTL keys for distributed locks. The
> caveat I'm careful about is Pub/Sub specifically: it has no persistence, so it's fine for
> best-effort real-time notifications but not a substitute for a real queue where delivery has to
> be guaranteed."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §35 (Redis for Backend Engineers) chapter (in
full depth); companion DSA Engineering Handbook's §21 (Skip Lists) chapter (the structure behind
Redis Sorted Sets) and companion DSA Engineering Handbook's §23 (LRU Cache) chapter.

---
