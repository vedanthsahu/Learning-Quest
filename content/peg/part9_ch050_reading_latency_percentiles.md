## §50. Reading Latency: p50/p95/p99 and Why Averages Lie

### 1. The Vocabulary

- **p50 (median)** — half of all requests were faster than this, half slower.
- **p95 / p99** — 95% (or 99%) of requests were faster than this — the tail, where the worst
  (but not rarest-outlier) experiences live.
- **Average (mean) latency** — the sum divided by the count — easily distorted by a small number
  of very slow outliers, or hidden by a large number of very fast ones.
- **Tail latency** — the slow end of the distribution, disproportionately experienced by users
  making the most requests, or hitting the least-cached/least-optimized paths.

### 2. Where It Sits, and Why Teams Use It

Averages actively hide the experience that matters most: if 99% of requests take 50ms and 1% take
5 seconds, the average might look like a perfectly reasonable 100ms, while a meaningful chunk of
real users are having a genuinely bad time. Percentiles are how you see that.

### 3. What Actually Breaks

- **Reporting only average latency** — a slow database query affecting 2% of requests can be
  completely invisible in an average, while showing up glaringly at p95 or p99.
- **Chasing p50 improvements while p99 is the actual problem** — optimizing the typical case
  further when the tail is what's driving complaints and timeouts is effort spent in the wrong
  place.
- **Not realizing p99 at scale still means a lot of real people** — "only 1%" sounds small until
  you multiply it by a million requests a day — that's 10,000 bad experiences daily, not a
  rounding error.
- **A single slow dependency degrading everyone's tail latency** — if 1% of calls to a downstream
  service are slow, and every request calls that service, that 1% can show up as elevated p99 for
  effectively all users over time, not just an unlucky 1% of specific people.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I look at p95/p99, not just average, because averages can hide a real, meaningful slice of bad
  experiences."
- "p99 at real scale still represents a lot of actual requests — I don't dismiss it as a rounding
  error just because the percentage sounds small."
- "If p50 is fine but p99 is bad, that's usually a specific slow path or dependency, not a
  general capacity problem — I'd look for what's different about the slow requests specifically."

### 5. Interview-Ready Answer

> "Average latency can hide exactly the experience that matters — a small number of very slow
> requests can be invisible in an average while still representing a meaningful number of real
> users at scale. I look at p95 and p99 specifically, and if there's a gap between p50 being fine
> and p99 being bad, I treat that as a signal there's a specific slow path or dependency to find,
> not a general 'add more capacity' problem."

### 6. Go Deeper

companion Software Systems Handbook's §50 (Performance Engineering Deep Dive) chapter (latency
percentiles, tail latency, benchmarking methodology in full).

---
