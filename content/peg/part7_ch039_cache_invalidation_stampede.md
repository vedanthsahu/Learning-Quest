## §39. Cache Invalidation, Stale Data, and Stampede

### 1. The Vocabulary

- **Cache invalidation** — explicitly removing or updating a cached value when the underlying
  data changes, instead of waiting for its TTL to expire naturally.
- **Stale data** — a cached value that no longer matches the current source of truth.
- **Cache stampede (a.k.a. dogpile/thundering herd)** — when a popular cached value expires and
  many concurrent requests all miss at once, all hammering the source of truth simultaneously to
  regenerate it.
- **Jittered TTL** — adding a small random offset to each TTL so a large batch of keys don't all
  expire at exactly the same instant.
- **Request coalescing** — letting only *one* of many simultaneous cache-miss requests actually
  regenerate the value, while the others wait for that result instead of all recomputing it.

### 2. Where It Sits, and Why Teams Use It

This is the famous "there are only two hard problems in computer science: cache invalidation and
naming things" territory — invalidation is genuinely hard because it requires the cache to know
*exactly* when the underlying data changed, which is easy to get subtly wrong.

### 3. What Actually Breaks

- **Redis serving old data after an update** — the classic symptom: a value was updated in the
  database, but the cache entry wasn't invalidated (or was invalidated inconsistently across a
  cluster), so reads keep returning the pre-update value until the TTL eventually expires.
- **A cache stampede taking down the database** — a popular key expiring during high traffic means
  potentially hundreds of concurrent requests all miss at the same instant and all hit the
  database simultaneously trying to regenerate the same value — sometimes hard enough to cause the
  very database overload the cache was supposed to prevent.
- **Invalidating the wrong key, or too broadly** — clearing an entire cache namespace when only
  one specific entry actually changed causes a much larger, unnecessary stampede than a precise
  invalidation would have.
- **Multiple app instances with inconsistent invalidation logic** — one code path invalidates the
  cache on update, another path that also modifies the same data forgets to, and now staleness
  depends on which path handled the write.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I invalidate a cache entry explicitly at write time, rather than relying purely on TTL expiry,
  whenever near-real-time consistency actually matters."
- "For popular keys, I'd add TTL jitter and/or request coalescing specifically to prevent a
  stampede when the key does eventually expire."
- "Every code path that writes the underlying data needs to also handle cache invalidation — this
  is a common source of the 'cache sometimes has stale data' bug."

### 5. Interview-Ready Answer

> "Stale data almost always traces back to a write path that updated the database but didn't
> invalidate the corresponding cache entry — I check every place that writes the underlying data,
> not just the obvious one. For high-traffic keys specifically, I also worry about stampede: if a
> popular key expires and many requests miss at once, they can all hit the database
> simultaneously trying to regenerate the same value. Jittering TTLs and coalescing concurrent
> regeneration into a single request are the standard fixes."

### 6. Go Deeper

companion Software Systems Handbook's §39 (Caching Mechanics: eviction, write strategies,
stampede/avalanche) chapter (eviction policies, invalidation, stampede/avalanche/penetration in
full).

---
