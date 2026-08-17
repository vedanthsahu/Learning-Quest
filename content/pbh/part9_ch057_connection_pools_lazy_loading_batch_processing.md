## 57. Connection Pools, Lazy Loading & Batch Processing

### 57.1 The Problem: This Chapter Revisits Three Earlier Mechanisms Specifically Through a Performance-Tuning Lens

§26 established connection pools architecturally (why they exist, how to size them for correctness and capacity), and §25.5/§30 established lazy loading and N+1 avoidance for correctness and query-count reduction. This chapter revisits both, plus introduces batch processing as a distinct pattern, specifically from the angle of squeezing measurable additional performance out of an already-correct system — the difference between "does this work" (earlier chapters) and "is this as fast as it reasonably can be" (this chapter).

### 57.2 Decision Framework: Connection Pool Metrics as Leading Performance Indicators, Not Just Capacity Alarms

Beyond §26.7's pool-timeout-as-capacity-signal, a pool's steady-state **utilization** (average checked-out connections relative to pool size) and **checkout wait time** (even when well under the hard timeout) are genuine, continuous performance signals worth tracking as their own metrics (companion §65) — a pool consistently running at 90%+ utilization with measurable, non-zero average checkout wait time is degrading every request's latency by a small, easy-to-overlook amount well before it ever produces an outright timeout error, making these softer, continuous metrics more valuable for proactive performance tuning than only alerting on the hard failure case.

### 57.3 Python Mechanism: Lazy Loading Beyond the ORM — Deferring Expensive Computation Until Genuinely Needed

Companion §25.5 covered ORM relationship lazy-loading specifically; the same principle generalizes to any expensive-to-compute attribute or property: Python's `functools.cached_property` computes a value on first access and caches it on the instance for the remainder of that instance's lifetime — useful for an expensive derived value (a computed summary statistic, a parsed/validated representation of raw data) that some code paths need and others don't, avoiding the cost entirely for the paths that never access it, while still avoiding *recomputing* it repeatedly for paths that access it multiple times.

### 57.4 Tradeoff: `cached_property`'s Per-Instance Caching vs. §35/§47's Cross-Request Caching

`cached_property` caches within a single object instance's lifetime only — for a value scoped to one request (companion §20's per-request dependency lifecycle), this is exactly the right granularity, avoiding redundant computation *within* that one request without any of the cross-request staleness concerns companion §47.5's cache-key-design discipline exists to manage. It is not a substitute for Redis-based caching (§35, §47) when the value should genuinely be shared and reused *across* multiple different requests — conflating the two (expecting `cached_property` to somehow persist a value between separate HTTP requests, which it cannot, since a fresh object instance is typically constructed per request) is a common, understandable point of confusion worth being explicit about.

### 57.5 Engineering Constraint: Many Small Operations Have More Overhead Than One Large Operation Covering the Same Work

Every database query, every HTTP call, every Redis operation carries fixed, per-call overhead (network round-trip, protocol parsing) independent of how much actual data that call carries — companion §30.5's N+1 fix (batching many small queries into one larger one via `= ANY(...)`) is one specific instance of a much more general principle: **batch processing**, replacing many small operations with fewer, larger ones, amortizes this fixed per-call overhead across more actual work, directly reducing total overhead cost even when the total amount of underlying work is identical.

### 57.6 Decision Framework: Batch Size Is Its Own Tunable Tradeoff, Not "Bigger Is Always Better"

A batch that's too small doesn't meaningfully amortize per-call overhead (barely better than no batching at all); a batch that's too large risks its own problems — a single oversized database query holding locks longer (companion §27.7's "keep critical sections short" principle, directly applicable), an oversized HTTP request body hitting a size limit (companion §41.7), or simply a longer individual-operation latency that delays the *first* item in the batch from being processed until the entire batch completes, which matters when downstream consumers need low per-item latency rather than only high aggregate throughput. Batch size, like connection pool size (§57.2) and cache TTL (companion §47), is a genuine, deliberately-tuned parameter, not a default to leave unexamined.

### 57.7 Implementation

```python
from functools import cached_property
import time

class BookingSummary:
    def __init__(self, raw_bookings: list[dict]):
        self._raw_bookings = raw_bookings

    @cached_property
    def total_confirmed(self) -> int:
        print("computing total_confirmed...")   # only prints ONCE, even if
        return sum(                                # accessed multiple times
            1 for b in self._raw_bookings if b["status"] == "CONFIRMED"
        )

    @cached_property
    def average_lead_time_days(self) -> float:
        print("computing average_lead_time_days...")   # NEVER computed at
        # ... expensive computation, e.g. parsing/aggregating dates ...       # all if this
        return 4.2                                                            # specific
                                                                                # property is
                                                                                # never
                                                                                # accessed


summary = BookingSummary(raw_bookings=[{"status": "CONFIRMED"}] * 100)
print(summary.total_confirmed)   # "computing total_confirmed..." printed
print(summary.total_confirmed)   # NOT printed again -- cached (§57.3)
# .average_lead_time_days never accessed here -- its cost is never paid at all


def batch_send_notifications(recipients: list[str], batch_size: int = 50):
    for i in range(0, len(recipients), batch_size):     # §57.5-57.6: ONE
        batch = recipients[i : i + batch_size]            # bulk call per
        send_bulk_notification_api_call(batch)             # batch, not one
                                                              # call per
                                                              # recipient

def send_bulk_notification_api_call(recipients): ...
```

`BookingSummary.total_confirmed` and `.average_lead_time_days` are both `cached_property`-decorated — `total_confirmed`'s computation prints exactly once despite being accessed twice, and `average_lead_time_days`'s computation never runs at all in this example since nothing ever accesses it, directly demonstrating §57.3's "pay only for what you actually use, and pay at most once per instance" behavior. `batch_send_notifications` groups recipients into fixed-size batches, issuing one bulk API call per batch rather than one call per individual recipient — directly §57.5's overhead-amortization principle, with `batch_size` as the explicit, tunable parameter §57.6 describes.

### 57.8 Production Considerations

`cached_property`'s per-instance caching means it provides no benefit (and adds a small, usually negligible overhead) for an object that's only ever accessed once per property per instance — it should be reserved for genuinely expensive computations accessed multiple times within a single instance's lifetime, not applied reflexively to every property regardless of actual reuse pattern. Batch size tuning (§57.6) should be validated with actual measurement (companion §52's load testing, or direct benchmarking against realistic data) rather than picked arbitrarily — the optimal batch size genuinely depends on the specific operation's per-call overhead relative to its per-item cost, a ratio that varies meaningfully across different operations (a database bulk insert's optimal batch size is not necessarily the same as an external API's bulk endpoint's optimal batch size) and should be tuned per operation, not assumed to transfer from one context to another.

### 57.9 Debugging

**Symptoms:** An object's expensive computed property is recomputed repeatedly within what should be a single logical operation, adding unnecessary latency; a bulk-processing operation sending many small individual API calls or database writes shows high total latency despite each individual call being fast on its own. **Investigation:** For repeated computation, check whether the property is a plain `@property` (recomputed every access) rather than `@cached_property` (§57.3-57.4), and confirm the caching granularity (per-instance) actually matches the intended reuse scope (within one request, not across separate requests). For the bulk-operation case, count actual individual calls made and compare against the theoretical minimum if batched (§57.5) — a large gap directly indicates unbatched, one-at-a-time processing paying unnecessary per-call overhead repeatedly. **Root cause:** A plain, uncached property recomputing expensive work on every access; an operation processing items one at a time when a bulk/batch interface was available and unused. **Fix:** Convert the property to `@cached_property` where per-instance reuse genuinely occurs; restructure the bulk operation to batch items into fewer, larger calls, tuning batch size against measured performance rather than an arbitrary default.

### 57.10 Interview Thinking

"You need to send a notification to 10,000 users — how would you do it efficiently?" is testing whether batching (§57.5-57.6) is your default answer over a naive per-user loop calling an external API 10,000 times — a strong answer also raises batch-size tuning as a genuine tradeoff (not simply "batch everything into one giant call"), correctly noting that an oversized single batch can introduce its own latency and reliability problems distinct from the unbatched approach's overhead problem.

### 57.11 Mini Lab

Implement `BookingSummary` with at least two `cached_property`-decorated properties as in §57.7, adding a print statement inside each to confirm computation frequency. Access one property three times and the other zero times, confirming via the print output that the accessed one computes exactly once and the unaccessed one never computes at all. Then implement `batch_send_notifications` against a stand-in bulk API function that also accepts a per-call overhead simulation (e.g., a fixed `time.sleep` per call regardless of batch size), and measure total time across a few different `batch_size` values (1, 10, 50, 500) to find the point of diminishing returns for your specific simulated overhead ratio.

---
