## 103. Backend Debugging Exercises

### 103.1 How to Use These Exercises

Each exercise gives a bug report roughly as a real user or teammate would phrase it — vague, symptom-first, with no hint about the underlying cause. Practice the full Investigation path (companion Part XII's Symptoms → Metrics → Logs → Root Cause structure) before reading the discussion, resisting the urge to jump straight to "I bet it's X."

### 103.2 Exercise 1: "Sometimes I Get Someone Else's Data"

**Report**: "Occasionally, refreshing the dashboard shows what looks like another user's information for a second before it corrects itself." **Investigation path**: This shape — transient, self-correcting, user-specific — strongly suggests a caching issue with an incorrectly-scoped cache key (companion §47.5) rather than an authorization bug proper, since a genuine authorization failure wouldn't "self-correct" on its own. **Likely root cause**: a cache key missing the user ID as part of its key (e.g., caching by endpoint path alone rather than by `user_id + endpoint`), causing one user's cached response to occasionally be served to a different user hitting the same endpoint shortly after. **Verification step**: check the actual cache key construction for any endpoint returning user-specific data.

### 103.3 Exercise 2: "The App Is Fine All Day, Then Falls Over at 9 AM"

**Report**: "Every weekday around 9 AM, the API starts timing out for a few minutes, then recovers on its own." **Investigation path**: A sharp, time-correlated, self-recovering pattern points toward a traffic spike coinciding with a specific real-world event (a workday's login rush) hitting a capacity ceiling that isn't reached at other times (companion §72.2's genuine-undersizing pattern, distinguished from a leak precisely by this traffic-correlated, recovering shape). **Likely root cause**: connection pool or worker capacity sized for average, not peak, load, with 9 AM being this system's actual peak. **Verification step**: overlay pool-utilization metrics (companion §57.2) against request-rate metrics for that exact time window to confirm the correlation directly rather than assuming it from the time-of-day pattern alone.

### 103.4 Exercise 3: "It Works on Staging But Not in Production"

**Report**: "The new feature passes every test on staging, but throws a 500 error in production on the exact same request." **Investigation path**: Compare the actual configuration, dependency versions, and data between the two environments rather than assuming the code itself is at fault (companion §69.3's environment-parity principle) — a 500 with identical input across environments usually points to an environmental difference, not a code bug that staging's tests would have equally caught. **Likely root cause**: a missing or different environment variable/secret in production (companion §44), a dependency version mismatch not caught by an unlocked or inconsistently-locked requirements file (companion §8.6), or genuinely different data shape in production (a field that's always populated in test fixtures but is legitimately `NULL` in some production rows).

### 103.5 Exercise 4: "Deleting an Item Sometimes Doesn't Actually Delete It"

**Report**: "I deleted a note, and it disappeared from the list, but a day later it was back." **Investigation path**: "Disappeared, then reappeared" suggests either a cache-invalidation gap (the delete succeeded, but a stale cached list is served again later, companion §83.7's identical shape) or a genuine data-layer issue (the delete's transaction wasn't actually committed, or was rolled back). **Likely root cause**: check first whether the delete is genuinely persisted in the database (a durable fact) or only removed from a cache/read-model that later resyncs from an unchanged source of truth — these two possibilities require completely different fixes (invalidation logic versus transaction-commit logic) and must be distinguished before proposing either.

### 103.6 Exercise 5: "The Background Job Queue Keeps Growing"

**Report**: "The number of pending jobs in the queue keeps climbing and never goes back down, even overnight when traffic is low." **Investigation path**: A queue that grows regardless of traffic level, rather than growing only during peak and draining during lulls, suggests workers are either not running, crashing repeatedly, or processing slower than the (even reduced, overnight) enqueue rate — check worker process health and per-task processing time directly (companion §85.6's worker-specific health check, distinct from a web-tier check) before assuming a pure capacity issue. **Likely root cause**: a poison-pill task (companion §94.4's exact concern) causing repeated worker crashes or infinite retry loops, or workers silently stopped/crashed with no alert configured to catch it.

### 103.7 Mini Lab

Write your own bug report in the same vague, symptom-first style as this chapter's five exercises, based on a real bug you've previously fixed (in any codebase, not necessarily Python) — then, a week later, give only the report (not your own memory of the fix) to yourself or a colleague and see whether the Investigation path this chapter models actually leads back to the real, original root cause.

---
