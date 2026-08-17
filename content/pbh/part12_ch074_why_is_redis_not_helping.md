## 74. Why Is Redis Not Helping?

### 74.1 Symptoms

Redis was introduced specifically to reduce database load or improve latency (companion §47), yet database load remains high, response latency hasn't measurably improved, or Redis itself is now showing signs of strain (high CPU, memory pressure, or elevated command latency) without the expected corresponding relief elsewhere in the system.

### 74.2 Possible Causes

The cache hit rate is low — most requests still miss the cache and fall through to the database, because the cache key design doesn't actually match how requests vary (companion §47.5), or the TTL is so short that entries expire before being reused; the cached computation wasn't actually expensive in the first place, meaning the caching layer adds overhead (a network round-trip to Redis, companion §47.3) without saving meaningful work on the miss path it was meant to avoid; cache stampede (companion §47.8) — many concurrent requests simultaneously miss on the same key (often right after an expiration) and all fall through to the database at once, briefly producing *worse* database load than no caching at all; Redis itself has become a new bottleneck, either from being undersized for the actual command volume or from a small number of very large values causing latency spikes and memory pressure (companion §47.9); or invalidation is broken, serving stale data that appears "fine" from a pure-performance perspective while silently violating correctness, an entirely different failure mode masquerading as "not helping."

### 74.3 Metrics

Cache hit rate (companion §47.5), the single most direct diagnostic — a low hit rate (well below what the access pattern should theoretically allow) points immediately at key design or TTL; Redis command latency and memory usage (companion §57.4) to rule out Redis itself as the new bottleneck; database query volume before and after cache introduction, directly measuring whether the intended load reduction actually materialized.

### 74.4 Logs

Application-level cache hit/miss logging (companion §47.7) at a sampling rate sufficient to compute an accurate hit rate without excessive log volume; Redis's own slow-log (companion §57.4) surfacing specific commands taking unusually long, often revealing an oversized value or an inefficient command pattern (a large `KEYS` scan instead of a targeted lookup).

### 74.5 Investigation

Start by simply measuring the actual cache hit rate (§74.3) — a surprisingly large fraction of "Redis isn't helping" investigations end here, since a low hit rate alone fully explains the lack of benefit and immediately redirects the investigation toward cache key/TTL design (companion §47.5) rather than any Redis-internal issue. If the hit rate is genuinely high but database load or latency still hasn't improved, verify that what's being cached was actually expensive to compute in the first place — caching a query that was already fast provides no meaningful benefit and merely adds Redis's own round-trip cost on every access.

### 74.6 Root Cause

In practice, the most common real-world causes, in order: a cache key design that doesn't match actual request variation (e.g., caching by a coarse key when requests genuinely vary by a finer dimension the key ignores, producing far more misses than the access pattern should require, companion §47.5); a TTL set too short relative to how frequently the same value is actually requested, causing most accesses to be misses despite the underlying data changing far less often than the TTL assumes; and cache stampede (companion §47.8) at moments of simultaneous expiration under high concurrent load, producing sharp, brief spikes of database load that can be worse than having no cache at all for that specific window.

### 74.7 Fix

Redesign the cache key to match actual request variation (companion §47.5) — this alone frequently resolves a low-hit-rate problem entirely; extend the TTL to match actual data-change frequency, informed by the specific staleness tolerance the data genuinely allows (companion §47.2's staleness-versus-correctness tradeoff), rather than a short, arbitrarily-chosen default; for cache stampede, apply a stampede-prevention mechanism (companion §47.8 — a lock-based or probabilistic-early-refresh pattern) ensuring only one request recomputes an expiring value while others briefly serve the slightly-stale existing value rather than all falling through simultaneously.

### 74.8 Tradeoffs

A longer TTL directly trades staleness tolerance for hit rate (companion §47.2) — appropriate only when the data's actual change frequency and the application's actual staleness tolerance genuinely permit it, and this specific tradeoff must be evaluated per-cached-value rather than applied as one blanket policy; stampede prevention adds real implementation complexity (a distributed lock or refresh-ahead mechanism, companion §47.8) that's only worth the cost for high-traffic keys where a stampede's impact is actually severe enough to matter.

### 74.9 Prevention

Measure cache hit rate from the very first day a cache is introduced (companion §47.7), not only when a problem is later suspected, so that a low-hit-rate design flaw is caught immediately rather than after the caching layer has been trusted (incorrectly) for an extended period; deliberately choose cache keys and TTLs based on actual, measured request variation and data-change frequency (companion §47.5) rather than convenient defaults; apply stampede prevention (§74.7) proactively for any high-traffic cached key from the outset, rather than only after a stampede incident is observed in production.

### 74.10 Engineering Intuition

> **What's the fastest single number that tells me whether Redis is actually helping?** Cache hit rate — if it's low, no other investigation matters yet, since a cache that's mostly missing can't be providing its intended benefit regardless of how well everything else is configured; if it's high but the database still isn't relieved, the cached computation likely wasn't expensive enough to matter in the first place.

> **Why can adding a cache sometimes make peak-load database performance temporarily *worse* than having no cache at all?** Cache stampede (§74.2) — at the exact moment a popular key expires under high concurrent traffic, every waiting request falls through to the database simultaneously instead of the traffic being smoothed out over time the way it would be without a shared, synchronized expiration point.

### 74.11 Decision Tree: Diagnosing "Redis Isn't Helping"

```
What is the actual, measured cache hit rate (§74.3)?
  LOW -> Redesign cache key granularity and/or extend TTL to match
         actual request variation and data-change frequency (§74.7).
  HIGH, but no measured improvement in DB load/latency ->
    Was the cached computation genuinely expensive before caching?
      NO -> Caching this value was never going to help meaningfully;
            look for genuinely expensive operations elsewhere instead.
      YES -> Check for cache stampede at expiration (§74.2, §47.8) or
            for Redis itself becoming the new bottleneck (§57.4).
```

### 74.12 Further Reading

- Companion §47 (Caching Architecture), §57.4 (Redis Metrics) — the full mechanism depth behind this chapter's diagnostic framework.

---
