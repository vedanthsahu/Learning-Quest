## §160. API Gateway, BFF, Service Discovery, and Outbox/Inbox Patterns

### 1. The Vocabulary

- **API Gateway pattern** — a single entry point in front of multiple backend services, handling
  cross-cutting concerns (auth, rate limiting, routing, request/response transformation) once,
  centrally, instead of duplicated in every service (§8's gateway-vs-load-balancer distinction,
  named explicitly as a pattern here).
- **BFF pattern** — recapped from §114: a backend tailored to one specific frontend client's
  aggregation and shaping needs, distinct from a general-purpose API gateway.
- **Service discovery pattern** — how a service finds the current network location of another
  service, given that locations change constantly in a dynamic, auto-scaled, container-orchestrated
  environment — via static configuration (fragile, doesn't handle change), a registry (services
  register themselves; others query it), or platform-native DNS (Kubernetes' built-in Service DNS,
  §144).
- **Outbox/Inbox pattern** — recapped from §46: writing an event to an "outbox" table in the same
  local transaction as the business change, then a separate process reliably publishes it — named
  explicitly here as a system-design pattern, not just a queueing implementation detail.

### 2. Where It Sits, and Why Teams Use It

These four are grouped together because they're the ones most likely to get *named* directly in a
design conversation without further explanation, and each solves a distinct "how do the pieces of
a distributed system actually find and talk to each other reliably" problem: API Gateway
centralizes cross-cutting request handling, BFF tailors that further per client, service discovery
solves the "where is it right now" problem, and outbox/inbox solves "how do I publish an event
reliably in the same transaction as the change that caused it" (§46's dual-write problem).

### 3. What Actually Breaks

- **An API Gateway that also contains business logic** — like a facade (§117) that oversteps, a
  gateway should route and apply cross-cutting policy, not make business decisions; logic that only
  lives in the gateway becomes invisible to the services behind it.
- **Static service discovery in a dynamic environment** — hardcoded IPs or hostnames break the
  moment auto-scaling or a redeploy changes which instances are actually running, which is the
  normal case in any modern orchestrated environment, not an edge case.
- **No outbox pattern, so a dual-write race exists** — writing to the database and publishing an
  event as two separate operations means a crash between them either loses the event or publishes
  it for a change that never actually committed — exactly the failure §46 exists to prevent, named
  here as a reusable architectural pattern rather than a one-off fix.
- **A gateway or BFF becoming a single point of failure with no redundancy** — centralizing traffic
  through one component is exactly why that component needs its own scaling and failover story;
  centralization for simplicity shouldn't come at the cost of it becoming an unprotected
  bottleneck.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I keep an API Gateway focused on cross-cutting concerns — auth, rate limiting, routing — and
  keep business logic out of it, in the services behind it."
- "I rely on platform-native or registry-based service discovery in any environment where
  instances scale or redeploy, rather than static configuration."
- "I use the outbox pattern any time an event needs to be published reliably in the same
  transaction as the change that triggered it."

### 5. Interview-Ready Answer

> "These four patterns each answer a specific 'how do distributed pieces find and talk to each
> other' question. API Gateway centralizes cross-cutting concerns like auth and rate limiting
> without embedding business logic in it. BFF goes further for one specific client's shaping needs.
> Service discovery — usually platform-native DNS in a Kubernetes environment — replaces static
> configuration that breaks the moment instances scale or redeploy. And outbox/inbox solves the
> reliable-event-publishing problem: writing the event to an outbox table in the same transaction as
> the business change, so a crash can't silently lose the event or publish one for a change that
> never committed."

### 6. Go Deeper

companion Software Systems Handbook's §60 (Global API Platforms: rate limiting & gateways at
scale) chapter and companion Software Systems Handbook's §42 (Microservices Mechanics: mesh,
gateways, bulkheads, circuit breakers) chapter for full implementation patterns; this book's §8
(reverse proxy vs LB vs gateway), §46 (outbox pattern), and §114 (BFF/service mesh) for the
individually-detailed versions of each pattern named here.

---
