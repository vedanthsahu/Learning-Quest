## §38. Caching Fundamentals: Hit, Miss, TTL, Cache-Aside

### 1. The Vocabulary

- **Cache hit / miss** — the requested data was already in the cache, or it wasn't.
- **TTL** — how long a cached value is kept before it's considered stale and discarded.
- **Cache-aside (lazy loading)** — the application checks the cache first; on a miss, it reads
  from the source of truth and writes the result into the cache for next time.
- **In-memory cache** vs **distributed cache** — a cache local to one process's memory (fast, but
  every instance has its own separate copy) vs. a shared cache like Redis that every instance
  reads from consistently.

### 2. Where It Sits, and Why Teams Use It

Caching exists purely to trade a small amount of staleness risk for a large amount of speed and
reduced load on the actual source of truth (usually a database). Cache-aside is the default
pattern precisely because it's simple and fails safe — a cache miss just means "slightly slower
this one time," not "broken."

### 3. What Actually Breaks

- **Caching without a TTL "because it rarely changes"** — "rarely" isn't "never," and data that
  does eventually change now has no built-in mechanism to ever refresh.
- **Using an in-memory cache in a multi-instance deployment and expecting consistency** — each
  instance has its own separate copy; instance A caching a value doesn't mean instance B sees the
  update, which shows up as "sometimes I see the new data, sometimes the old" depending on which
  instance handled the request.
- **Caching an error response** — if a failed lookup gets cached the same way a successful one
  does, every subsequent request keeps hitting that cached failure long after the underlying
  problem is fixed.
- **Not thinking about what happens on a miss under heavy load** — see §39 for the stampede
  problem this causes specifically.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Every cached value gets a TTL — I don't rely on 'it rarely changes' as the only staleness
  control."
- "An in-memory, per-process cache is fine for something instance-local; anything that needs to
  be consistent across instances needs a shared cache like Redis instead."
- "I don't cache error responses the same way as successful ones, or a transient failure becomes
  a much longer-lived one."

### 5. Interview-Ready Answer

> "Cache-aside is my default pattern: check the cache, fall through to the real source on a miss,
> and populate the cache for next time. The two disciplines that keep it safe are always setting
> a TTL, even on data that 'rarely changes,' and being deliberate about in-memory versus shared
> caching — an in-memory cache is fine for single-instance data, but the moment multiple instances
> need a consistent view, that has to be a shared cache like Redis."

### 6. Go Deeper

companion Software Systems Handbook's §10 (Mental Model: Caching) and companion Software Systems
Handbook's §39 (Caching Mechanics: eviction, write strategies, stampede/avalanche) chapters;
companion Python Backend Engineering Handbook's §47 (Caching Architecture) chapter.

---
