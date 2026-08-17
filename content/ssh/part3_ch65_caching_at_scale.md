## 65. Caching at Scale: Multi-Tier Caches, CDN + Edge + App + DB Cache Coordination, Global Cache Invalidation

### 65.1 What This Chapter Adds to §10 and §39

§10 and §39 covered caching's purpose and mechanics for a single cache layer. At hyperscale, a request typically passes through *several* independent caching layers simultaneously, and this chapter covers how they're coordinated, and the genuinely hard problem of invalidating an entry across all of them consistently, globally.

### 65.2 The Multi-Tier Cache Stack, End to End

A typical hyperscale request touches, potentially: a **browser cache** (client-side, outside your infrastructure entirely); a **CDN edge cache** (§59.4, geographically distributed, closest layer you control); an **application-level cache** (§10, close to your application logic, holding computed or frequently-accessed results); and a **database buffer pool** (§31.6, the innermost layer, caching disk pages in memory). Each layer exists because it intercepts a request before it reaches the next, progressively more expensive layer — a request served entirely from the CDN edge never reaches your application servers at all; a request served from the application cache never reaches the database; and so on. The engineering-relevant consequence: the *effective* latency and load-reduction benefit of any one layer depends on how many requests are already being absorbed by layers in front of it — improving your application cache's hit rate provides diminishing returns if the CDN layer in front of it is already absorbing the vast majority of eligible traffic, and vice versa.

```
Request path through a full multi-tier cache stack:

  Browser cache -> CDN edge cache -> Application cache -> Database buffer pool -> Disk
       |                |                    |                    |
   (fastest,        (fast, but          (fast, but only     (fastest layer
    but only         only serves          serves YOUR        actually
    THIS user's      cacheable,           application's       touching
    own repeat       shared content       own hot data)        storage,
    requests)        across ALL users)                        slowest overall)
```

### 65.3 Global Cache Invalidation: Why It's Genuinely Hard at This Scale

§39.4 flagged that invalidation and the underlying write are two separate operations that can fail independently. At the scale of a multi-tier, globally-distributed cache stack, this problem compounds severely: invalidating a single piece of content might require propagating that invalidation to thousands of CDN edge nodes worldwide (§59.4), an unknown number of application server instances each holding their own local cache copy, and confirming the underlying database write has itself fully committed and replicated (§34) — all while some users may already be observing the old value from any one of these layers, at potentially different times. This is why large-scale systems typically accept a deliberate, bounded staleness window for invalidation (directly the eventual-consistency tradeoff from §37.5 and §38, now applied specifically to cache coherence across a multi-tier, globally-distributed stack) rather than attempting to guarantee instantaneous, perfectly synchronized invalidation everywhere — the latter would require a level of global coordination (§36, §62.2) that is either prohibitively expensive or, for most cached content, simply not worth the cost relative to a short, well-understood staleness window.

### 65.4 Cache Key Design at Scale: Avoiding Unintended Fragmentation

A subtle but consequential problem specific to caching at scale is **cache key fragmentation**: including too much variability in a cache key (e.g., accidentally including a per-request timestamp, a session-specific token, or a rarely-relevant header in the key used to look up cached content) causes what should be one shared, highly-reused cache entry to instead fragment into an enormous number of nearly-identical, individually-rare entries — each one experiencing a low hit rate, collectively defeating the cache's entire purpose despite the underlying content being genuinely shareable across many requests. Diagnosing this requires directly inspecting actual cache key distribution and hit rate by key pattern — a symptom that looks like "the cache isn't working" is very often actually "the cache key is more specific than the content it's caching actually requires," a design mistake rather than an infrastructure failure.

### 65.5 Coordinating Consistency Across Layers: The "Cache-Aside" Pattern at Scale

Given the difficulty of perfectly synchronized invalidation (§65.3), most large-scale systems adopt the **cache-aside** pattern deliberately and explicitly at every layer: the application (or CDN, or edge logic) checks the cache first, and on a miss, reads from the next layer down and populates the cache for next time — combined with a relatively short TTL (§39.2) at each layer as the actual backstop guaranteeing eventual correctness, rather than relying on invalidation propagation alone to be perfectly reliable. This is a deliberate acceptance that invalidation is a best-effort optimization (reducing staleness *most* of the time, for *most* content) while TTL expiration is the actual, relied-upon correctness guarantee (bounding the *worst-case* staleness any layer can ever serve) — a distinction worth being explicit about, since teams that rely on invalidation alone, without a meaningful TTL backstop, are exposed to indefinite staleness whenever an invalidation message is lost or fails to reach some subset of cache nodes.

### 65.6 Common Mistakes and Production Debugging Signals

- Relying solely on invalidation messages with no meaningful TTL backstop at any cache layer (§65.5), leaving the system exposed to indefinite staleness whenever an invalidation is lost, delayed, or fails to reach a subset of distributed cache nodes.
- Including unnecessary variability in cache keys (§65.4), producing a low, puzzling cache hit rate that looks like a capacity or infrastructure problem but is actually a cache key design mistake, diagnosable directly by examining key-level hit rate distribution.
- Optimizing a specific cache layer's hit rate in isolation, without considering how much traffic is already being absorbed by layers in front of it (§65.2), producing wasted engineering effort on a layer that had little further improvement available given the existing traffic already filtered out upstream.

### 65.7 Engineering Intuition

> **How do I know which cache layer to optimize first?** Measure the hit rate and traffic volume actually reaching each layer, from outermost (CDN) to innermost (database buffer pool) — the layer absorbing the largest share of remaining, unserved traffic with the lowest hit rate is usually the highest-value target for improvement.
>
> **What symptoms indicate a cache key fragmentation problem?** A surprisingly low hit rate for content that is, conceptually, genuinely shared and reused across many requests — a strong signal to inspect the actual cache key structure directly (§65.4).
>
> **What metrics indicate an invalidation reliability gap?** Reports of stale content persisting well beyond any layer's configured TTL — since a properly-configured TTL should bound worst-case staleness regardless of invalidation reliability, persistent staleness beyond that bound points to a TTL misconfiguration, not merely an invalidation failure.
>
> **What breaks first if global invalidation is assumed to be instantaneous and fully reliable?** Users see visibly inconsistent content (some seeing updated data, others stale) for longer than expected, and — if no TTL backstop exists — potentially indefinitely, until a lost invalidation message is somehow manually or serendipitously corrected.
>
> **When is a single-layer cache (no full multi-tier stack) sufficient?** At smaller scale, with a geographically concentrated user base and lower absolute request volume, a single application-level or CDN cache layer is often entirely sufficient, and the added complexity of coordinating multiple tiers isn't yet justified.
>
> **What would a hyperscale company do?** Deploy and actively tune a full multi-tier cache stack, use short, deliberate TTLs as the relied-upon correctness backstop at every layer, and continuously monitor cache key hit-rate distributions to catch fragmentation early (§71).
>
> **What would a two-person startup do?** Use a managed CDN plus a single, simple application-level cache, relying on straightforward TTL expiration rather than building custom invalidation propagation across multiple tiers.
>
> **What changes with scale?** At small scale, a single cache layer with simple TTL-based expiration is sufficient. At hyperscale, the full multi-tier stack, deliberate TTL-as-backstop design, and careful cache key discipline become necessary to keep both performance and consistency behavior predictable and correct (§71).

### 65.8 Exercises

1. A cached API response shows an unexpectedly low hit rate despite the underlying content being requested identically by thousands of users. Using §65.4, describe the specific diagnostic step you would take, and a plausible cache-key-related root cause.
2. Explain, using §65.5, why relying exclusively on cache invalidation messages (with no TTL) is riskier at global, multi-tier scale than at the scale of a single, local cache instance, and what specific failure this exposes the system to.

### 65.9 Further Reading

- Facebook Engineering, "Scaling Memcache at Facebook" (2013) — referenced already in §10.8 and §39.11, containing a detailed, real-world account of multi-tier cache coordination challenges directly relevant to this chapter.
- Fastly/Cloudflare engineering blogs on "cache purging at scale" — practitioner-level treatments of the global invalidation propagation challenge described in §65.3.

---
