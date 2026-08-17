## §8. Reverse Proxy vs Load Balancer vs API Gateway

### 1. The Vocabulary

- **Reverse proxy** — sits in front of a server, forwarding client requests to it (and often
  handling TLS termination, compression, and caching along the way).
- **Load balancer** — a reverse proxy whose main job is distributing traffic across *multiple*
  backend instances of the same service.
- **API gateway** — an L7 layer that adds API-specific concerns on top: authentication, rate
  limiting, request/response transformation, and routing across *different* services.
- **Forward proxy** (for contrast) — sits in front of *clients*, not servers, hiding the client
  from the destination (VPN-style, or corporate outbound filtering) — the opposite direction.

### 2. Where It Sits, and Why Teams Use It

These three terms overlap so much in practice (a single nginx instance can genuinely do all
three jobs at once) that people use them interchangeably — which is exactly why interviewers like
asking the difference. The real distinction is about *intent*, not the specific software: are you
hiding one server, spreading load across many, or adding cross-cutting API concerns?

### 3. What Actually Breaks

- **Putting business logic in the wrong layer** — auth or rate-limiting logic duplicated in every
  microservice instead of centralized once at the gateway creates drift and inconsistency.
- **Assuming "API Gateway" is one specific product** — AWS API Gateway, Kong, and a hand-rolled
  nginx config are all "an API gateway" in the architectural sense; the term describes a role, not
  a vendor.
- **Expecting a plain load balancer to do gateway things** — an NLB won't validate a JWT or apply
  a rate limit; that requires an L7 layer with actual request awareness.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A reverse proxy is the general concept; a load balancer is a reverse proxy specialized for
  spreading load across replicas of one service; an API gateway adds cross-cutting API concerns
  on top, usually across multiple different services."
- "I'd centralize auth, rate limiting, and request logging at the gateway rather than duplicating
  it in every service."

### 5. Interview-Ready Answer

> "I think of it as three overlapping roles rather than three separate products. A reverse proxy
> is the general pattern of standing in front of a backend. A load balancer is that pattern
> applied specifically to spreading traffic across multiple copies of the same service. An API
> gateway adds a layer on top for cross-cutting concerns — auth, rate limiting, routing across
> different microservices — that doesn't belong duplicated in every individual service."

### 6. Go Deeper

companion Cloud Engineering Playbook's §9 (API Gateway) chapter; companion Software Systems
Handbook's §29 (API Design Deep Dive: REST/RPC/gRPC/GraphQL, idempotency) and companion Software
Systems Handbook's §42 (Microservices Mechanics: mesh, gateways, bulkheads, circuit breakers)
chapters.

---
