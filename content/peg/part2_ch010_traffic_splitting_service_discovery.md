## §10. Traffic Splitting and Service Discovery: Canary, Blue-Green, DNS-Level Routing

### 1. The Vocabulary

- **Canary deployment** — send a small percentage of traffic to a new version, watch it, then
  ramp up if it looks healthy.
- **Blue-green deployment** — run two full environments (old and new); switch all traffic at
  once, keeping the old one ready as an instant rollback.
- **DNS-level routing** — using weighted or latency-based DNS records to send different users to
  different endpoints entirely (different regions, or a gradual migration).
- **Service discovery** — how one service finds the current network location of another when
  instances are constantly starting, stopping, and moving (Kubernetes Service, Consul, etc.).

### 2. Where It Sits, and Why Teams Use It

These are all answers to the same underlying question: how do you change what's running in
production without a single risky all-or-nothing cutover? Canary and blue-green operate at the
load-balancer/deployment level; DNS-level routing is a coarser, slower tool for the same idea at
a bigger scale (whole regions, whole domains).

### 3. What Actually Breaks

- **Canary with no real monitoring** — sending 5% of traffic to a new version is only useful if
  you're actually watching error rates and latency for that slice; otherwise it's just "we deploy
  more slowly," with none of the safety benefit.
- **Blue-green forgetting the database** — application code can flip instantly between two
  environments, but a shared database with a breaking schema change can't "roll back" the same
  way; blue-green needs backward-compatible migrations to actually be safe (see §32).
- **DNS-level cutovers assumed to be instant** — they're slow specifically because of caching —
  expect the same TTL-driven delay as any other DNS change (see §1), which makes DNS-level
  routing a poor fit for anything needing a fast rollback.
- **Service discovery returning a stale/dead instance** — if the discovery mechanism doesn't
  de-register an instance quickly on shutdown, other services keep trying to call something
  that's already gone.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Canary and blue-green solve the same problem — reducing blast radius of a bad deploy — at
  different granularities and with different rollback speed."
- "A blue-green deploy is only as safe as the database migration underneath it; the app can
  switch instantly, the schema usually can't."
- "DNS-level traffic shifting is real but slow, because of the same TTL caching behavior as any
  other DNS change."

### 5. Interview-Ready Answer

> "Canary and blue-green are both about reducing the blast radius of a bad release — canary by
> sending a small percentage of traffic first and watching it, blue-green by keeping a full old
> environment ready for an instant switch back. The part people forget is that the database
> usually can't 'blue-green' as cleanly as the application can, so the migration underneath has to
> be backward-compatible regardless of which deployment strategy sits on top of it."

### 6. Go Deeper

companion Software Systems Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary,
rolling) chapter (deployment strategies) and companion Software Systems Handbook's §42
(Microservices Mechanics: mesh, gateways, bulkheads, circuit breakers) chapter (service
discovery); companion Cloud Engineering Playbook's §44 (Multi-Region & Disaster Recovery
Patterns) chapter.

---
