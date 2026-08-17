## 61. Rate Limiting & Abuse Prevention

### 61.1 The Problem: Assembling Companion §35's Redis Primitives and Companion §60.2's Algorithms Into an Actual FastAPI Defense

The companion Software Systems Handbook's §60.2/§99.3 already taught the rate-limiting algorithm family (token bucket, sliding/fixed window) in full conceptual depth, and §35's Redis chapter provided the distributed-coordination primitives. This chapter is specifically the FastAPI-native assembly of both — a real, working middleware/dependency implementing distributed rate limiting correctly, plus abuse-prevention patterns that go beyond simple per-request rate limiting.

### 61.2 Decision Framework: Rate Limiting as Middleware vs. as a Per-Route Dependency

Rate limiting applied uniformly to every request (companion §19.3's middleware-appropriate case) fits as middleware — a global request-volume cap regardless of which specific endpoint is hit. Rate limiting that needs to vary by endpoint (a stricter limit on `/bookings` POST than on `/sites` GET, since creating a booking is more expensive and more abuse-prone than listing sites) fits better as a per-route dependency (companion §20.3's selective-application case) — directly the same middleware-versus-dependency decision framework companion §19.3 established generally, now applied specifically to rate limiting.

### 61.3 Python Mechanism: Distributed Rate Limiting via Redis, Correctly Handling the Race Condition

A rate limiter shared across multiple application instances (companion §16.8) must coordinate through Redis (§35.5's exact distributed-lock mechanism, adapted here for counting rather than mutual exclusion) — and, critically, the check-and-increment operation must be atomic to avoid the same race condition companion §14.1 warned about generally: two nearly-simultaneous requests both reading "9 requests so far, limit is 10" and both proceeding, when only one of them should have been allowed to push the count to 10. Redis's `INCR` command is itself atomic, and combining it with an expiring key (`EXPIRE`) implements a correct, race-free fixed-window counter without needing an explicit application-level lock at all.

### 61.4 Decision Framework: Fixed-Window's Boundary Burst Problem, and the Sliding-Window-Log Fix

A fixed-window counter (§61.3) resets sharply at each window boundary — a client sending its full allowed quota in the last second of one window and again in the first second of the next window effectively achieves double the intended rate within a brief two-second span straddling the boundary, precisely the edge case companion §28.7's load-balancing-adjacent discussion of naive algorithms warns about generally. A **sliding-window-log** approach (storing a timestamp per request in a Redis sorted set, and counting only entries within the trailing window on each check) avoids this boundary-burst problem entirely at the cost of more Redis memory (one entry per request, not just one counter) and slightly more complex per-request logic — the right upgrade specifically once the fixed-window's boundary-burst behavior is confirmed to be a real, exploitable problem for the specific endpoint being protected, not a default to reach for universally regardless of actual need.

### 61.5 Engineering Constraint: Rate Limiting Alone Doesn't Stop a Sufficiently Distributed Attacker

A per-IP or per-user rate limit is straightforward to bypass for an attacker controlling many IP addresses or many accounts (a botnet, or simple account-creation abuse) — genuine abuse prevention beyond basic rate limiting requires additional signals: anomaly detection on request patterns (a sudden, unusual spike in account-creation from related IP ranges), CAPTCHA challenges at suspicious thresholds, and, for the specific case of authentication endpoints, exponential lockout delays after repeated failures (distinct from and complementary to rate limiting, specifically targeting credential-stuffing/brute-force attempts rather than general volume abuse).

### 61.6 Implementation

```python
import redis.asyncio as redis
from fastapi import FastAPI, Request, HTTPException, Depends

app = FastAPI()
redis_client = redis.Redis(host="localhost", decode_responses=True)


def rate_limit(max_requests: int, window_seconds: int):
    async def checker(request: Request):
        client_id = request.client.host           # or, better, an authenticated
                                                      # user_id where available
        key = f"ratelimit:{client_id}:{request.url.path}"

        # §61.3: atomic INCR avoids the check-then-increment race entirely --
        # no separate application-level lock needed
        current = await redis_client.incr(key)
        if current == 1:
            await redis_client.expire(key, window_seconds)   # only set TTL
                                                                # on the FIRST
                                                                # request in a
                                                                # new window

        if current > max_requests:
            ttl = await redis_client.ttl(key)
            raise HTTPException(
                429,
                detail="Rate limit exceeded",
                headers={"Retry-After": str(ttl)},   # tells the client
            )                                          # EXACTLY when to retry
    return checker


@app.post("/bookings", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
async def create_booking():
    return {"status": "created"}


@app.post("/auth/login")
async def login(request: Request):
    client_id = request.client.host
    failure_key = f"login_failures:{client_id}"
    failures = int(await redis_client.get(failure_key) or 0)

    if failures >= 5:
        # §61.5: exponential lockout, distinct from and stricter than the
        # general rate limit above -- targets credential-stuffing specifically
        raise HTTPException(429, detail="Too many failed attempts, try again later")

    # ... actual login logic; on failure:
    # await redis_client.incr(failure_key)
    # await redis_client.expire(failure_key, 300 * (2 ** min(failures, 4)))  # exponential
```

`rate_limit(max_requests, window_seconds)` is a dependency factory (companion §20.6's exact pattern) letting different routes declare different limits — `/bookings` gets its own specific, stricter limit here, distinct from whatever limit might apply elsewhere, directly implementing §61.2's per-route decision. The `INCR`-then-conditionally-`EXPIRE` sequence is Redis's standard, race-free fixed-window pattern (§61.3) — `current == 1` reliably identifies "this is the first request in a fresh window" specifically because `INCR` on a non-existent key atomically creates it at value 1, with no window where two concurrent requests could both observe "the key doesn't exist yet" and both attempt to initialize it. The separate `login_failures` tracking with exponential backoff demonstrates §61.5's complementary, attack-specific defense — distinct in purpose and mechanism from the general-purpose rate limiter, even though both are Redis-backed counters.

### 61.7 Production Considerations

The `Retry-After` header (§61.6) is a genuine, standard HTTP mechanism telling well-behaved clients exactly when to retry — client-side code (companion §32.4's retry logic) should respect it rather than retrying immediately or on a fixed, uncoordinated schedule, directly avoiding the retry-storm risk companion §64's real-incident case study describes if many rate-limited clients all retry simultaneously without honoring this signal. Rate-limit thresholds should be informed by actual, measured legitimate traffic patterns (companion §52's load testing) rather than picked arbitrarily — a limit set too aggressively rejects genuine users during normal peak usage, while a limit set too loosely provides little real protection against genuine abuse; this is a threshold worth revisiting periodically as real usage patterns evolve, not a one-time decision.

### 61.8 Debugging

**Symptoms:** Legitimate users occasionally receive 429 rate-limit responses during normal, expected usage patterns; a rate limiter that should prevent abuse appears to be circumvented, with abusive traffic continuing unimpeded. **Investigation:** For legitimate-user rejections, compare the configured limit against actual measured peak legitimate traffic for that specific endpoint (§61.7) — a limit set without this data is a common root cause. For circumvented abuse, check whether the rate-limiting key is based on a dimension the attacker can trivially vary (a raw IP address, easily rotated across many addresses) rather than a more attacker-resistant dimension (an authenticated user ID, or a combination of signals per §61.5). **Root cause:** A rate limit threshold set without reference to real legitimate-traffic data; a rate-limiting key dimension too easily varied by a determined, distributed attacker. **Fix:** Re-tune the threshold using measured legitimate-traffic percentiles as the baseline; strengthen the limiting key (prefer authenticated user ID over IP where available) and layer additional abuse-detection signals (§61.5) beyond simple volume-based rate limiting for endpoints facing genuinely sophisticated abuse.

### 61.9 Interview Thinking

"How would you implement rate limiting that works correctly across multiple server instances?" is testing whether Redis-backed, atomic counting (§61.3) is your default answer, with explicit attention to the check-then-increment race condition companion §14.1 warns about generally — a strong answer names the specific atomic primitive (`INCR`) that avoids needing an explicit application-level lock, rather than proposing a naive read-then-write approach that reintroduces the exact race the atomic operation exists to prevent.

### 61.10 Mini Lab

Implement `rate_limit` as in §61.6 against a local Redis instance, applied to a small test endpoint with a low limit (5 requests per 10 seconds) for easy manual testing. Send 7 requests in quick succession and confirm the first 5 succeed while the 6th and 7th correctly return 429 with a `Retry-After` header. Wait past the window and confirm requests succeed again. Then fire many genuinely concurrent requests (using `asyncio.gather` or multiple threads) right at the limit boundary and confirm the atomic `INCR` correctly allows exactly the configured limit through, with no race-condition-driven over-admission, even under real concurrency.

---
