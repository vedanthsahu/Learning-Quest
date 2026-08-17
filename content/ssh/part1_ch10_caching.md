## 10. Mental Model: Caching

### 10.1 The Problem: Some Answers Are Expensive to Compute Twice

Many requests a system serves ask for the same answer, or nearly the same answer, that was already computed a moment ago for someone else, or for the same caller. Recomputing that answer from scratch every single time — rerunning the expensive database query, re-rendering the same page, re-calling the same slow downstream service — spends real compute, storage I/O, and network time (§1.4) on work whose result hasn't actually changed. A **cache** is simply a place to keep a recently-computed answer so that the next request for it can be served from fast, nearby storage instead of redoing the expensive work. Eviction algorithms, invalidation strategies, and stampede/avalanche/penetration failure modes are deferred to Pass 2, §39.

### 10.2 Why Caching Works At All: Locality

Caching is only useful because real workloads are not uniformly random — a small fraction of data is usually responsible for a large fraction of requests (a popular product page, a logged-in user's own profile, a frequently-run report). This unevenness is called **locality**, and it is the entire reason caching is effective: if every request asked for a genuinely unique piece of data, keeping recent answers around would buy you nothing, because the next request would never match anything already cached. Recognizing whether your own workload actually has this property is the first, and most commonly skipped, step before adding a cache at all.

### 10.3 The Danger: A Cache Is a Second Copy of the Truth

The moment you cache an answer, you have created exactly the same fundamental problem replication introduced in §8.3: there are now two representations of the same fact (the real, current data, and the cached snapshot of it), and they can disagree. If the underlying data changes and the cache is not updated or discarded, callers reading from the cache see **stale data** — an answer that was correct a moment ago and is now wrong. Every caching strategy is, at its core, a specific answer to the question "how do we make sure the cache doesn't lie for longer than we can tolerate," and how much staleness is tolerable is a business decision, not a technical one — a cached stock price is a very different risk than a cached list of blog post titles.

### 10.4 Caching Is Not "Always Faster"

Caching trades a small amount of correctness risk (§10.3) for a large reduction in load on whatever the cache sits in front of — but it is not free, and it is not automatically the right answer. A cache that is checked but almost never contains the requested answer (a **cache miss**) has added an extra hop to every request without saving any work at all. A cache that becomes larger than the working set of frequently-accessed data can hold has to make decisions about what to evict, and evicting badly can make the cache actively counterproductive. This is why caching decisions belong squarely in the tradeoff-thinking framework of §1.5: the correct question is never "should we cache this," it is "does this specific data have enough locality (§10.2), and can we tolerate enough staleness (§10.3), that the tradeoff is worth it here."

### 10.5 Where Caches Live: A Preview of a Recurring Idea

At the mental-model level, it is worth noticing that "cache" is not one location — a cache can sit in the browser, at a CDN edge node near the user, inside the application process, or as a dedicated caching layer in front of a database, and real systems frequently use several of these simultaneously, each one intercepting requests before they reach the next, slower layer. This layered idea is only introduced here; it is developed in full, with the mechanics of keeping many layers of cache coherent at once, in §65 once the large-scale implications are in scope.

### 10.6 Engineering Intuition

> **How do I know I need a cache?** When you can point to a specific expensive operation (a slow query, a costly computation, a slow downstream call) that is repeatedly asked for the *same* answer by different requests — not before that evidence exists.
>
> **What symptoms indicate a caching opportunity?** A small number of database queries or endpoints dominating total load; the same expensive computation appearing repeatedly in request traces for different users at nearly the same input.
>
> **What metrics indicate it?** High read-to-write ratio on a specific dataset; a small "hot" subset of keys or rows accounting for a disproportionate share of query volume.
>
> **What breaks first if you cache without discipline?** Stale data being served past the point it's acceptable, and — once a cache is under real load — the specific failure modes in §39 (cache stampede, avalanche, penetration), where the cache itself becomes a source of outages rather than protection against them.
>
> **When should you *not* cache?** When the data has no locality (§10.2) — genuinely unique per-request data gains nothing from caching — or when staleness of any duration is unacceptable for that specific data (e.g., a real-time balance check before authorizing a large transaction).
>
> **What would a hyperscale company do?** Run multiple layers of cache simultaneously (CDN, edge, application, database buffer pool) with carefully designed invalidation and warming strategies, because at their request volume, even a small cache-miss rate translates into enormous absolute load (§65).
>
> **What would a two-person startup do?** Add a single, simple in-memory or managed cache in front of the one or two queries that are actually slow, and leave everything else uncached until a specific measurement says otherwise.
>
> **What changes with scale?** At low request volume, caching is often a premature optimization — the underlying database can simply serve every request directly. Caching earns its complexity once request volume or per-request cost is high enough that recomputing every answer becomes the dominant cost or latency contributor, typically arriving by the middle stages of Part IV (§83).

### 10.7 Exercises

1. Identify one endpoint in a system you know that serves largely the same data to many different requests. Argue whether it has enough locality (§10.2) to benefit from caching, and how stale an answer could be before it caused a real problem.
2. A cache is added in front of a database, and shortly afterward the database experiences a severe load spike whenever the cache is cleared or restarted. Using only §10.3–10.4, explain in general terms what class of problem this points to (full mechanism deferred to §39).

### 10.8 Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 3 (relevant caching/indexing tradeoffs) — bridges this chapter's conceptual framing to storage-engine mechanics.
- Facebook Engineering, "Scaling Memcache at Facebook" (2013) — a widely-cited real-world account of the staleness and stampede problems previewed in §10.3–10.4, developed fully in §39 and §65.

---
