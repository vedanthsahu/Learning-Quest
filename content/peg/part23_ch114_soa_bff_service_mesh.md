## §114. SOA, BFF, and Service Mesh

### 1. The Vocabulary

- **SOA (Service-Oriented Architecture)** — microservices' older relative: services communicate
  through a shared, often heavyweight middleware layer (an "enterprise service bus"), typically
  with more centralized governance than modern microservices.
- **BFF (Backend for Frontend)** — a thin backend service built specifically for one frontend
  client (web, iOS, Android), aggregating and reshaping calls to other services into exactly what
  that client needs, instead of forcing every client to talk to every service directly.
- **Service mesh** — infrastructure (Istio, Linkerd) that handles service-to-service concerns
  (retries, timeouts, mTLS, traffic shaping, observability) via a sidecar proxy next to each
  service, so individual services don't have to implement that logic themselves.
- **Sidecar** — a helper process deployed alongside a service (usually in the same pod, in
  Kubernetes) that intercepts its network traffic to add cross-cutting behavior transparently.

### 2. Where It Sits, and Why Teams Use It

These three sit at different points in a microservices system's evolution. SOA is largely a legacy
term today — most systems described as SOA a decade ago would be called microservices now, minus
the shared bus. BFF solves a very concrete pain: a mobile client needing three round trips and
custom aggregation logic that a web client doesn't need, without polluting the core services with
client-specific logic. A service mesh solves the pain of implementing retries, timeouts, and mTLS
consistently across dozens of services without each team reinventing it in a different language.

### 3. What Actually Breaks

- **One BFF trying to serve every client** — defeats the purpose; if web and mobile need
  meaningfully different aggregation, a single "backend for frontend" serving both just becomes
  another generic backend with extra steps.
- **Adopting a service mesh with only a handful of services** — the operational complexity
  (sidecar per pod, mesh control plane, another thing to upgrade and debug) usually isn't justified
  until there are enough services that consistent retry/timeout/mTLS policy is a real pain point.
- **Business logic creeping into a BFF** — a BFF should aggregate and reshape, not make business
  decisions; logic that lives only in the BFF becomes invisible to other clients and to backend
  teams.
- **Assuming mesh sidecars fix application-level bugs** — a service mesh handles network-level
  retries and timeouts; it does nothing for an application bug that returns a wrong answer with a
  200 status code.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "SOA is mostly a historical term now — what most people mean by it today is closer to
  microservices without the shared enterprise service bus."
- "A BFF exists to aggregate and reshape calls for one specific client, not to hold business
  logic — if two clients need meaningfully different shapes, that's the actual signal to build one."
- "A service mesh handles network-level cross-cutting concerns consistently across many services;
  it's operational overhead that only pays off once there are enough services to make consistent
  policy worth the cost."

### 5. Interview-Ready Answer

> "I'd reach for a BFF when a specific client — usually mobile — needs meaningfully different
> aggregation than the others, so its round-trip and shaping logic doesn't leak into the core
> services or the web BFF. A service mesh is a different tool for a different problem: consistent
> retries, timeouts, and mTLS across many services via sidecars, and I'd only introduce it once
> there are enough services that reimplementing that logic per-service has become a real
> maintenance cost — not by default on a small system."

### 6. Go Deeper

Neither companion handbook has a dedicated Kubernetes or service-mesh-specific chapter; companion
Cloud Engineering Playbook's §3 (Running Containers on AWS: ECS & EKS) chapter is the closest real
mechanics reference; this book's §111 (monolith vs microservices) for when a system has actually
grown enough services to need this layer.

---
