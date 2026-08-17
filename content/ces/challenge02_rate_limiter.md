## Project 02: Rate Limiter

### Problem Statement

A public API is being abused — a small number of clients are sending an overwhelming volume of requests, degrading service for everyone else. The business wants a way to cap how many requests any single client can make within a given time period, rejecting requests beyond that cap, without punishing well-behaved clients or meaningfully slowing down the API for anyone under the limit.

### Functional Requirements

- Reject requests from a client that has exceeded its allowed request count within a defined time window.
- Identify clients by an API key (assume every request carries one).
- Tell a rejected client how long to wait before trying again.
- Support different limits for different clients (e.g., a paying customer gets a higher limit than a free-tier one).

### Non-Functional Requirements

- **Latency**: the rate-limiting check itself must add negligible overhead to every request, since it runs on the hot path of *every single API call*, not just abusive ones.
- **Correctness under concurrency**: many requests from the same client can arrive at nearly the same instant — the limiter must not let more requests through than the limit allows just because they arrived simultaneously.
- **Scalability**: the API runs as multiple independent server instances — the limit must apply correctly across all of them combined, not per-instance.
- **Availability**: consider what should happen to API traffic if the rate limiter itself becomes unavailable.

### Project Scope

**In scope**: per-client request-count limiting within a time window, differentiated limits per client tier, informing clients of retry timing. **Out of scope**: limiting by IP address specifically, adaptive/ML-based abuse detection, limiting by response size or computational cost rather than request count.

### Engineering Questions (Answer Them Yourself First)

- If two requests from the same client arrive within a single millisecond of each other, what has to happen for both to be correctly counted?
- Given that this check runs on every request across multiple server instances, where does the "current count" for a client actually need to live?
- What's the difference between allowing exactly N requests in every rolling window versus allowing N requests in fixed, clock-aligned windows (e.g., every minute on the minute)? Does it matter?
- If your rate-limiting mechanism itself becomes slow or unavailable, should API traffic fail, or should it be let through unchecked?

### Architecture Thinking

Sketch the request path for a single incoming API call, showing exactly where the rate-limit check happens relative to the rest of request processing. Then sketch what happens when 50 requests from the same client arrive within the same 10 milliseconds, across 3 different server instances simultaneously — does your design correctly reject the 51st (assuming a limit of 50), or could a race condition let more through? Estimate: if a single client tier allows 1,000 requests per minute, and you have 10,000 active clients, how large does whatever stores "current count per client" actually need to be?

### Progressive Hint System

**Level 1**: Think about what "check the count, then increment it" as two separate steps could go wrong under concurrency — is there a way to make it one step instead? **Level 2**: Look into atomic operations provided by fast, shared, external data stores — what does "atomic" actually buy you here that doing the check-then-increment in your own application code doesn't? **Level 3**: Research fixed-window versus sliding-window versus token-bucket rate-limiting algorithms specifically, and consider what a fixed window's edge-of-window behavior looks like under a burst. **Level 4**: A common, effective design uses Redis's atomic `INCR` command against a key representing (client, current time window), with the key's expiration set to the window length — this makes the check-and-increment atomic by construction rather than requiring separate application-level locking.

### Common Engineering Traps

- **Checking the current count, then separately incrementing it as two distinct operations** — under what specific circumstance does this let more requests through than the intended limit?
- **Storing rate-limit counts in each server instance's own local memory** — what happens to the effective limit once there's more than one server instance?
- **Using a fixed window aligned to clock boundaries (e.g., always resetting at the top of the minute) without considering burst behavior at the boundary** — can a client send double the intended limit by timing requests around a window edge?
- **Letting a rate limiter failure silently block all API traffic** — is this always the right failure mode, or does it depend on what the API actually does?

### Reflection Questions

- Would your design behave differently for a client sending exactly 1 request per second sustained versus a client sending 60 requests in the first second of every minute? Should it?
- If the underlying data store your rate limiter depends on goes down, have you deliberately chosen fail-open or fail-closed behavior, or did you not think about it until now?
- How would you test that your rate limiter behaves correctly under real concurrency, not just sequential test calls?

### Completion Checklist

- [ ] I can explain why "check-then-increment" is a race condition and what makes an alternative atomic.
- [ ] I have a specific answer for how the limit is enforced consistently across multiple server instances.
- [ ] I have considered burst behavior at window boundaries and decided whether it matters for this use case.
- [ ] I have explicitly chosen fail-open or fail-closed behavior for when the rate limiter's own dependency is unavailable.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
