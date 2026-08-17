## 8. CloudFront

> **Decision Snapshot** — Tier 1 · Networking/CDN · Verdict: the default choice whenever content is served to geographically distributed users and benefits from edge caching — static assets, API responses that tolerate a short cache window, or video. Primary alternative: skip it only for purely internal, low-latency-already, single-region traffic.

### One-Line Summary
A content delivery network that caches responses at edge locations close to users, cutting latency and offloading repeated requests from your origin entirely.

### Category
Networking / CDN

### Tier
Tier 1

### What It Does
CloudFront sits in front of an origin — S3, an ALB, API Gateway, or any HTTP endpoint — and caches responses at edge locations distributed globally. A user's request is served from the nearest edge location if the content is cached there (a "hit"); if not (a "miss"), CloudFront fetches it from the origin, caches it, and serves it, so the next request for the same content nearby is fast. Beyond pure caching, it also provides TLS termination at the edge, request/response manipulation via Lambda@Edge or CloudFront Functions, and WAF integration (companion §27) at the edge, before traffic ever reaches your origin.

### When Should I Use It?
- Static assets (images, CSS/JS, downloads) — the textbook CDN use case.
- API responses with any meaningful cache tolerance, even a few seconds, to absorb burst traffic.
- Video/media streaming.
- As the single entry point for a multi-origin architecture (S3 for assets, ALB for API, all behind one distribution and one domain).

### When Should I NOT Use It?
- Purely internal traffic with no geographic distribution of users and no caching benefit to extract.
- Highly personalized, entirely uncacheable responses where every request must reach the origin anyway — CloudFront still adds value here for TLS termination and WAF, but the caching benefit (its main draw) doesn't apply.

### Common Real-World Use Cases
- Static website/asset hosting in front of S3.
- API acceleration and DDoS-absorption in front of API Gateway or an ALB.
- Video-on-demand and live streaming distribution.

### Typical Architecture
```
User → CloudFront (edge location, nearest to user)
           ↓ (cache hit: served directly, origin never touched)
           ↓ (cache miss: fetched from origin, then cached)
       Origin: S3 / ALB / API Gateway
```
A single CloudFront distribution can route to multiple origins based on path pattern — `/static/*` to S3, `/api/*` to an ALB — a common, clean way to present one public domain backed by genuinely different backend systems.

### Important Concepts
- **Cache behaviors** — path-pattern-based rules determining which origin handles a request and how it's cached (TTL, which headers/query strings/cookies affect the cache key).
- **Origin Shield** — an additional caching layer between edge locations and the origin, reducing origin load further when many edge locations would otherwise all miss and hit the origin independently.
- **Lambda@Edge / CloudFront Functions** — run code at the edge to modify requests/responses (e.g., redirect logic, header manipulation) before they reach the origin or the user; CloudFront Functions are lighter-weight/cheaper/faster for simple logic, Lambda@Edge for anything needing more compute or AWS SDK access.
- **Invalidations** — explicitly evicting cached content before its TTL expires, needed when you've deployed new content and can't wait out the cache.
- **Signed URLs/Cookies** — the CloudFront-level equivalent of S3 presigned URLs, for restricting access to specific users/time windows even through a CDN layer.

### Security Considerations
Integrate AWS WAF (companion §27) at the CloudFront layer to filter malicious traffic at the edge, before it ever reaches your origin. Use Origin Access Control (OAC) to ensure an S3 origin is only reachable through CloudFront, not directly — otherwise CloudFront's caching and WAF protection can be trivially bypassed by hitting the S3 URL directly. Enforce HTTPS-only (redirect HTTP to HTTPS at the CloudFront layer) rather than relying on the origin to do it.

### Monitoring
CloudFront's own metrics (requests, error rates, cache hit ratio) are the primary signal; a declining cache hit ratio for content you expect to be cacheable is the direct symptom companion §54's failure-engineering chapter is built around, and usually traces back to a cache-key configuration (headers/cookies/query strings) that's broader than it needs to be.

### Scaling
CloudFront scales globally and transparently — there's no capacity to provision. The scaling consideration that matters is origin capacity during a cold cache (a fresh deployment, a cache invalidation, or unexpectedly low cache hit ratio) — the origin still needs to handle the full miss traffic, not just the steady-state hit-reduced load.

### Cost Model
Billed per data transfer out (varying by edge location/region) and per request (HTTP vs. HTTPS priced differently), plus invalidation requests beyond a free monthly allowance. Data transfer from CloudFront to the internet is typically cheaper than the same transfer directly from S3/EC2 to the internet — a genuine, if secondary, cost benefit beyond the caching itself.

### Common Mistakes
- Allowing direct access to an S3 origin bucket, bypassing CloudFront's caching and WAF protection entirely.
- Including unnecessary headers/cookies/query strings in the cache key, fragmenting the cache and tanking hit ratio.
- Forgetting to invalidate (or version) cached assets after a deployment, serving stale content to users.
- Not configuring Origin Shield for a high-traffic, globally-distributed origin, leaving the origin exposed to redundant miss traffic from many edge locations independently.

### Migration Path
Rarely outgrown at the service level — CloudFront scales globally by design. The typical evolution is adding cache behaviors/origins as an architecture grows, or adopting Origin Shield once origin load from cache misses becomes a real concern.

### Interview Questions
1. What's the practical difference between a cache hit and a cache miss, end to end?
2. Why must an S3 origin be locked down with Origin Access Control if it sits behind CloudFront?
3. What causes a low cache hit ratio, and how would you investigate it?
4. When would you use Lambda@Edge instead of a CloudFront Function?
5. How do cache invalidations work, and why are they not a substitute for a good caching/versioning strategy?
6. How would you design a single CloudFront distribution serving both static assets and a dynamic API?
7. What's Origin Shield, and what problem does it solve?
8. How does CloudFront interact with AWS WAF, and why put WAF at this layer rather than at the origin?

### Python Example
```python
import boto3

cloudfront = boto3.client("cloudfront")

# Invalidate a specific deployed path after a release, rather than waiting out the
# cache TTL -- scoped narrowly to what actually changed, not a blanket "/*".
cloudfront.create_invalidation(
    DistributionId="E1234567890ABC",
    InvalidationBatch={
        "Paths": {"Quantity": 1, "Items": ["/static/app.js"]},
        "CallerReference": "deploy-2026-07-24-001",
    },
)
```
Scoping the invalidation to `/static/app.js` rather than `/*` keeps the cost and effect narrow and predictable — a blanket invalidation after every deploy defeats much of the caching benefit CloudFront exists to provide, momentarily forcing every edge location back to the origin for everything.

### Best Practices
- Lock down origins with Origin Access Control; never allow direct public access to a CloudFront origin.
- Keep the cache key (headers/cookies/query strings considered) as narrow as the application genuinely requires.
- Version static assets in their filename/path rather than relying on invalidations for routine deploys.
- Enforce HTTPS-only at the distribution level.
- Add Origin Shield once origin load from cache misses becomes measurable.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| CDN | CloudFront | Azure CDN / Front Door | Cloud CDN |

---
