## 54. Why Is CloudFront Serving Stale Content?

*(Prerequisite: companion §8 CloudFront)*

### 54.1 Symptoms
Users report seeing outdated content (an old version of a static asset, a stale API response) after a deployment or data change that should have updated it, even after what should be enough time for any reasonable cache TTL to have expired.

### 54.2 Possible Causes
No invalidation was issued after deployment, and the object's TTL hasn't yet elapsed; the cache key configuration doesn't include a header/cookie/query-string parameter that should differentiate cached variants, causing one cached response to be incorrectly served for requests that should receive a different one; a browser or intermediate cache (not CloudFront itself) holding stale content, misattributed to CloudFront; an origin serving inconsistent `Cache-Control` headers across requests, confusing CloudFront's own caching behavior.

### 54.3 Metrics
Cache hit ratio (a very high hit ratio for content that should have just changed is itself a clue that invalidation/cache-busting didn't happen as expected); per-path cache statistics if available, to isolate whether the issue is specific to one behavior/path pattern.

### 54.4 Logs
CloudFront access logs (if enabled) show whether a specific request was served from cache (`Hit`) or fetched from origin (`Miss`/`RefreshHit`) — the direct way to confirm whether CloudFront is actually the layer serving stale content, versus a browser cache or intermediate proxy.

### 54.5 Investigation
First confirm the staleness is genuinely at the CloudFront layer — request the resource directly from the origin (bypassing CloudFront) and compare; if the origin itself already returns the old content, the problem isn't CloudFront at all. If CloudFront is confirmed as the source, check whether an invalidation was actually issued for the changed path, and whether the cache key configuration correctly varies on whatever actually differentiates the content (a specific header, cookie, or query string).

### 54.6 Root Cause
In practice, the most common cause is simply forgetting to invalidate (or better, version) an asset after deployment, relying on the TTL to eventually expire it — for anything deployed more frequently than its TTL, this produces exactly this symptom. A close second is a cache key configuration that's too narrow, treating genuinely different responses (e.g., varying by an `Accept-Language` header) as identical and caching only one variant.

### 54.7 Fix
Version static assets in their filename/path (e.g., a content hash in the filename) so a genuinely new deployment is a genuinely new cache key, needing no invalidation at all — the more robust, scalable fix over relying on invalidations for routine deploys. For dynamic content needing invalidation, issue a scoped invalidation (companion §8) immediately as part of the deployment pipeline, not as a manual afterthought. Widen the cache key configuration to include whatever header/cookie/query-string genuinely differentiates responses.

### 54.8 Tradeoffs
Asset versioning requires a build step generating content-hashed filenames and updating references to them — real, if standard, tooling investment, but removes an entire class of stale-cache incident permanently rather than requiring correct invalidation discipline on every single deploy. Widening the cache key reduces cache hit ratio (more distinct cached variants means each is requested less often) — a genuine tradeoff against correctness that should be scoped to only the dimensions that actually matter.

### 54.9 Prevention
Adopt asset versioning/content-hashing for static assets as a standard deployment practice, not a reactive fix. Automate cache invalidation as part of the deployment pipeline for anything not versioned this way. Confirm the cache key configuration matches actual response-varying dimensions before assuming a cache-hit-ratio problem is unrelated to a correctness problem.

### 54.10 Decision Tree
```
Request the resource directly from the origin, bypassing CloudFront -- is it
ALREADY stale there?
  YES -> The problem isn't CloudFront; investigate the origin/deployment itself.
  NO -> Check CloudFront access logs: was the stale response served as a cache Hit?
    YES, Hit -> Was an invalidation issued after deployment? If not, that's the
           fix; consider adopting asset versioning to avoid needing one going forward.
    Served correctly as Miss but still looks stale -> Check for a browser/
           intermediate cache, not CloudFront, as the actual source.
```

---
