## §162. Rate Limiting Algorithms and Where Limits Live

### 1. The Vocabulary

- **Fixed window** — count requests in a fixed time bucket (e.g., per calendar minute); simple, but
  allows a burst of 2x the limit right at the window boundary (end of one window plus start of the
  next, back to back).
- **Sliding window** — counts requests in a continuously moving window rather than a fixed bucket,
  fixing the boundary-burst problem at the cost of slightly more computation/state to track.
- **Token bucket** — a bucket holds tokens, refilled at a steady rate; each request consumes a
  token, and requests are rejected when the bucket is empty — naturally allows brief bursts (up to
  the bucket's capacity) while still enforcing a long-run average rate.
- **Leaky bucket** — requests fill a queue that drains ("leaks") at a fixed rate; smooths bursty
  traffic into a steady outflow, prioritizing smoothness over allowing bursts through at all.

### 2. Where It Sits, and Why Teams Use It

Choosing an algorithm is a real, if usually small, design decision: fixed window is the simplest to
reason about and implement (often with a single Redis counter and TTL) and is fine when the
boundary-burst edge case doesn't matter much. Token bucket is the most commonly reached-for
algorithm in practice because it naturally accommodates legitimate bursty behavior — a user opening
several tabs at once — while still capping sustained rate. Leaky bucket is chosen specifically when
smoothing output rate matters more than permitting bursts (e.g., protecting a downstream system
that genuinely can't handle spikes at all).

**Where limits live**, from outermost to innermost: API Gateway or CDN edge (cheapest to reject
early, protects everything behind it), load balancer/reverse proxy, application middleware
(per-user or per-endpoint logic that needs application context), a Redis-backed counter (shared
state across multiple application instances), and third-party provider quotas (a limit you don't
control at all, just have to respect and handle gracefully, §71).

### 3. What Actually Breaks

- **Fixed window's boundary-burst problem, unaccounted for** — a client sending a full window's
  worth of requests right at the end of one window and again right at the start of the next
  effectively gets 2x the intended limit in a short span — fine for loose limits, a real problem
  for strict ones.
- **Per-instance rate limiting without shared state** — if each application instance tracks its
  own counter independently, a client can get away with (limit × number of instances) requests by
  hitting different instances — a Redis-backed shared counter fixes this.
- **Rate limiting only at one layer** — relying solely on application-level limiting means a flood
  of traffic still reaches and loads the application before being rejected; limiting earlier
  (gateway/CDN) rejects cheaply, before consuming real application resources.
- **Not distinguishing per-user, per-IP, and global limits** — a single global limit can let one
  abusive user starve everyone else; per-user or per-API-key limits are usually the more useful
  granularity for fairness.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I default to token bucket for most rate limiting, since it naturally tolerates legitimate
  bursts while still capping the sustained rate."
- "I rate-limit as early as possible — gateway or CDN first — so abusive traffic is rejected
  before it costs real application resources."
- "I make sure rate-limit state is shared (like in Redis) across instances, not per-instance, so
  the effective limit doesn't scale with server count."

### 5. Interview-Ready Answer

> "For most APIs I default to a token bucket algorithm, since it allows brief legitimate bursts
> while still enforcing a long-run rate, which fits real user behavior better than a strict fixed
> window. I place rate limiting as early as possible — ideally at the gateway or CDN edge — so
> abusive traffic gets rejected before it costs real application resources, and I back the counter
> with shared state like Redis so the effective limit doesn't quietly multiply by the number of
> running instances."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §61 (Rate Limiting & Abuse Prevention) chapter
and companion DSA Engineering Handbook's §54 (Cloud Systems: Priority Queues, Work Queues & Rate
Limiters) chapter for full algorithm implementation and distributed-counter patterns; this book's
§161 (rate limiting vs throttling vs debouncing) for the surrounding vocabulary and §71 (service
quotas/throttling) for third-party provider limits specifically.

---
