## 35. Redis for Backend Engineers

### 35.1 The Problem: Some Data Needs to Be Fast and Shared, But Doesn't Need PostgreSQL's Full Guarantees

§24-31 established PostgreSQL as the backend's durable, relational source of truth. Not every piece of data a backend needs fits that mold — a rate limiter's per-user request count (companion §61), a cached, expensive-to-recompute dashboard summary, a pub/sub channel for cross-process messaging (§33.3) — all need to be fast, shared across every process/worker, and often explicitly temporary, exactly the gap Redis exists to fill, distinct from and complementary to the primary database.

### 35.2 Engineering Constraint: Redis Is an In-Memory Data Structure Server, Not a Relational Database

Redis stores data primarily in memory (with optional, weaker durability guarantees than PostgreSQL's transactional guarantees, §27) and exposes a small set of specific, purpose-built data structures — strings, hashes, lists, sets, sorted sets — each with operations tailored to a specific access pattern, rather than a general-purpose relational query language. This makes Redis dramatically faster for the specific patterns its data structures are built for, at the direct cost of *not* being the right place to store data requiring PostgreSQL's relational integrity, complex querying, or strong durability guarantees.

### 35.3 Python Mechanism: Redis as a Cache — the Most Common Use Case

The most common Redis use case is caching: storing the result of an expensive computation or query (a dashboard summary, companion §30's optimization target for the underlying query, applied here as a complementary rather than alternative fix) under a key, with an explicit **TTL (time-to-live)** after which Redis automatically expires and removes it. This directly implements the caching architecture companion §47 develops at the design level — Redis is the specific, standard mechanism most Python backends actually use to realize that architecture.

### 35.4 Decision Framework: Cache Invalidation Strategy Must Be Chosen Deliberately, Not Left Implicit

A pure TTL-based cache (data simply expires after N seconds, with no explicit invalidation) is simple but means stale data can be served for up to the full TTL duration after the underlying data changes — acceptable for data where brief staleness is a non-issue (an occupancy summary that's a few seconds old), unacceptable for data where correctness after a specific write matters immediately (a booking's current status right after cancellation). **Explicit invalidation** (deleting or updating the specific cache key the moment the underlying data changes) closes this gap but adds real code coupling — every write path touching cached data must also remember to invalidate the corresponding cache entry, precisely the discipline gap the companion Software Systems Handbook's §113.4 case study identified as a real, recurring production risk when omitted.

### 35.5 Python Mechanism: Redis as a Distributed Lock — Extending §14's Single-Process Locking Across Processes

§14.3's `threading.Lock`/`asyncio.Lock` only coordinate threads/coroutines *within one process*. When multiple separate processes (or separate server instances, §16.8) need to coordinate exclusive access to something (only one worker should run a specific scheduled job at a time), an in-process lock provides no protection at all — Redis's `SET key value NX EX ttl` (set only if the key doesn't already exist, with an expiry) provides a simple, widely-used **distributed lock** primitive: whichever process successfully sets the key first holds the lock; others attempting the same `SET ... NX` fail and know someone else already holds it, with the `EX ttl` ensuring the lock is automatically released even if the holding process crashes without explicitly releasing it.

### 35.6 Python Mechanism: Redis Pub/Sub — Already Introduced in §33.3, Now Given Its Full Mechanism

§33.3 used Redis pub/sub as a WebSocket-scaling backplane without fully detailing the mechanism: `PUBLISH channel message` sends a message to every currently-subscribed client of that channel simultaneously, and `SUBSCRIBE channel` registers a client to receive future messages on it — critically, pub/sub messages are **not durable**: a subscriber that wasn't actively listening when a message was published simply never receives it, with no replay or persistence, a meaningful distinction from a genuine message queue (companion §36), which does persist messages for consumers that aren't currently connected.

### 35.7 Implementation

```python
import redis.asyncio as redis
import json

redis_client = redis.Redis(host="localhost", decode_responses=True)

async def get_dashboard_summary_cached(tenant_id: str, compute_fn) -> dict:
    cache_key = f"dashboard_summary:{tenant_id}"
    cached = await redis_client.get(cache_key)
    if cached is not None:
        return json.loads(cached)                    # cache hit -- no
                                                        # expensive computation

    result = await compute_fn(tenant_id)                # cache miss -- do
                                                          # the real, expensive
                                                          # work (companion §30)
    await redis_client.set(cache_key, json.dumps(result), ex=60)  # cache for
    return result                                                   # 60s (§35.3)


async def invalidate_dashboard_cache(tenant_id: str) -> None:
    await redis_client.delete(f"dashboard_summary:{tenant_id}")   # explicit
                                                                     # invalidation
                                                                     # (§35.4),
                                                                     # called from
                                                                     # any write
                                                                     # path that
                                                                     # changes the
                                                                     # underlying data


async def run_scheduled_job_with_distributed_lock(job_name: str) -> bool:
    lock_key = f"job_lock:{job_name}"
    acquired = await redis_client.set(lock_key, "1", nx=True, ex=300)  # §35.5:
    if not acquired:                                                    # only ONE
        return False                                                     # process
                                                                           # gets True
    try:
        await do_the_actual_job(job_name)
        return True
    finally:
        await redis_client.delete(lock_key)   # explicit release once done

async def do_the_actual_job(job_name): ...
```

`get_dashboard_summary_cached` checks Redis first, only calling the expensive `compute_fn` on a genuine cache miss — `ex=60` gives this a simple TTL-based expiration (§35.4's simpler option). `invalidate_dashboard_cache` demonstrates the explicit-invalidation half of §35.4's tradeoff, meant to be called from whatever write path actually changes the underlying dashboard data. `run_scheduled_job_with_distributed_lock`'s `nx=True` ensures only the first process to call `.set(...)` for a given `job_name` gets `acquired=True`; every other concurrently-running instance attempting the same job gets `False` and skips it, with `ex=300` ensuring the lock self-releases even if the holding process crashes before reaching the `finally` block.

### 35.8 Production Considerations

A cache that's unavailable (Redis down, or a network partition to it) should degrade gracefully, not take the entire application down with it — a well-designed cache-read path catches a Redis connection error and falls back to computing the result directly (paying the cost §35.3 was meant to avoid, but remaining functional) rather than propagating the cache failure as a hard application error, treating Redis as a genuine performance optimization rather than a hard dependency for data the primary database can still serve directly if needed. Distributed locks (§35.5) using a simple `SET NX EX` are subject to a genuine edge case at true production scale (a process holding the lock pausing for longer than the TTL, due to a GC pause or scheduling delay, then resuming believing it still holds a lock that's actually already expired and been acquired by someone else) — directly the same fencing concern the companion AI Systems Handbook's §121.3 lab and Software Systems Handbook's §111.4 case study both raise for distributed coordination generally; a genuinely high-stakes distributed lock may need a more robust algorithm (Redlock, or an external coordination service) rather than this simple pattern.

### 35.9 Debugging

**Symptoms:** A cached value continues to reflect stale data noticeably longer than its configured TTL would suggest is possible; a scheduled job that should run exactly once across a fleet of workers occasionally runs twice, or never at all. **Investigation:** For stale-beyond-TTL data, check whether the same cache key is being written by multiple different code paths with different TTLs, or whether a bug is re-setting the same key with a fresh TTL unintentionally on every read (a common mistake: writing to cache during what should be a pure read path). For the scheduled-job case, check whether every worker actually attempts the same, identical lock key, and whether the lock's TTL is long enough to cover the job's real, worst-case execution time. **Root cause:** An unintended cache-refresh side effect on read; a lock TTL too short for the actual job duration, causing the lock to expire and be re-acquired by a second worker while the first is still legitimately running. **Fix:** Audit cache-write call sites to ensure only intended paths (writes to the underlying data, or genuine cache-miss computation) ever set the cache key; size the distributed lock's TTL generously against the job's actual worst-case runtime, or use a lock-renewal mechanism for long-running jobs.

### 35.10 Interview Thinking

"How would you ensure only one instance of a scheduled job runs across multiple server replicas?" is testing whether Redis-based distributed locking (§35.5) is your default mechanism, with an explicit understanding of *why* an in-process lock (companion §14.3) cannot solve this cross-process problem at all — a strong answer also raises the TTL-versus-job-duration sizing consideration (§35.9) as a specific, non-obvious pitfall of this exact pattern.

### 35.11 Mini Lab

Implement `get_dashboard_summary_cached` and `invalidate_dashboard_cache` against a local Redis instance, using a `compute_fn` that sleeps briefly (simulating expensive work) and prints when it actually runs. Call the cached function twice in a row and confirm the expensive computation only runs once (the second call is a cache hit). Then call `invalidate_dashboard_cache` and call the cached function again, confirming the computation re-runs. Separately, implement `run_scheduled_job_with_distributed_lock` and call it concurrently from two simulated "workers" (two async tasks), confirming only one of them actually executes `do_the_actual_job`.

---
