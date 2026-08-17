## 83. Stage 5: Redis & Caching

### 83.1 Stage Goal

With real users now hitting a real database (§82), the first genuine performance complaint arrives: space membership (`require_space_member`, §81.4) is checked on *every single* note access, meaning every read pays a database round-trip purely to answer a question — "is this user a member of this space?" — that changes rarely relative to how often it's asked. This stage introduces Redis to cache that specific, high-read, low-write fact.

### 83.2 New Requirements

Non-functional only: read latency for note access should not scale linearly with the number of space-membership checks performed; a membership change (adding or removing a member, §81.4) must be reflected for all subsequent requests within a bounded, explicitly-stated staleness window — not necessarily instantly, but never indefinitely stale.

### 83.3 ADR-5: What Exactly to Cache, and With What Invalidation Strategy

**(1) Deciding:** Should Fieldnote cache the full space-membership set, individual membership-check results, or something else entirely? **(2) Options considered:** (a) cache each individual `(user, space)` membership check's boolean result; (b) cache the full member set per space and check membership in-application against the cached set; (c) cache nothing and instead optimize the database query itself (an index, companion §30.2) without introducing Redis at all. **(3) Tradeoffs:** Per-check caching produces the most cache keys and the simplest possible cache logic, but a single member addition invalidates nothing automatically — stale "not a member" results could persist past the intended staleness window unless every check has a short TTL; caching the full member set per space means one invalidation (on membership change) correctly clears exactly the right cache entry, but requires slightly more application logic to check membership against a cached collection rather than a cached boolean; the database-only option avoids Redis entirely but doesn't address the fundamental issue — this specific check genuinely happens far more often than membership changes, the textbook case for caching (companion §47.2) rather than only indexing. **(4) Chosen:** Cache the full member set per space (option b), keyed by `space_id`, invalidated explicitly and immediately on every membership change (companion §47.6's write-invalidate pattern) rather than relying on TTL expiry alone — this gives correct, immediate invalidation for the one write path that matters, while still getting the read-side benefit for the overwhelmingly more frequent read path. **(5) Revisit when:** Space sizes grow large enough that caching a full member set per space becomes memory-inefficient — at that point, per-check caching (option a) becomes the better tradeoff and this ADR should be reopened.

### 83.4 Implementation

```python
import json
import redis.asyncio as redis

redis_client = redis.from_url(settings.redis_url, decode_responses=True)  # companion §35.2

async def get_space_members(space_id: UUID, session: AsyncSession) -> set[str]:
    cache_key = f"space:{space_id}:members"
    cached = await redis_client.get(cache_key)
    if cached is not None:
        return set(json.loads(cached))                       # cache hit (§47.5)

    space = await session.get(SpaceModel, space_id)
    if space is None:
        return set()
    members = {m.email for m in space.members}
    await redis_client.set(cache_key, json.dumps(list(members)), ex=3600)  # §47.2's TTL as a backstop
    return members

async def add_member(space_id: UUID, email: str, session: AsyncSession) -> None:
    space = await session.get(SpaceModel, space_id)
    space.members.append(MemberModel(email=email))
    await session.commit()
    await redis_client.delete(f"space:{space_id}:members")   # explicit invalidation (§47.6, ADR-5)

async def require_space_member(space_id: UUID, requester: str, session: AsyncSession) -> None:
    members = await get_space_members(space_id, session)
    if requester not in members:
        raise HTTPException(status_code=404, detail="Note not found")
```

`redis_client.delete` on every membership write (`add_member`) is the load-bearing correctness mechanism here, not the `ex=3600` TTL — the TTL exists only as a backstop against a missed invalidation path (companion §47.6's belt-and-suspenders framing), not as the primary invalidation strategy, exactly matching ADR-5's stated choice. `get_space_members` degrades safely to a real database read on a cache miss, meaning a Redis outage produces slower, not incorrect, behavior (companion §35's cache-as-optimization, never cache-as-source-of-truth framing).

### 83.5 What Changed in the Architecture

`require_space_member` (§81.4) is rewritten to route through `get_space_members` rather than checking `_spaces`/the database directly — every caller of the old function is unaffected, since the function's signature and contract (raise on non-membership) are preserved; this is the first stage where a purely internal implementation change required zero changes to any calling route, a direct, felt benefit of the layered-function boundary (companion §43) established since §81.

### 83.6 Production Considerations

Monitor cache hit rate for `space:*:members` keys from day one (companion §74.3's lesson, applied proactively rather than only after a "Redis isn't helping" complaint) — a hit rate near zero would immediately reveal a key-design or invalidation bug rather than the intended, high-hit-rate steady state this ADR assumes.

### 83.7 Debugging

**Symptoms:** A user removed from a space can still access its notes for up to an hour after removal. **Investigation:** Check whether the member-removal code path (a route not shown in §83.4 but structurally identical to `add_member`) actually calls `redis_client.delete` — a removal path added later, by a different contributor unfamiliar with ADR-5's invalidation requirement, is the most likely place this specific bug is introduced, since it's easy to add a new mutating route without realizing it must also invalidate this cache key. **Root cause:** A missed invalidation call, functionally identical in shape to companion §74.2's cache-staleness-versus-correctness hazard. **Prevention:** A single, shared `mutate_space_members(...)` helper that every membership-changing route must call, making the invalidation step structurally unavoidable rather than a convention each new route must independently remember.

### 83.8 Mini Lab

Deliberately remove the `redis_client.delete` call from `add_member`, reproduce §83.7's staleness bug locally, then fix it — directly experiencing why ADR-5 requires *explicit* invalidation on every write path, not just a TTL, as the load-bearing correctness mechanism.

---
