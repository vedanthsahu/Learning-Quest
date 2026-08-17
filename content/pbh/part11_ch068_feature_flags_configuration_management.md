## 68. Feature Flags & Configuration Management

### 68.1 The Problem: Deploying Code and Releasing a Feature Are Two Decisions That Don't Have to Happen at the Same Moment

Ordinarily, deploying new code and making its behavior visible to users happen simultaneously — the moment the deployment completes, every user sees the new behavior. This coupling is a real constraint: it means rolling back a problematic *feature* requires rolling back an entire *deployment* (which may bundle unrelated, perfectly fine changes together with the problematic one), and it means there's no way to expose a new feature to a small subset of users first, before committing to it for everyone.

### 68.2 Engineering Constraint: A Feature Flag Decouples "Is This Code Deployed" From "Is This Behavior Active"

A **feature flag** is a runtime-checked condition (`if feature_flags.is_enabled("new_booking_flow", user=current_user):`) that gates whether a specific code path executes — the code for both the old and new behavior is deployed together, but which one actually runs for a given user is decided by the flag's current configuration, checked at request time, completely independent of any deployment event. This directly enables companion §46.3's canary/progressive-rollout pattern at a finer grain than companion §46.5's URL-versioning (which splits by entire API version) — a feature flag can roll out a specific behavior change to 5% of users, then 25%, then 100%, all without a single additional deployment, and can be instantly disabled (setting it back to 0%) without requiring a rollback deployment at all if a problem is discovered.

### 68.3 Decision Framework: Flag Types — Release, Experiment, Permission, and Operational Flags Serve Different Purposes

A **release flag** gates a specific, upcoming feature during its rollout (temporary by nature — meant to be removed once the feature is fully released or fully rejected). An **experiment flag** (an A/B test) deliberately keeps two variants running simultaneously to compare outcomes, rather than converging toward one winner quickly. A **permission flag** gates a feature by a user's actual entitlement (a premium-tier-only feature) — genuinely long-lived, not temporary at all, unlike a release flag. An **operational flag** provides an emergency kill-switch for a specific piece of functionality (disable a specific, expensive report-generation feature during a load spike) — also long-lived, and specifically meant to be toggled reactively during an incident. Conflating these types — treating a permission flag as if it were a temporary release flag meant for eventual removal — leads to confusion about which flags are safe to delete and which represent permanent, load-bearing business logic.

### 68.4 Python Mechanism: A Simple, Self-Hosted Feature Flag Implementation

A minimal feature-flag system needs only a persistent store (a database table, or Redis for lower-latency reads) mapping flag names to their current configuration (fully on, fully off, or a percentage-based rollout, optionally scoped to specific user attributes) — for straightforward needs, this can be implemented directly rather than requiring a dedicated third-party feature-flag service; percentage-based rollout is typically implemented via a deterministic hash of the flag name and user ID together, ensuring the *same* user consistently gets the *same* variant on every check (rather than randomly flipping between variants on each request, which would produce a confusing, inconsistent experience for that user).

### 68.5 Engineering Constraint: Flag Evaluation Must Be Fast, Since It Runs on Every Relevant Request

A feature flag check happens on the hot path of every request touching that feature — an implementation requiring a slow database query on every single check adds real, unnecessary latency to every gated request; the standard production pattern caches the current flag configuration in-memory (or in Redis, companion §35.3) with a short TTL or an explicit invalidation-on-change mechanism, checking the cached configuration on the hot path rather than querying the flag's source of truth fresh on every single request.

### 68.6 Implementation

```python
import hashlib

def is_feature_enabled(flag_name: str, user_id: str, rollout_percentage: int) -> bool:
    """Deterministic percentage rollout (§68.4) -- the SAME user always gets
    the SAME result for a given flag+rollout_percentage combination."""
    if rollout_percentage >= 100:
        return True
    if rollout_percentage <= 0:
        return False

    hash_input = f"{flag_name}:{user_id}".encode()
    hash_value = int(hashlib.sha256(hash_input).hexdigest(), 16)
    bucket = hash_value % 100                # deterministic bucket, 0-99
    return bucket < rollout_percentage


# Cached flag configuration (§68.5) -- refreshed periodically, not queried
# fresh on every single request
_flag_cache: dict[str, int] = {"new_booking_flow": 25}   # 25% rollout

def check_flag(flag_name: str, user_id: str) -> bool:
    rollout = _flag_cache.get(flag_name, 0)   # default OFF if unconfigured
    return is_feature_enabled(flag_name, user_id, rollout)


# Usage in application code:
async def create_booking_route(user_id: str, payload: dict):
    if check_flag("new_booking_flow", user_id):
        return await create_booking_v2(payload)   # new code path
    return await create_booking_v1(payload)         # old, established code path

async def create_booking_v1(payload): ...
async def create_booking_v2(payload): ...
```

`is_feature_enabled` hashes the flag name and user ID together, producing a deterministic bucket (0-99) — a given user always falls into the same bucket for the same flag, meaning increasing `rollout_percentage` from 25 to 50 expands the *same* initial 25% of users' experience to include an additional, consistent 25%, rather than reshuffling who's in the enabled group entirely on every check (which would produce a confusing, flickering experience for users near the boundary). `_flag_cache`'s in-memory lookup (§68.5) means `check_flag` never queries a database on the actual request path, keeping flag evaluation fast enough to use freely throughout the codebase without meaningful overhead concern.

### 68.7 Production Considerations

Release flags (§68.3) accumulate as technical debt if not actively tracked and removed once a feature's rollout completes — a codebase with dozens of stale, 100%-or-0%-permanently-set release flags, each still requiring an `if` check and a maintained old code path, is a real, compounding maintenance cost; a periodic review process explicitly identifying and removing completed release flags (and their now-dead alternate code path) should be a standing practice, not an occasional cleanup effort. Flag configuration changes (especially operational, kill-switch flags used reactively during an incident, §68.3) should themselves be logged and auditable (companion §64) — knowing exactly when a specific flag was toggled, by whom, and to what value is directly relevant to incident timeline reconstruction, exactly the same audit-trail need companion §31.6 established for database records generally, now applied to runtime configuration state.

### 68.8 Debugging

**Symptoms:** A feature behaves inconsistently for the same user across different requests, sometimes showing the new behavior and sometimes the old; a feature flag intended to be fully rolled out to 100% still appears disabled for some users. **Investigation:** For inconsistent per-user behavior, check whether the rollout calculation is genuinely deterministic (§68.4's hash-based bucketing) or uses a non-deterministic source (a fresh random number generated on every check, rather than a stable hash of the user's identity) — a common, subtle implementation mistake. For a "100%"-configured flag still appearing disabled for some users, check the flag-cache invalidation/refresh mechanism (§68.5) for staleness — a cache that hasn't yet picked up the configuration change is a common, transient cause. **Root cause:** Non-deterministic rollout logic producing per-request rather than per-user consistency; a stale cached flag configuration not yet reflecting a recent change. **Fix:** Replace any non-deterministic rollout calculation with the hash-based, per-user-deterministic approach (§68.6); reduce the flag-cache TTL or add explicit cache invalidation triggered by configuration changes, ensuring changes propagate within an acceptable, known delay.

### 68.9 Interview Thinking

"How would you roll out a risky new feature to only 10% of users, then gradually increase it?" is testing whether feature flags with deterministic, percentage-based rollout (§68.2, §68.4) are your default answer, distinct from and complementary to companion §46.3's canary-deployment mechanism (which operates at the infrastructure/traffic-routing level rather than the application's own runtime logic level) — a strong answer explains why per-user determinism matters specifically (a consistent experience for each individual user, not random flip-flopping) rather than only describing percentage-based splitting abstractly.

### 68.10 Mini Lab

Implement `is_feature_enabled` and `check_flag` as in §68.6. Generate a list of 1,000 synthetic user IDs and confirm that at a 25% rollout, approximately 250 (not exactly, but reasonably close given hash distribution) fall into the enabled bucket, and that re-running the check for the same users produces identical results every time (confirming determinism). Then increase the rollout to 50% and confirm every user who was enabled at 25% remains enabled at 50% (monotonic expansion, not a reshuffled group) — directly verifying §68.6's deterministic-bucketing property yourself.

---
