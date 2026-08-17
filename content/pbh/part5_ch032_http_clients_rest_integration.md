## 32. HTTP Clients & REST Integration

### 32.1 The Problem: Your Backend Is Also Someone Else's Client

Every chapter so far treated your backend as the server receiving requests. A real backend is almost always *also* a client — calling a payment provider, an internal microservice, a third-party data source (the actual Seat Management backend's Microsoft Graph integration, §sso.py, is a direct example). Every failure mode a client of *your* API can trigger (companion §15's timeouts, backpressure) is symmetrically something *your* backend must defend against when calling someone else's.

### 32.2 Decision Framework: `httpx` Over `requests` for Any Async Codebase

`requests` is a mature, widely-used HTTP client library, but it is purely synchronous — calling it directly inside `async def` code hits exactly §11.2's event-loop-blocking trap. `httpx` provides essentially the same familiar API while natively supporting async (`async with httpx.AsyncClient() as client: await client.get(...)`), making it the correct default choice for any FastAPI/async codebase, while `requests` remains perfectly fine for purely synchronous scripts or worker processes (companion §37) with no event loop to protect.

### 32.3 Engineering Constraint: Reuse a Client Instance; Don't Construct One Per Request

An HTTP client object internally manages its own connection pool (directly analogous to §26.2's database connection pool) — constructing a fresh `httpx.AsyncClient()` for every single outgoing call discards that pooling benefit entirely, paying a new TCP/TLS handshake cost on every call instead of reusing an already-established connection to the same host. The correct pattern mirrors §17.3's lifespan-scoped resource discipline exactly: construct one client at application startup, store it on `app.state`, and reuse it across every request needing to make that kind of outbound call.

### 32.4 Decision Framework: Every Outbound Call Needs an Explicit Timeout and a Defined Retry Policy

§15.3-15.4 already established that every external call needs an explicit timeout — HTTP calls to third-party services are the single most common concrete instance of this principle in practice, since third-party services are entirely outside your control and can be slow or unresponsive for reasons you'll never directly observe. A **retry policy** for transient failures (a connection reset, a 503) should use exponential backoff with jitter (companion §64.5's exact real-incident-derived guidance) — and critically, retries must never be applied blindly to *every* failure: a 400 (client error — the request itself was malformed) should never be retried unchanged, since retrying an inherently-invalid request only wastes time and load without any chance of success, while a 503 (transient server unavailability) is a legitimate retry candidate.

### 32.5 Python Mechanism: Idempotency Keys Make Retries Safe for Non-Idempotent Operations

A `GET` request is naturally **idempotent** (calling it multiple times has the same effect as calling it once) — safe to retry freely. A `POST` creating a resource (a payment charge, a booking) is not naturally idempotent — retrying it blindly risks creating duplicates, directly companion §110.2's real payment-retry incident. The fix, established there and now given its client-side implementation: generate a unique idempotency key once per logical operation and send it with every attempt (including retries) of that same operation, so the receiving service can recognize and safely ignore a duplicate delivery of what it's already processed.

### 32.6 Implementation

```python
import httpx
import asyncio
import uuid

async def call_with_retry(
    client: httpx.AsyncClient,
    url: str,
    *,
    json_payload: dict,
    max_attempts: int = 3,
) -> httpx.Response:
    idempotency_key = str(uuid.uuid4())          # ONE key for this whole
                                                    # logical operation (§32.5),
                                                    # reused across every retry

    last_exception: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            response = await client.post(
                url,
                json=json_payload,
                headers={"Idempotency-Key": idempotency_key},
                timeout=5.0,                        # explicit, per-call (§32.4)
            )
            if response.status_code < 500:
                return response                     # success OR a client
                                                       # error -- NEVER retry
                                                       # a 4xx blindly (§32.4)
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            last_exception = exc

        if attempt < max_attempts:
            backoff = 0.5 * (2 ** (attempt - 1))      # exponential backoff
            await asyncio.sleep(backoff)               # (§32.4, companion §64.5)

    raise last_exception or RuntimeError("Exhausted retries with only 5xx responses")


# Constructed ONCE, at application startup (§32.3), reused across all calls:
# app.state.http_client = httpx.AsyncClient()
```

The `idempotency_key` is generated exactly once, outside the retry loop, and reused on *every* attempt — this is what lets the receiving service recognize "this is attempt #2 of the same operation," not "a new operation" (§32.5). The `if response.status_code < 500: return response` line is the concrete implementation of §32.4's non-negotiable rule: a 4xx response returns immediately (it's a definitive, non-retryable outcome) while only a connection failure or a 5xx triggers the backoff-and-retry path.

### 32.7 Production Considerations

A retry policy without a maximum attempt cap and without backoff is precisely the retry-storm mechanism companion §64's real incident case study describes — under a genuine, sustained outage of a downstream dependency, unbounded or un-backed-off retries from every calling instance compound into a self-inflicted traffic multiplication that can make the outage worse and can extend it well past when the dependency itself would have recovered. Companion §67's circuit breaker pattern is the natural complement to this chapter's retry logic: after enough consecutive failures, a circuit breaker stops attempting calls at all for a cooldown period, rather than continuing to retry (with backoff) against a dependency that's clearly, sustainedly down — retries handle brief, transient blips; circuit breakers handle sustained outages, and a mature client uses both together, not one instead of the other.

### 32.8 Debugging

**Symptoms:** A downstream integration occasionally creates duplicate records (a duplicate charge, a duplicate booking) specifically correlated with network flakiness or timeouts; calling a flaky third-party dependency under load makes an outage measurably worse rather than the application degrading gracefully. **Investigation:** For duplicates, check whether the retry logic sends an idempotency key, and whether the *same* key is reused across retries of one logical operation or a new one is generated per attempt (defeating the entire mechanism). For the retry-storm case, check whether retries have both a maximum attempt count and exponential backoff, or retry immediately and indefinitely. **Root cause:** A missing or incorrectly-regenerated idempotency key allowing the receiving service to treat each retry as a new operation; unbounded, non-backed-off retries amplifying load onto an already-struggling dependency. **Fix:** Generate the idempotency key once per logical operation, before any retry attempts begin, and reuse it identically across all of them; add exponential backoff with a defined maximum attempt count to every retry loop.

### 32.9 Interview Thinking

"Your service calls a payment provider that occasionally times out — how do you handle retries safely?" is testing whether idempotency keys (§32.5) are part of your answer, not just "retry with backoff" alone — a strong answer explicitly connects the timeout/retry mechanism to the duplicate-charge risk it would otherwise create, since interviewers use this prompt specifically to check whether retry logic and idempotency are reasoned about together, not as two unrelated topics.

### 32.10 Mini Lab

Using `httpx.AsyncClient` against a small local FastAPI "flaky dependency" endpoint you write yourself (one that randomly returns a 503 roughly half the time, and otherwise echoes back an `Idempotency-Key` header it received), implement `call_with_retry` as in §32.6. Confirm it eventually succeeds despite the flakiness, and add a counter on the server side confirming it only ever processes each unique idempotency key's "real" effect once, even across multiple retried attempts carrying that same key.

---
