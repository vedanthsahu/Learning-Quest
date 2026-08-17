## §169. Cache Stampede, Thundering Herd, and Hot Key

### 1. The Vocabulary

- **Cache stampede (dogpile effect)** — when a popular cached value expires, many concurrent
  requests all miss the cache at once and all hit the database simultaneously to recompute the
  same value.
- **Thundering herd** — the more general version of the same phenomenon: many processes/threads all
  woken up or triggered by the same event, most of which then find there's nothing useful for them
  to do, wasting the resource contention.
- **Hot key** — a single cache key (or database row) receiving disproportionately high traffic
  compared to everything else, becoming a bottleneck even when overall system load looks fine on
  average.
- **Request coalescing** — the fix for cache stampede: when multiple concurrent requests miss the
  same key, only one actually goes to the database; the others wait for and share that one result.

### 2. Where It Sits, and Why Teams Use It

If someone says "cache stampede," the concrete mental model is: a popular product page's cache
entry expires, and the next 500 concurrent requests for that page all miss at once and all query
the database simultaneously — a load spike the database wasn't sized for, caused specifically by
the *expiration* event, not by organically increasing traffic. Hot key is the same underlying
"one thing gets disproportionate attention" problem without necessarily involving expiration —
often a specific celebrity's profile, a viral post, or a popular product.

### 3. What Actually Breaks

- **TTL expiration with no coalescing or staggering** — the textbook stampede: everyone's cache
  entry for a popular key expires at the same instant and every subsequent request hits the
  database at once.
- **Jittered TTLs not used** — adding a small random offset to each cache entry's TTL spreads
  expirations out over time instead of having many entries expire in the same instant, directly
  reducing stampede risk.
- **A hot key on a sharded system landing all its traffic on one shard** — sharding (§159)
  distributes load by key, but a single very popular key still lands entirely on one shard/node,
  which can become a bottleneck even while every other shard is nearly idle.
- **No stale-while-revalidate strategy** — serving a slightly stale cached value while
  asynchronously refreshing it in the background avoids both the stampede and a visible latency
  spike for the user who happens to trigger the cache refresh.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "For cache stampede, I'd use request coalescing so concurrent misses on the same key share one
  database query instead of each triggering their own."
- "I add jitter to cache TTLs so entries for related keys don't all expire in the same instant."
- "I know a hot key can bottleneck a single shard even when the overall system looks
  underutilized, since sharding distributes by key, not by actual traffic volume per key."

### 5. Interview-Ready Answer

> "A cache stampede is what happens when a popular cache entry expires and many concurrent requests
> all miss at once and all hit the database simultaneously — I'd address it with request coalescing
> so only one of those requests actually queries the database while the rest wait for that result,
> plus jittered TTLs so related entries don't expire in the same instant to begin with. A hot key is
> the related but distinct problem of one specific key getting disproportionate traffic — that can
> bottleneck a single shard even when the system's overall load looks fine, which is why I'd
> monitor per-key traffic, not just aggregate load."

### 6. Go Deeper

companion Software Systems Handbook's §65 (Caching at Scale: multi-tier, global invalidation)
chapter for full stampede-prevention implementation patterns; this book's §39 (cache invalidation/
stale data/stampede) for the foundational version of this exact problem and §170 (hot partition)
for the sharding-specific variant.

---
