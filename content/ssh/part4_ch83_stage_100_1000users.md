## 83. Stage 100 → 1,000 Users: Connection Pool Exhaustion, First Cache, First CDN

### 83.1 What Broke

At 1,000 users, Loop's feed page — the single most-loaded endpoint, since it's the first thing every user sees on every visit — begins intermittently returning errors during the evening peak usage window. The now-functioning monitoring from §82 (ADR-002) shows the application server logging "too many database connections" errors specifically during these windows, not during off-peak hours.

### 83.2 Why It Broke

This is **connection pool exhaustion** (§51.3, Part V §91.B), and it's worth tracing precisely why it appeared now and not before. Each incoming request opens a database connection to serve the feed query; at low traffic (Stage 0-1), the number of concurrent requests never came close to the connection pool's size. At 1,000 users with real, concurrent evening usage, Little's Law (§56.2) now produces a genuinely non-trivial concurrency figure — and that concurrency, applied against a connection pool sized without any real estimation behind it (an unexamined default, inherited from Stage 0), finally exceeds the pool's capacity. This is a textbook capacity failure (§1.3.1): nothing is "broken" in the sense of malfunctioning; the system is doing exactly what it was configured to do, and the configuration simply wasn't sized for the load now arriving.

### 83.3 Candidate Fixes

- **Fix A: Simply increase the connection pool size.** Cost: nearly free to implement, but only pushes the ceiling higher without addressing why every single feed request needs its own expensive database round trip in the first place — the underlying query volume is the real issue, and this fix doesn't reduce it.
- **Fix B: Add an application-level cache (§10, §39) in front of the feed query,** since feed content for a given user doesn't change on every request, and many users are likely requesting feeds that substantially overlap in underlying content.
- **Fix C: Add a CDN (§59.4) in front of static assets** (images, CSS, JS) to reduce the *number* of requests reaching the application server at all for non-dynamic content, indirectly reducing pressure on the connection pool by removing static-asset load from the same server entirely.

### 83.4 Which Fixes Were Chosen, and Why

**Both B and C, with A treated as a minor, secondary adjustment, not the primary fix.** Increasing the pool size alone (Fix A) treats a symptom rather than the cause — per §1.6, the bottleneck would simply move to raw database query load shortly afterward, since nothing about the actual number of expensive queries has changed. Fix B directly addresses the root cause: caching feed results (with a short TTL, §39.2, since feed freshness within a few seconds is entirely acceptable per §80.3's consistency-requirements analysis for this specific data) means repeated requests for a similar feed are served from cache rather than repeating an expensive database query, directly reducing the number of connections needed concurrently. Fix C is adopted simultaneously because it is cheap, low-risk, and addresses a genuinely separate source of unnecessary load (static assets) that was never the direct cause of the pool exhaustion but was contributing unnecessary total request volume to the same server.

### 83.5 What This Fix Made Possible, and What New Failure Mode It Introduced

Caching the feed query (§83.4, Fix B) directly reduces database load and, as a direct consequence, resolves the connection exhaustion without an artificial ceiling increase. It also introduces this handbook's first real instance of §10.3's staleness tradeoff in production: a user who posts something and immediately refreshes their own feed may not see their own post for up to the cache's TTL — a real, if minor, user-facing behavior change that must be explicitly decided as acceptable (and is, per §80.3's consistency analysis) rather than discovered as a surprise. The CDN (Fix C) introduces its own first real instance of §59.4's cache invalidation timing consideration, though at this stage, with infrequently-changing static assets, this is a non-issue in practice.

### 83.6 Retrospective: Architecture Decision Record

```
ADR-003: Add application-level caching for the feed query and a
CDN for static assets

Context: Evening-peak connection pool exhaustion traced to
uncached, repeated, expensive feed queries plus unnecessary
static-asset load on the application server.

Decision: Introduce a short-TTL cache in front of the feed query
(cache-aside pattern, §65.5) and a CDN for static assets.
Connection pool size is also modestly increased as a secondary,
supporting change, not the primary fix.

Alternatives considered:
  - Pool size increase alone: rejected as treating a symptom,
    not the root cause (§83.4).

Consequence: Feed data now has a small, deliberate staleness
window (bounded by cache TTL). This is explicitly evaluated
against Loop's actual consistency requirements (§80.3) and
judged acceptable.
```

### 83.7 Engineering Intuition for This Stage

> **How do I know if a connection pool error is a root cause or a symptom?** Ask what's actually consuming the connections — if it's a small number of expensive, repeated, cacheable queries (as here), the pool size itself is a symptom; if genuinely distinct, necessary queries are simply numerous, the pool size may be the more direct lever.
>
> **What would over-fixing this look like?** Jumping to database sharding (§35) or a full read-replica architecture (§34) in response to what is, at this stage, a straightforwardly cacheable, single-query hotspot — a needlessly complex response to a problem caching solves directly and cheaply.
>
> **What's the tell that caching is the right fix here, specifically?** The query being repeated is read-heavy, tolerant of brief staleness (§80.3), and represents a small number of "hot" query shapes rather than a large diversity of unique, uncacheable queries — precisely §10.2's locality condition for caching being worthwhile.

### 83.8 Exercises

1. A teammate proposes sharding the database in response to the connection pool errors. Using §83.4 and the broader principle from §8.6, explain why this is premature at this specific stage, and what evidence would change that assessment.
2. Loop's feed cache is set with a 30-second TTL. A user reports their own newly-created post doesn't appear in their feed for up to 30 seconds. Using §83.5 and §80.3, explain why this is an accepted, deliberate tradeoff rather than a bug.

---
