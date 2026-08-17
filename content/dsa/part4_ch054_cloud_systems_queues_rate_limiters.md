## §54. Cloud Systems: Priority Queues, Work Queues & Rate Limiters

### 1. Decision Snapshot

Cloud task/work-queue systems combine **Queues** (§5) and **Priority Queues** (§16-17) for
ordering pending work, and **rate limiters** built on the Sliding Window (§31) and token-bucket
techniques to enforce "no more than N requests per time period" against APIs and shared
resources.

### 2. The Problem This System Had to Solve

Cloud systems must accept bursty work without dropping it (motivating durable work queues),
prioritize urgent work over background work (motivating priority queues), and protect shared
resources — APIs, databases, downstream services — from being overwhelmed by too many requests
too quickly (motivating rate limiting), all while remaining cheap to check on every single
request.

### 3. Which Structures It Uses, and Why

**Work queues** (SQS-style, conceptually §5/§14) decouple producers from consumers, letting a
burst of incoming work queue up durably instead of overwhelming consumers directly. Where
priority matters (a paying customer's job before a free-tier job), a **priority queue** (§16-17)
orders pending work by urgency instead of pure arrival order. **Rate limiting** — deciding
whether to accept or reject the *current* request given how many recent requests already
happened — has two standard implementations worth contrasting: a **sliding window counter**
(directly §31's technique, tracking request timestamps in the last N seconds) gives an exact,
precise count but costs more memory (must track individual timestamps or sub-window buckets); a
**token bucket** (a counter that refills at a fixed rate and is decremented per request, rejecting
requests once empty) is cheaper to maintain (just one counter and a last-refill timestamp) and
naturally allows short bursts up to the bucket's capacity, which a strict sliding window does not.

### 4. Simplified Architecture Diagram

```
Rate limiter: token bucket, capacity=10, refill=2 tokens/second

  bucket: [ 10 tokens ]  <- full at start

request arrives -> bucket has tokens? yes -> take 1 token, allow request -> bucket: [9]
... (5 requests in quick succession) ...    -> bucket: [4]
1 second passes -> refill +2 tokens          -> bucket: [6]
request arrives, bucket empty (after a burst) -> REJECT (429 Too Many Requests)

Sliding window counter (§31) alternative, window=60s, limit=100:
  requests_in_last_60s = [ts1, ts2, ..., ts_k]
  new request: drop timestamps older than 60s, then check len(requests) < 100
```

### 5. What This Teaches You in General

Rate limiting is a direct, practical application of the Sliding Window technique (§31) taught
purely as an array/string algorithm earlier in this book — the same "maintain a valid range,
expand and shrink its boundary incrementally" idea, just applied to timestamps instead of array
indices. Recognizing that a "cloud engineering" concept and a "core algorithms" chapter are
actually the same underlying technique is the exact kind of cross-referencing this book is built
around.

### 6. Interview Questions This Connects To

"Design a rate limiter" is an extremely common systems-design interview question — a strong
answer names both the token bucket and sliding window approaches and explicitly discusses their
tradeoff (burst tolerance and memory cost vs. exactness). "Design a task queue with priority
support" points directly at combining §5 and §16-17. "How would you protect a downstream service
from being overwhelmed" is the practical framing of the same rate-limiting problem in a
systems-design context.

### 7. Key Takeaways

- Cloud work queues combine plain queues (§5) for durability/decoupling with priority queues
  (§16-17) when urgency must override arrival order.
- Rate limiting has two standard implementations — sliding window counters (exact, more memory)
  and token buckets (approximate but cheaper, naturally burst-tolerant) — know the tradeoff
  between them, not just one.
- Rate limiting is a direct, practical real-world instance of the Sliding Window technique (§31)
  — not a separate concept requiring new algorithmic machinery.
- "Design a rate limiter" is one of the most common systems-design interview prompts this book
  prepares you for directly.

---
