## Project 01: URL Shortener — Solution Guide

### Business Reasoning

The business need is simple: make long links short and trackable. What makes this a genuine engineering problem rather than a trivial one is the access pattern — a link is created once and then potentially visited thousands or millions of times. Every design decision in a good solution flows from taking that asymmetry seriously rather than treating creation and redirection as symmetric operations.

### Requirements Analysis

The functional requirements are modest: create, redirect, count visits, allow custom aliases. The interesting requirements are non-functional: redirect latency must be very low (a redirect is on the critical path of someone else's link click, often embedded in marketing material where a slow redirect looks broken), and the system must tolerate read volume far exceeding write volume. This immediately suggests the design should be evaluated primarily on its *read* path performance, with the write path allowed to be comparatively simple.

### Architecture

```
Create:  Client -> API -> [generate/validate code] -> Database (source of truth)
Redirect: Client -> API -> Cache (hot path) -> Database (cache miss fallback) -> 302 redirect
Visit count: incremented asynchronously, off the redirect's critical path
```

### Tradeoff Discussion

**Short-code generation**: base62-encoded auto-incrementing ID versus random string with collision check. An incrementing ID needs zero collision checking (a strict monotonic sequence can never collide with itself) and generates instantly, but reveals creation order and total link volume to anyone who can guess adjacent codes — a real information leak for a business that may not want competitors inferring their marketing link volume. A random string requires a uniqueness check against existing codes on every creation, an increasingly expensive check as the total number of codes grows (this is the challenge's first named trap), but reveals no ordering information at all.

**Caching strategy**: cache-aside (check cache, fall through to database on miss, populate cache) versus write-through (populate cache at creation time). Cache-aside is simpler and handles cold, never-before-seen codes correctly by falling through; write-through guarantees every code is cached from the moment of creation, avoiding even the first-request cache miss, at the cost of writing to two systems on every creation.

**Visit counting**: synchronous increment (in the same request/transaction as the redirect) versus asynchronous (fire-and-forget, or batched). Synchronous counting guarantees the count is always immediately accurate but adds a database write to the latency-critical redirect path — directly working against the stated latency requirement. Asynchronous counting decouples the count update from redirect latency entirely, at the cost of the count being eventually, not immediately, accurate.

### Alternative Designs Considered and Rejected

**A single relational table with no cache at all.** Rejected as the primary design because the stated read-heavy access pattern (Non-Functional Requirements) makes a database-only design vulnerable to becoming read-bottlenecked exactly where it matters most — though this is a legitimate, simpler starting point for a genuinely low-traffic deployment, and is explicitly not wrong, just not scaled to the stated requirement. **A purely in-memory system with no persistent database at all.** Rejected because the requirement that "a short link, once created, should keep working reliably for a long time" directly implies durability beyond a single process's memory — this option fails the availability requirement on a restart.

### Chosen Design

Base62-encoded auto-incrementing ID for generated codes (simplicity and zero collision-checking cost, with the ordering-leak risk mitigated by not exposing raw creation counts anywhere in the product), a relational database as the source of truth, a cache-aside Redis layer in front of redirect lookups (matching the read-heavy access pattern directly), and asynchronous visit counting via a lightweight background increment rather than blocking the redirect response.

### Implementation Walkthrough

```python
import string

BASE62 = string.digits + string.ascii_lowercase + string.ascii_uppercase

def encode_base62(n: int) -> str:
    if n == 0:
        return BASE62[0]
    digits = []
    while n:
        n, rem = divmod(n, 62)
        digits.append(BASE62[rem])
    return "".join(reversed(digits))

async def create_short_link(long_url: str, custom_alias: str | None, db) -> str:
    if custom_alias:
        existing = await db.get_by_code(custom_alias)
        if existing:
            raise ValueError("Alias already taken")
        code = custom_alias
    else:
        new_id = await db.next_id()          # a DB sequence -- monotonic, collision-free
        code = encode_base62(new_id)
    await db.insert(code=code, long_url=long_url)
    return code

async def redirect(code: str, cache, db, increment_queue) -> str:
    long_url = await cache.get(code)
    if long_url is None:                      # cache miss (Python Backend Handbook §47.5)
        long_url = await db.get_long_url(code)
        if long_url is None:
            raise NotFoundError()
        await cache.set(code, long_url, ttl=3600)
    increment_queue.enqueue(code)              # async, off the critical path
    return long_url
```

`encode_base62` maps an auto-incrementing integer ID to a short, URL-safe string — no collision check is ever needed because the underlying integer sequence is already unique by construction. `redirect` follows the cache-aside pattern exactly, checking the cache first and falling through to the database only on a miss, then enqueuing the visit-count increment rather than writing it synchronously — directly resolving the challenge's second named trap.

### Production Improvements

Add a bloom filter in front of the database for custom-alias collision checks specifically, avoiding a full database round-trip for the common case of a genuinely-available alias. Add rate limiting on link creation (Python Backend Engineering Handbook §61) to prevent abuse. Validate submitted long URLs against a denylist or safe-browsing check before accepting them, addressing the malicious-destination concern raised in the challenge's Non-Functional Requirements.

### Scaling Path

At higher scale, shard the database by code prefix or hash range once a single instance's write throughput or storage becomes limiting (Software Systems Engineering Handbook's sharding chapters); the cache layer scales horizontally by adding Redis replicas or moving to a Redis Cluster well before the database itself needs sharding, since the read path is designed to absorb the overwhelming majority of traffic.

### Interview Discussion

This is one of the most commonly asked system-design questions specifically because its read/write asymmetry is a clean, teachable example of when and why to introduce caching — see Python Backend Engineering Handbook §94.3 for this exact question walked through the five-phase interview framework (§93.2), including the specific ID-generation and caching tradeoffs discussed here.

### Lessons Learned

The single most important design decision here isn't the technology chosen for the cache or database — it's recognizing, at the requirements stage, that this system has two fundamentally different workloads (rare writes, frequent reads) that deserve different design treatment, rather than one uniform design applied to both. This same asymmetry-recognition skill recurs throughout this series, most directly in Project 03 (In-Memory Cache) and Project 08 (Search Service).

---
