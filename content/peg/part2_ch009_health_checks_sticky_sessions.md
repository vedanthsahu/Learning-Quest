## §9. Health Checks, Sticky Sessions, and Stateless Design

### 1. The Vocabulary

- **Health check** — a periodic probe (usually an HTTP request to a specific path) the load
  balancer uses to decide if an instance should keep receiving traffic.
- **Sticky session** — routing the same client to the same backend instance for every request,
  usually via a cookie.
- **Stateless service** — a service that keeps no per-user state in memory between requests, so
  any instance can handle any request.
- **Connection draining (deregistration delay)** — giving an instance time to finish in-flight
  requests before the load balancer stops sending it new ones and it's removed.

### 2. Where It Sits, and Why Teams Use It

Health checks are what actually makes horizontal scaling and rolling deploys safe — without them,
a load balancer would keep sending traffic to a crashed or still-starting instance. Sticky
sessions exist as a workaround for services that weren't built stateless; the better long-term
fix is almost always making the service stateless in the first place.

### 3. What Actually Breaks

- **Health check passes but the app is still broken** — a shallow health check (just "is the
  process up") can report healthy while the app can't actually reach its database; a deeper check
  (verify critical dependencies) catches more, at the cost of the health check itself becoming a
  new failure point if a dependency has a blip.
- **Sticky sessions masking a stateful design problem** — relying on sticky sessions to make
  in-memory session state "work" means a single instance restart logs out every user pinned to
  it, and it prevents even load distribution.
- **No connection draining on deploy** — requests in flight to an instance being terminated get
  abruptly cut off instead of finishing, which looks like random, hard-to-reproduce errors during
  every deploy.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I design services to be stateless by default — session state goes in Redis or a database, not
  in process memory — specifically so I never need sticky sessions."
- "A good health check verifies the dependencies that actually matter for serving traffic, not
  just 'is the process alive.'"
- "Connection draining during deploys is why in-flight requests don't just get dropped when an
  instance is replaced."

### 5. Interview-Ready Answer

> "Health checks are what makes a load balancer safe to use at all — without them it has no way
> to know an instance is unhealthy or still starting up. I try to design services stateless
> specifically to avoid needing sticky sessions, since sticky sessions create uneven load and make
> a single instance restart disruptive for whoever was pinned to it. And during deploys,
> connection draining matters — you want in-flight requests to finish before an old instance is
> actually removed from rotation."

### 6. Go Deeper

companion Cloud Engineering Playbook's §10 (Application Load Balancer) chapter (target group
health checks in AWS specifically); companion Software Systems Handbook's §51 (Scalability
Patterns Deep Dive) chapter (stateless design).

---
