## 47. Caching Architecture

### 47.1 The Problem: §35 Gave You the Redis Mechanism; This Chapter Gives You the Architectural Decisions Around It

§35.3-35.4 covered how to use Redis as a cache mechanically (get, set, TTL, invalidation). This chapter addresses the architectural questions that come before those mechanics: *where* in the request path should caching happen, *which pattern* governs how the cache and the source of truth stay related, and *how* should cache keys be designed so that caching one thing doesn't accidentally serve stale or wrong data for something subtly different.

### 47.2 Decision Framework: Cache-Aside vs. Read-Through vs. Write-Through vs. Write-Behind

**Cache-aside** (the pattern §35.7 already implemented) has the *application* check the cache first, and on a miss, fetch from the source of truth and populate the cache itself — the most common pattern, simple and explicit, with the application fully in control of exactly when caching happens. **Read-through** moves that same logic *behind* the cache itself (the cache, not the application, knows how to fetch on a miss) — less commonly self-implemented in a typical Python backend, more common when using a caching layer/library that provides this behavior built in. **Write-through** updates the cache and the source of truth together, synchronously, on every write — guarantees the cache is never stale after a write, at the cost of every write now paying the cache-write's latency too. **Write-behind** writes to the cache immediately but defers the source-of-truth write to happen asynchronously afterward — lowest write latency, but introduces a real window where the source of truth is behind the cache, and a genuine risk of losing the deferred write entirely if the process crashes before it completes (directly companion §22.3's `BackgroundTasks`-reliability tradeoff, now applied to writes specifically).

### 47.3 Engineering Constraint: Multiple Cache Tiers Exist Between a User and Your Database, Whether You Design for Them or Not

A request may pass through several distinct caching layers before ever reaching your application: a CDN (companion Software Systems Handbook §10) caching static or semi-static responses at the network edge, closest to the user; an in-process, in-memory cache (a plain Python dict, or `functools.lru_cache`, §47.4) within a single application instance, fastest but not shared across workers (companion §16.8's exact per-process-memory constraint); and Redis (§35), shared across every instance but requiring a network round-trip, slower than in-process memory but far faster than recomputing from the database. A deliberate multi-tier caching architecture explicitly decides which data belongs at which tier, rather than defaulting everything to a single layer regardless of its actual access pattern and staleness tolerance.

### 47.4 Python Mechanism: `functools.lru_cache` — The Simplest, Fastest, Most Limited Cache Tier

`functools.lru_cache` (companion §2's decorator mechanism, applied to caching a pure function's return value keyed on its arguments) provides a zero-infrastructure, in-process cache — no Redis, no network call, just an in-memory dict with automatic least-recently-used eviction once a configured size limit is reached. It's the right tool specifically for data that's expensive to compute, safe to compute independently per worker process (§16.8 — remember it is *not* shared across workers), and doesn't need explicit, coordinated invalidation across the fleet — a poor fit for anything requiring correctness guarantees around freshness after a write, since one worker's `lru_cache` has no way to know another worker (or this same worker's own write path) just invalidated the underlying data.

### 47.5 Decision Framework: Cache Key Design Must Encode Every Dimension That Affects the Cached Value's Correctness

A cache key that's too coarse (caching "the dashboard" under one single key, `dashboard_summary`, when the actual data varies by tenant) will silently serve one tenant's cached data to another — directly the same severity-one class of bug companion §31.4's tenant-scoping discussion warned about for database queries, now manifesting in caching instead. The correct discipline: a cache key must include every parameter the cached value's correctness actually depends on (`dashboard_summary:{tenant_id}:{date}`, not just `dashboard_summary`) — every dimension omitted from the key is a dimension where two genuinely different results could collide under the same key, one silently overwriting or masking the other.

### 47.6 Implementation

```python
from functools import lru_cache
import redis.asyncio as redis
import json

# TIER 1: in-process, per-worker, for cheap, safe-to-duplicate computation
@lru_cache(maxsize=256)
def get_static_amenity_icon_mapping() -> dict:
    # Rarely-changing, safe-to-recompute-per-worker reference data (§47.4) --
    # NOT tenant-specific, NOT write-sensitive.
    return {"wifi": "icon-wifi.svg", "monitor": "icon-monitor.svg"}


# TIER 2: Redis, shared across workers, for tenant-specific, write-sensitive data
redis_client = redis.Redis(host="localhost", decode_responses=True)

def _dashboard_cache_key(tenant_id: str, selected_date) -> str:
    # EVERY dimension the value depends on is IN the key (§47.5) --
    # tenant_id AND selected_date, not just one or the other.
    return f"dashboard_summary:{tenant_id}:{selected_date.isoformat()}"

async def get_dashboard_summary_multi_tier(tenant_id: str, selected_date, compute_fn) -> dict:
    key = _dashboard_cache_key(tenant_id, selected_date)
    cached = await redis_client.get(key)
    if cached is not None:
        return json.loads(cached)

    result = await compute_fn(tenant_id, selected_date)
    await redis_client.set(key, json.dumps(result), ex=60)
    return result
```

`get_static_amenity_icon_mapping` uses Tier 1 (`lru_cache`) specifically because it's safe to independently compute and cache per worker process — the data isn't tenant-specific and doesn't change based on writes elsewhere in the system, exactly the profile §47.4 describes as the right fit for this tier. `_dashboard_cache_key` demonstrates §47.5's key-design discipline directly: both `tenant_id` and `selected_date` are embedded in the key, ensuring a request for tenant A's dashboard on one date can never collide with tenant B's dashboard, or the same tenant's dashboard on a different date.

### 47.7 Production Considerations

Mixing tiers incorrectly is a real, recurring production mistake — caching genuinely tenant-specific or write-sensitive data in an in-process `lru_cache` (Tier 1) means each worker independently caches its own, potentially stale copy with no coordinated invalidation possible across the fleet (companion §16.9's exact shared-state confusion, now specifically about cache staleness rather than a shared counter), while caching genuinely universal, rarely-changing reference data in Redis (Tier 2) pays an unnecessary network round-trip for data that could have been served from local memory at effectively zero cost. The explicit decision framework (§47.2's pattern choice, §47.3's tier choice, §47.5's key design) should be made deliberately per cached value, documented if non-obvious, rather than defaulting uniformly to "cache everything in Redis with cache-aside" regardless of each specific value's actual access pattern and staleness tolerance.

### 47.8 Debugging

**Symptoms:** A dashboard or summary occasionally shows one tenant's or one date's data displayed for a completely different tenant or date; a cached value updates correctly on one server instance but continues showing stale data when the same request happens to hit a different instance. **Investigation:** For cross-tenant/cross-date data leakage, inspect the actual cache key construction for the specific cached value and check for a missing dimension (§47.5) — this is almost always the root cause of this exact symptom shape. For instance-inconsistent staleness, check whether the cache tier in use is genuinely shared (Redis, Tier 2) or is actually per-process (`lru_cache`, Tier 1) being used for data that needed fleet-wide, coordinated invalidation. **Root cause:** An underspecified cache key missing a dimension the cached value's correctness actually depends on; or a per-process cache tier chosen for data requiring cross-instance consistency. **Fix:** Add the missing dimension(s) to the cache key construction; migrate genuinely shared, write-sensitive data from an in-process cache tier to Redis (or an equivalent shared tier).

### 47.9 Interview Thinking

"You added caching to a multi-tenant dashboard endpoint, and now users occasionally see the wrong tenant's data — what happened?" is testing whether you immediately suspect cache key design (§47.5) as the root cause — a strong answer identifies the missing `tenant_id` dimension in the cache key as the single most likely explanation before considering any more exotic hypothesis, since this specific mistake is common enough to be the default first suspicion for this exact symptom.

### 47.10 Mini Lab

Implement `get_dashboard_summary_multi_tier` as in §47.6 with a `compute_fn` that prints which tenant/date it's computing for. Call it for two different tenants on the same date and confirm both trigger independent computation and are cached under distinct keys (verify by inspecting the actual Redis keys created). Then deliberately construct a version with a cache key that omits `tenant_id` (using only `selected_date`), call it for two different tenants on the same date, and observe the second tenant incorrectly receiving the first tenant's cached result — directly reproducing §47.5's exact failure mode yourself before restoring the correct key design.

---
