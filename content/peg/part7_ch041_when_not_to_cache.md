## §41. When Not to Cache & Eviction Policies

### 1. The Vocabulary

- **Eviction policy** — the rule a cache uses to decide what to remove when it's full (LRU —
  least recently used — is the most common default).
- **Cache metrics** — hit rate, memory usage, eviction rate — the numbers that tell you whether a
  cache is actually helping or just adding complexity.
- **Write-through / write-behind / write-around** — three patterns for how writes interact with
  a cache: update the cache and the source together, update the cache and flush to the source
  later, or write only to the source and let the cache populate on the next read.

### 2. Where It Sits, and Why Teams Use It

Caching is a real tradeoff, not a free performance upgrade — it adds a whole new class of bugs
(staleness, invalidation complexity, hot keys) in exchange for speed. Recognizing when *not* to
cache something is as much a skill as knowing the caching patterns themselves.

### 3. What Actually Breaks

- **Caching something cheap to compute and rarely accessed** — the overhead of managing the cache
  entry (memory, invalidation logic, an extra network hop to Redis) can exceed the cost of just
  recomputing it, especially for data that's already fast to fetch.
- **Caching highly personalized, rarely-repeated data** — if a value is almost never requested a
  second time (e.g., a truly unique one-off computation per user per request), there's no "hit"
  to benefit from, only the overhead of writing to the cache.
- **Not watching hit rate** — a cache with a very low hit rate is providing little benefit while
  still carrying memory cost and invalidation complexity; it's worth periodically checking whether
  a given cache is actually earning its keep.
- **Choosing the wrong eviction policy for the access pattern** — LRU works well when recently-
  used items are likely to be used again soon; for access patterns that don't have that property
  (e.g. a full scan through data once), LRU can evict genuinely useful entries in favor of
  one-off ones.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I don't cache by default — I cache specifically when something is expensive to compute/fetch
  and likely to be requested again soon."
- "I check actual hit rate on caches periodically, not just assume they're helping because they
  exist."
- "LRU is a reasonable default eviction policy, but I'd reconsider it if the actual access
  pattern doesn't have temporal locality."

### 5. Interview-Ready Answer

> "Caching isn't free — it trades speed for staleness risk and real operational complexity, so I
> only reach for it when something is genuinely expensive to compute or fetch and likely to be
> requested again soon. For anything cheap, rarely repeated, or highly personalized per request,
> caching often adds more overhead and invalidation complexity than it saves. And for caches that
> do exist, I check hit rate periodically rather than assuming they're earning their cost forever."

### 6. Go Deeper

companion Software Systems Handbook's §39 (Caching Mechanics: eviction, write strategies,
stampede/avalanche) chapter (eviction policies, write-through/behind/around in full).

---
