## Project 11: Distributed Lock Service — Solution Guide

### Business Reasoning

The business need is guaranteeing mutual exclusion for an operation across an entire fleet of otherwise-independent processes. Correctness here is unusually unforgiving — unlike many systems where a rare bug degrades performance, a lock-correctness bug directly causes the exact double-execution the lock exists to prevent, with potentially serious downstream consequences (a job running twice, corrupting data it wasn't designed to handle concurrently).

### Requirements Analysis

The no-permanent-deadlock requirement and the correctness-above-all requirement are in genuine tension: a lock that never expires can't deadlock-recover from a crashed holder, but a lock that expires too eagerly risks two processes simultaneously believing they hold it — the exact bug this project must avoid at all costs. Resolving this tension is this project's central design work.

### Architecture

```
Acquire: atomic "SET key=token IF NOT EXISTS, with TTL" -- one atomic operation
Working: legitimate holder periodically extends TTL (heartbeat) while still working
Release: atomic "DELETE key IF value == my_token" -- compare-and-delete, not blind delete
Crash: TTL expires naturally if no heartbeat arrives -- lock becomes acquirable again
```

### Tradeoff Discussion

**Fixed TTL with no heartbeat vs. TTL plus heartbeat extension.** A fixed TTL sized generously enough to cover the worst-case operation duration is simple, but wastes time on crash recovery (the lock stays "held" by a crashed process for the full TTL duration even though the process died almost immediately) and risks the exact failure the challenge names if any single operation ever exceeds the fixed TTL. TTL plus heartbeat extension lets the lock have a short base TTL (fast crash recovery) while a legitimate, still-working holder keeps renewing it — correctly handling both the fast-crash-recovery goal and the long-legitimate-operation case, at the cost of the added heartbeat mechanism's complexity.

**Blind release vs. token-checked release.** A blind release (simply deleting the lock key) is simpler but has a genuine race: if a holder's lock already expired and was reacquired by a different process, the original (now former) holder's blind release would delete the *new* holder's lock, letting a third process acquire it while the second process still believes it holds it — a correctness violation. A token-checked release (verify the stored value matches the caller's own token before deleting) closes this gap by ensuring a process can only release a lock it currently, genuinely holds.

### Alternative Designs Considered and Rejected

**Check-then-set using two separate Redis commands (`GET` then `SET`).** Rejected outright — this is the challenge's first named trap: two processes checking "is it free?" in the same narrow window can both see "free" and both proceed to set it, defeating the entire purpose of the lock. This is the identical race this series' Project 02 (Rate Limiter) already resolved via an atomic primitive, applied here to a different atomic operation (`SET ... NX`) for a different purpose. **A lock with no expiration, requiring a separate external process to detect and clean up crashed holders' locks.** Rejected — this reintroduces real complexity (a lock-monitoring process, itself a potential new single point of failure) to solve a problem TTL-based expiration already solves more simply.

### Chosen Design

Redis's atomic `SET key token NX EX ttl` for acquisition (single atomic operation, closing the check-then-set race); a unique random token per acquisition attempt; a background heartbeat task on the holder side that extends the TTL periodically while the protected operation is still running; a Lua script (for atomicity) performing the compare-and-delete release, checking the stored token matches before deleting.

### Implementation Walkthrough

```python
import uuid

RELEASE_SCRIPT = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
"""                                             # atomic compare-and-delete via Lua (no check-then-act race)

async def acquire_lock(name: str, redis_client, ttl_seconds: int = 30) -> str | None:
    token = str(uuid.uuid4())
    acquired = await redis_client.set(f"lock:{name}", token, nx=True, ex=ttl_seconds)
    return token if acquired else None

async def release_lock(name: str, token: str, redis_client) -> bool:
    result = await redis_client.eval(RELEASE_SCRIPT, keys=[f"lock:{name}"], args=[token])
    return result == 1

async def heartbeat(name: str, token: str, redis_client, ttl_seconds: int, interval: int):
    while True:
        await asyncio.sleep(interval)
        # only extend if we still hold it (same compare check, via a similar Lua script for SET+EXPIRE)
        current = await redis_client.get(f"lock:{name}")
        if current != token:
            break                               # we've lost the lock -- stop pretending we hold it
        await redis_client.expire(f"lock:{name}", ttl_seconds)

async def run_with_lock(name: str, redis_client, work):
    token = await acquire_lock(name, redis_client)
    if token is None:
        return  # someone else holds it -- back off
    heartbeat_task = asyncio.create_task(heartbeat(name, token, redis_client, 30, 10))
    try:
        await work()
    finally:
        heartbeat_task.cancel()
        await release_lock(name, token, redis_client)
```

`SET ... NX EX` is a single atomic Redis operation — no separate check step exists that could race, directly closing the challenge's first named trap. `RELEASE_SCRIPT` runs as a single atomic Lua script inside Redis itself, so the "check token matches, then delete" sequence can't be interrupted by another operation in between — directly closing the challenge's fourth named trap (releasing a lock you no longer own). The heartbeat loop extends the TTL only after confirming the token still matches, so a lock that's already been reacquired by someone else is correctly abandoned rather than falsely extended.

### Production Improvements

For genuinely higher-stakes correctness requirements than a single Redis instance can guarantee (Redis itself failing over mid-lock is a real, if rare, edge case), consider the Redlock algorithm across multiple independent Redis instances, requiring a majority to agree on acquisition — an explicit escalation beyond this project's stated scope, worth naming as the next step if correctness requirements genuinely justify the added complexity. Monitor lock-hold duration and heartbeat failures as direct signals of workers taking longer than expected or crashing more often than expected.

### Scaling Path

The lock service's own scaling is bounded by whatever backs it (a single Redis instance, or a Redlock-style multi-instance quorum) — since lock acquisition/release operations are extremely fast and infrequent relative to typical application request volume, this component rarely becomes a bottleneck in practice before the operations it protects do.

### Interview Discussion

Python Backend Engineering Handbook §97.3 names the "just use a distributed lock" reflex as a trap when a simpler atomic operation would suffice — this project is the case where a distributed lock genuinely is the right tool, and a strong interview answer distinguishes the two: use a lock when the protected operation itself can't be made atomic; use a single atomic primitive (as in Project 02) when it can.

### Lessons Learned

The core lesson is that a lock's correctness depends on getting *three* things right together — atomic acquisition, TTL-based crash recovery, and token-verified release — and getting any one wrong (a check-then-set race, a fixed TTL too short for real work, a blind release) reintroduces exactly the double-execution risk the lock exists to prevent. This project is the natural conceptual peak of the atomic-operation theme this series has built since Project 02's rate limiter.

---
