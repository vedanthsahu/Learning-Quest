## Project 02: Rate Limiter — Solution Guide

### Business Reasoning

The business goal is protecting shared service capacity from being monopolized by a small number of clients, while remaining invisible to well-behaved clients under the limit. The core engineering tension is that the mechanism protecting the API from overload must itself add essentially zero overhead — a rate limiter that's slow defeats its own purpose by becoming a new bottleneck on every single request.

### Requirements Analysis

The functional requirements (cap requests per client, differentiate by tier, communicate retry timing) are straightforward. The genuinely hard requirement is correctness under concurrency across multiple server instances — this single requirement eliminates any design based on a server's own local, in-process memory, since that memory isn't shared across instances at all.

### Architecture

```
Request -> [extract API key] -> [atomic check-and-increment against a SHARED counter]
         -> under limit: proceed to normal request handling
         -> over limit: reject with 429 + Retry-After header
```

### Tradeoff Discussion

**Fixed window vs. sliding window vs. token bucket.** A fixed window (e.g., "N requests per calendar minute") is the simplest to implement and reason about, but allows a burst of up to 2N requests across a window boundary (N at the end of one window, N immediately at the start of the next) — a real gap if burst prevention specifically matters. A sliding window (a rolling N requests in the trailing 60 seconds, regardless of clock alignment) closes this gap but requires tracking individual request timestamps, not just a count, adding storage and computation cost. A token bucket (tokens accumulate at a steady rate up to a cap, each request consumes one) smooths bursts naturally and is the standard choice when burst-smoothing genuinely matters, at moderate additional implementation complexity over a fixed window.

**Where the shared counter lives.** An external, shared, fast data store (Redis) is effectively required once multiple server instances must agree on one count — the alternative, a dedicated internal rate-limiting *service* that all instances call, adds an extra network hop per request for no benefit over a well-chosen shared store directly.

### Alternative Designs Considered and Rejected

**Rate limiting via a shared relational database counter with row-level locking.** Rejected — a relational database's locking overhead, applied on every single API request, would itself become a meaningful latency and throughput bottleneck; this is precisely the kind of workload Redis's in-memory, atomic-operation design exists for. **Client-side self-throttling (trusting clients to rate-limit themselves).** Rejected outright — the entire premise of this project is that some clients are not behaving well; a limiter that depends on client cooperation offers no actual protection against the abuse case that motivated the project.

### Chosen Design

Fixed-window counting using Redis's atomic `INCR` command, keyed by `(client_id, current_window)`, with the key's TTL set to the window duration so expired windows clean themselves up automatically. Fixed window is chosen over sliding window or token bucket specifically because the stated requirements (§ Non-Functional Requirements) don't call for strict burst-smoothing — matching design complexity to actual stated need (Python Backend Engineering Handbook §108.10's proportionality principle) rather than defaulting to the most sophisticated algorithm available.

### Implementation Walkthrough

```python
async def is_allowed(client_id: str, limit: int, window_seconds: int, redis) -> tuple[bool, int]:
    now = int(time.time())
    window = now // window_seconds
    key = f"ratelimit:{client_id}:{window}"

    count = await redis.incr(key)             # atomic check-and-increment in ONE operation
    if count == 1:
        await redis.expire(key, window_seconds)   # only set TTL on first request in this window

    if count > limit:
        retry_after = window_seconds - (now % window_seconds)
        return False, retry_after
    return True, 0

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_id = request.headers.get("X-API-Key")
    limit = get_limit_for_tier(client_id)      # differentiated per-client limits
    allowed, retry_after = await is_allowed(client_id, limit, 60, redis_client)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"},
            headers={"Retry-After": str(retry_after)},
        )
    return await call_next(request)
```

`redis.incr` is atomic — there is no separate "check" step that could race against another concurrent request's increment, directly closing the challenge's first named trap (check-then-increment as two separate, racy operations). Setting the TTL only on `count == 1` avoids resetting the expiration on every single request, which would otherwise prevent the window from ever actually expiring under sustained traffic.

### Production Improvements

Fail open (allow requests through) if Redis itself becomes unreachable, logging the failure loudly — for most APIs, briefly allowing unrestricted traffic during a Redis outage is preferable to taking down the entire API because its protective layer failed (Python Backend Engineering Handbook §76's hung-worker-style reasoning about a missing dependency, applied here to a deliberate fail-open policy choice rather than a bug). Add per-endpoint limits in addition to per-client limits, since a single expensive endpoint may warrant a stricter cap than a cheap one even for the same client.

### Scaling Path

At very high request volume, a single Redis instance's own throughput can itself become the constraint — at that point, sharding rate-limit keys across a Redis Cluster, or moving to a local-approximate-plus-periodic-sync design (each instance tracks an approximate local count and periodically reconciles with a shared store), trades a small amount of limit precision for substantially reduced coordination overhead.

### Interview Discussion

See Python Backend Engineering Handbook §94.2 for this exact system walked through the five-phase interview framework — the deep-dive phase for this question almost always centers on the atomic-increment mechanism and the fixed-window-versus-token-bucket tradeoff discussed above.

### Lessons Learned

The core lesson is that "make it atomic" is usually a cheaper, more robust fix for a concurrency problem than "add a lock around the non-atomic version" — reaching for a primitive that's atomic by construction (Redis's `INCR`) eliminates an entire class of race condition rather than merely narrowing the window in which it can occur. This same preference — atomic primitives over hand-rolled locking — recurs in Project 11 (Distributed Lock Service).

---
