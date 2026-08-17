## §155. Cache Patterns: Cache-Aside, Write-Through, Write-Behind, Write-Around

### 1. The Vocabulary

- **Cache-aside (lazy loading)** — the application checks the cache first; on a miss, it reads
  from the database, then populates the cache for next time. The most common pattern, and the one
  this book's §38 already assumes by default.
- **Write-through** — every write goes to the cache and the database together, synchronously, so
  the cache is never stale immediately after a write, at the cost of every write paying the
  latency of both.
- **Write-behind (write-back)** — a write goes to the cache immediately and is asynchronously
  flushed to the database later, minimizing write latency at the cost of a real risk of data loss
  if the cache fails before the flush happens.
- **Write-around** — a write goes directly to the database, bypassing the cache entirely; the
  cache only gets populated on a subsequent read (cache-aside style) — used when written data is
  unlikely to be read again soon, to avoid polluting the cache with rarely-accessed writes.

### 2. Where It Sits, and Why Teams Use It

Naming these patterns explicitly turns "I used a cache" into a specific, defensible design
decision. Cache-aside is the default because it's simple and self-healing (a cache failure just
means more database reads, not incorrect data). Write-through trades write latency for read
consistency, appropriate when reads must never see stale data immediately after a write.
Write-behind trades durability risk for write speed, appropriate for high-write-volume,
loss-tolerant data (like activity counters). Write-around avoids polluting the cache with
write-heavy, rarely-read data (like audit logs).

### 3. What Actually Breaks

- **Defaulting to cache-aside without considering the actual read-after-write requirement** — a
  feature where a user expects to immediately see their own write (e.g., a profile update) can show
  stale data briefly under pure cache-aside if the cache isn't also explicitly invalidated on write.
- **Write-behind without a durability plan** — treating write-behind's async flush as equivalent to
  a synchronous write is a real data-loss risk if the cache crashes before flushing; this pattern
  requires an explicit, accepted tradeoff, not an accidental one.
- **Write-through applied to data that's rarely read** — paying the latency cost of writing to
  cache and database together for data that's read infrequently is unnecessary overhead with no
  real benefit.
- **Not choosing a pattern deliberately at all** — the most common real failure: caching added
  ad hoc without anyone naming which pattern is in use, making the actual consistency guarantees
  unclear to the next engineer who touches it.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I default to cache-aside, and pair it with explicit cache invalidation on write for anything
  where a user expects to see their own change immediately."
- "I'd only reach for write-behind where the durability tradeoff is explicitly acceptable — like
  high-volume, loss-tolerant counters — never for anything that must never be lost."
- "I name which caching pattern I'm using explicitly, since 'we use a cache' without naming the
  pattern usually means nobody's actually reasoned about its consistency guarantees."

### 5. Interview-Ready Answer

> "My default is cache-aside — read from cache, fall through to the database and populate on a
> miss — because it's simple and self-healing if the cache goes down. I pair it with explicit
> invalidation on write wherever a user expects to see their own change immediately. I'd only
> reach for write-through when reads must never see stale data right after a write, and
> write-behind only where the durability tradeoff — losing recent writes if the cache fails before
> flushing — is explicitly acceptable, like activity counters rather than financial data."

### 6. Go Deeper

companion Software Systems Handbook's §39 (Caching Mechanics: eviction, write strategies,
stampede/avalanche) chapter and companion Software Systems Handbook's §65 (Caching at Scale:
multi-tier, global invalidation) chapter for the full consistency-model analysis of each pattern;
this book's §38-41 (caching fundamentals, invalidation, Redis, eviction) for the foundational
caching vocabulary this chapter builds on.

---
