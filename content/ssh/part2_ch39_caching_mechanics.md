## 39. Caching Mechanics: Eviction Policies, Write Strategies, Invalidation, Stampede/Avalanche/Penetration

### 39.1 What This Chapter Adds to §10

§10 established why caches exist and that staleness is the fundamental risk. This chapter covers the concrete eviction algorithms, the named write strategies, and the three specific, notorious failure modes that every cache deployed under real load eventually has to reckon with.

### 39.2 Eviction Policies: Deciding What to Discard When Full

A cache has finite capacity, so once full, adding a new entry requires evicting an existing one. **LRU (Least Recently Used)** evicts whichever entry hasn't been accessed for the longest time, on the assumption that recent access predicts near-future access — cheap to reason about and effective for many workloads, but vulnerable to a single large scan (reading through a huge amount of rarely-reused data) evicting an entire cache's worth of genuinely hot data. **LFU (Least Frequently Used)** evicts whichever entry has been accessed the fewest total times, better suited to workloads with a stable set of consistently popular items, but slower to adapt when popularity genuinely shifts (an item that was frequently accessed historically can resist eviction even after it stops being relevant). **TTL (Time-To-Live)-based expiration** discards entries after a fixed duration regardless of access pattern, directly bounding the worst-case staleness (§10.3) a cache can serve, at the cost of discarding entries that might still have been perfectly valid. Production caching systems frequently combine these — an LRU or LFU eviction policy for capacity management, layered with a TTL as a hard ceiling on staleness regardless of how "hot" an entry remains.

### 39.3 Write Strategies: Where Does a Write Actually Go?

- **Write-through**: every write goes to the cache and the underlying store synchronously, together, before being acknowledged. Keeps the cache always consistent with the store, at the cost of paying the store's write latency on every write, gaining nothing from the cache on the write path itself.
- **Write-back (write-behind)**: a write updates the cache immediately and is acknowledged right away, with the underlying store updated asynchronously afterward. Much faster writes, at the direct risk that a cache failure before the asynchronous write completes loses data that was already acknowledged as "written" — the same durability-versus-latency tradeoff as asynchronous replication (§34.3), now applied to cache-to-store propagation instead of leader-to-follower propagation.
- **Write-around**: writes go directly to the underlying store, bypassing the cache entirely; the cache is only populated on a subsequent read (a cache miss pulling the now-updated value in). Avoids polluting the cache with data that might not be read again soon, at the cost of the first read after a write always being a guaranteed cache miss.

Choosing among these is, again, the tradeoff shape from §1.7 — write-through favors consistency, write-back favors write latency at real durability risk, and write-around favors cache-space efficiency for write-heavy, read-rarely data.

### 39.4 Cache Invalidation: The Other Half of §10.3's Staleness Problem

Beyond TTL-based expiration, an application can proactively **invalidate** (remove or update) a cache entry the moment its underlying data changes, rather than waiting for a TTL to expire. This tightens the staleness window considerably but reintroduces a version of the exact coordination problem from §6.4: the write to the underlying store and the invalidation of the cache are now two separate operations that must both happen, and if one succeeds while the other fails (a crash between the two, or a network issue reaching the cache), the cache can end up serving stale data indefinitely, with nothing to naturally correct it until a TTL (if any) eventually expires — which is precisely why relying on invalidation alone, with no TTL as a backstop, is a common and risky simplification.

### 39.5 Cache Stampede: When Popularity Becomes the Attack

A **cache stampede** (also called a "dogpile") occurs when a single, very popular cache entry expires (or is invalidated), and a large number of concurrent requests for that same key all simultaneously experience a cache miss, all simultaneously fall through to the underlying store, and all simultaneously attempt to recompute and repopulate the same value — multiplying what should have been one expensive operation into potentially thousands happening at once, frequently overwhelming the underlying store at exactly the moment it was least prepared for the sudden, concentrated load.

```
Popular key "K" expires.

Without protection:
  1000 concurrent requests for K all miss the cache simultaneously
       |
       v
  1000 concurrent, redundant queries hit the database at once
       |
       v
  Database, sized for normal cached-read load, is overwhelmed.

With protection (e.g., a "singleflight" / request coalescing pattern):
  1000 concurrent requests for K all miss the cache
       |
       v
  Only the FIRST request actually queries the database;
  the other 999 wait for that one in-flight request's result
  and reuse it once it completes.
       |
       v
  Database sees ONE query, not 1000.
```

The standard mitigations: **request coalescing** (as diagrammed above, ensuring only one recomputation happens per key even under many concurrent misses), **early/probabilistic expiration** (refreshing a hot entry slightly before its actual expiration, spreading refreshes across a window rather than concentrating them at one instant), and **stale-while-revalidate** (continuing to serve the slightly-stale cached value while one request refreshes it in the background, rather than making every concurrent caller wait or miss simultaneously).

### 39.6 Cache Avalanche: When Many Keys Expire Together

A **cache avalanche** is the same fundamental problem as a stampede, but across many different keys simultaneously rather than one popular key — typically caused by a large batch of cache entries all being written with the same TTL at the same time (e.g., a bulk cache-warming job), so they all expire together later, producing a sudden, system-wide surge of cache misses across a huge number of keys at once, rather than the misses being naturally spread out over time. The standard mitigation is **TTL jitter**: adding a small amount of randomness to each entry's expiration time so that even entries written at the same moment expire at slightly different times, spreading the resulting cache-miss load instead of concentrating it into a single instant.

### 39.7 Cache Penetration: When the Cache Can't Help At All

**Cache penetration** occurs when requests target keys that don't exist in the underlying store at all — a cache can never have a hit for a key with no valid value, so every such request necessarily falls through to the underlying store on every single attempt, regardless of how well-tuned the cache otherwise is. This is especially dangerous when exploited deliberately (an attacker deliberately querying for a flood of non-existent IDs to bypass the cache and load the underlying store directly) but can also occur accidentally from legitimate traffic (broken links, stale client-side references to deleted records). The standard mitigation is caching the **negative result** itself — explicitly storing "this key does not exist" in the cache (typically with its own, often short, TTL) so that repeated lookups for the same non-existent key are still served from the cache rather than repeatedly falling through.

### 39.8 Common Mistakes and Production Debugging Signals

- Setting identical TTLs across a large batch of cache-warmed entries, producing a scheduled, self-inflicted cache avalanche (§39.6) at a predictable future time — visible in hindsight as periodic database load spikes at suspiciously regular intervals.
- Providing no request-coalescing protection for high-traffic cache keys, leaving the system vulnerable to a stampede (§39.5) the moment any single very popular entry expires under heavy concurrent load.
- Failing to cache negative lookups, leaving the system vulnerable to cache penetration (§39.7) from either legitimate broken-reference traffic or deliberate exploitation.

### 39.9 Engineering Intuition

> **How do I know which of these three failure modes I'm at risk of?** Stampede risk correlates with having a small number of extremely hot keys; avalanche risk correlates with batch-writing many cache entries with synchronized expiration; penetration risk correlates with any traffic pattern that legitimately or maliciously queries for keys unlikely to exist.
>
> **What symptoms indicate one of these is actively occurring?** A sudden, sharp spike in load on the underlying store that correlates precisely with a cache TTL boundary, rather than with any genuine change in overall traffic volume.
>
> **What metrics indicate it?** Cache hit rate dropping sharply and briefly at regular intervals (avalanche); underlying store query volume spiking disproportionately relative to cache miss count for a single key (stampede); a sustained, nonzero rate of underlying-store queries for keys that consistently return "not found" (penetration).
>
> **What breaks first if these aren't mitigated?** The underlying store, sized and tuned for the load a well-functioning cache is supposed to absorb, receives a sudden multiple of that load concentrated in a short window, and can itself fail or degrade — meaning a caching layer, meant to protect the store, becomes the trigger for an outage of that same store.
>
> **When can you skip these mitigations?** At low request volume, where even a full stampede or avalanche amounts to a handful of concurrent requests the underlying store can absorb without issue — these mitigations earn their complexity specifically under high concurrent load on hot keys or synchronized expirations.
>
> **What would a hyperscale company do?** Implement request coalescing, TTL jitter, and negative-result caching as standard, default behavior in their shared caching infrastructure, rather than leaving each team to rediscover and reimplement these mitigations independently (§65).
>
> **What would a two-person startup do?** Rely on their caching library or managed service's built-in protections (many popular caching clients include request coalescing by default) and add TTL jitter manually only if a specific avalanche incident actually occurs.
>
> **What changes with scale?** At low traffic, none of these three failure modes are likely to manifest in any noticeable way. At high traffic concentrated on a comparatively small number of hot keys or synchronized cache-warming events, all three become realistic, recurring operational risks requiring the explicit mitigations in this chapter.

### 39.10 Exercises

1. A bulk job warms 10,000 cache entries at 2 AM with an identical 6-hour TTL, and the database experiences a severe, unexplained load spike at 8 AM every day. Using §39.6, explain the mechanism and propose a specific fix.
2. Explain, using §39.5's diagram, why request coalescing reduces database load from 1,000 concurrent queries to one, and what happens to the 999 requests that don't get to query the database directly.

### 39.11 Further Reading

- Facebook Engineering, "Scaling Memcache at Facebook" (2013) — a detailed, real-world account of stampede mitigation (referenced already in §10.8) at large scale.
- Redis documentation, "Cache invalidation" and "Client-side caching" guides — practitioner-level treatment of the invalidation and TTL mechanisms in §39.2 and §39.4.

---
