## 99. Scaling Patterns Catalog

### 99.1 Previously Covered, Named for Catalog Completeness

**Read replicas** (§34.2), **sharding/partitioning** (§8.4, §35), **consistent hashing** (§28.4), **geo-sharding/geo-partitioning** (§62.3), **Bloom filters** (§31.3), **hot key/hot partition mitigation** (Part V §91.B), **load balancing strategies** (§28.3), **sticky sessions** (Part V §91.E), **connection pooling** (§51.3), **backpressure** (§51.5, Part V §91.D) — all fully derived elsewhere in this handbook. "Write replicas" is worth one clarifying note: the term is sometimes used loosely, but a genuinely writable replica means either a multi-leader topology (rare, and reintroducing the full conflict-resolution machinery from §37.3-37.4) or geo-partitioned active-active (§62.4, §88.3) where each "replica" is actually the local leader for its own partition of data — recognizing which of these two very different things a given system means by "write replica" is the actual interview-relevant skill.

### 99.2 The Full Caching-Strategy Family, Compared

§39.3 covered write-through, write-back, and write-around. Placed alongside **cache-aside** and **read-through** — the two read-path strategies §39 didn't yet contrast directly — the complete family reads as one coherent decision space:

```
CACHE-ASIDE (a.k.a. lazy loading):
  Application checks cache directly.
  On miss: application itself queries the DB and populates
  the cache. On write: application writes to DB, then
  invalidates/updates the cache entry itself.
  -> Application owns the caching logic explicitly.

READ-THROUGH:
  Application only ever talks to the cache. On a miss, the
  CACHE ITSELF (not the application) queries the DB and
  populates itself before returning the result.
  -> Caching logic is centralized in the cache layer, not
     scattered across every calling application.

WRITE-THROUGH / WRITE-BEHIND / WRITE-AROUND: see §39.3.

REFRESH-AHEAD:
  The cache proactively refreshes a frequently-accessed,
  soon-to-expire entry BEFORE it actually expires (predicting
  continued demand from recent access frequency), so a request
  arriving right after the old TTL boundary never experiences
  a cold miss at all.
  -> Trades some wasted refresh work (for entries that turn
     out not to be requested again right after refreshing) for
     eliminating the "just expired, next request pays full
     miss cost" latency spike that plain TTL expiration causes.
```

**Decision framework**: cache-aside is the simplest and most common default, appropriate when application code can reasonably own its own caching logic. Read-through is preferable when many different applications/services share the same cache and you want caching behavior centralized and consistent rather than reimplemented per caller. Refresh-ahead is worth its added complexity specifically for a small number of extremely hot keys where even a brief, TTL-boundary cold-miss latency spike (directly connecting to the cache stampede risk from Part V §91.A) is unacceptable.

### 99.3 The Four Rate-Limiting Algorithms, Compared

§60.2 introduced token bucket and sliding window. Placed alongside leaky bucket and fixed window, the full, commonly-asked-about family:

```
FIXED WINDOW:
  Count requests in fixed calendar intervals (e.g., "100
  requests per minute, resetting on the minute").
  Problem: a client can send 100 requests in the last second
  of one window and another 100 in the first second of the
  next -- 200 requests in ~2 seconds, technically compliant
  with a "100/minute" limit. This boundary-burst flaw is the
  single most commonly-tested weakness of this algorithm.

SLIDING WINDOW:
  Count requests in a continuously-moving window (not
  reset at fixed calendar boundaries) -- directly closes
  Fixed Window's boundary-burst flaw (§60.2).

TOKEN BUCKET:
  Tokens accumulate at a steady rate up to a cap; each request
  consumes one token. Allows BURSTS up to the bucket's
  capacity while still enforcing a steady-state average rate
  over time (§60.2).

LEAKY BUCKET:
  Requests fill a bucket (queue) that "leaks" (processes
  requests) at a constant, fixed rate, regardless of how
  bursty the incoming request pattern is. Unlike Token Bucket,
  Leaky Bucket SMOOTHS bursty traffic into a perfectly steady
  output rate rather than allowing bursts through -- the
  correct choice when the downstream system genuinely cannot
  tolerate ANY burst, only a constant rate.
```

**Decision framework**: choose Sliding Window over Fixed Window whenever the boundary-burst flaw genuinely matters for your use case (it usually does). Choose Token Bucket when occasional legitimate bursts should be allowed through (a user who's been idle and suddenly makes several quick requests). Choose Leaky Bucket specifically when the downstream system needs a perfectly smoothed, constant-rate output regardless of input burstiness — the tell in an interview is whether the interviewer emphasizes "the backend absolutely cannot handle spikes" (Leaky Bucket) versus "occasional bursts from legitimate users are fine" (Token Bucket).

### 99.4 Autoscaling, Adaptive Concurrency, and Load Shedding

**Autoscaling** — already covered mechanically for Kubernetes specifically (HPA/VPA/Cluster Autoscaler, §69.4); named here as the general pattern: automatically adjusting deployed capacity (replica count, instance size, node count) in response to observed load, directly automating the horizontal/vertical scaling decisions from §18.4.

**Adaptive Concurrency Limiting** — *Problem*: a fixed, hardcoded concurrency limit (a fixed-size connection pool or thread pool, §51.3) is either too conservative (wasting available capacity during genuinely light load) or too permissive (allowing more concurrent work than the system can actually sustain once conditions degrade, e.g., a downstream dependency slows down). *Solution*: continuously measure actual request latency and adjust the allowed concurrency limit dynamically — shrinking it when latency indicates the system is becoming overloaded, growing it when latency indicates spare capacity — directly a real-time, automated instance of the Little's-Law-based capacity reasoning from §56.2, applied continuously rather than as a one-time, static calculation.

**Load Shedding** — *Problem*: when a system is genuinely overloaded beyond what any amount of queueing or backpressure (§51.5) can gracefully absorb, continuing to accept every incoming request degrades service for *all* of them, including ones that might otherwise have succeeded. *Solution*: deliberately and explicitly reject a portion of incoming requests (often the least valuable ones, by some priority scheme, §97.6's priority queue concept applied to admission control rather than processing order) once a load threshold is crossed, specifically to preserve acceptable service quality for the requests that *are* admitted — directly the brownout concept from Part V §91.A, now named as the specific admission-control mechanism that implements it.

### 99.5 Engineering Intuition

> **How do I know which caching strategy fits?** If one application owns the caching decision and logic, cache-aside is simplest and most common. If many services share one cache and consistency of caching *behavior* (not just data) matters across them, read-through centralizes that logic.
>
> **How do I know which rate-limiting algorithm an interviewer is actually asking about?** Listen for "bursts should be allowed" (Token Bucket) versus "output must be perfectly smooth" (Leaky Bucket) versus "just fix the boundary problem in our current fixed-window limiter" (Sliding Window).
>
> **What's the tell that Load Shedding, not just backpressure, is needed?** Backpressure (§51.5) still eventually processes every admitted request, just later — appropriate when delay is tolerable. Load Shedding is needed specifically when the system is overloaded severely enough that even delayed processing of every request would itself degrade service unacceptably for everyone.

### 99.6 Exercises

1. A rate limiter implemented with fixed one-minute windows is found to allow clients to send roughly double their intended limit by timing requests around the window boundary. Using §99.3, name the specific flaw and the algorithm that fixes it directly.
2. A payment gateway integration can only sustain a strictly constant request rate and fails if it receives even brief bursts above that rate, regardless of the average staying compliant. Using §99.3, choose the appropriate algorithm and explain why Token Bucket would be the wrong choice here.

---
