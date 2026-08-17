## §111. Monolith, Modular Monolith, and Microservices

### 1. The Vocabulary

- **Monolith** — one deployable unit containing all the application's logic, sharing one codebase,
  one build, and usually one database.
- **Modular monolith** — still one deployable unit, but internally organized into strict,
  well-bounded modules with clear interfaces between them — the internal discipline of
  microservices without the network calls.
- **Microservices** — the application is split into independently deployable services, each
  usually owning its own data store, communicating over the network (HTTP/gRPC/messaging).
- **Bounded context** — a term from Domain-Driven Design for "the area where a specific model and
  vocabulary apply" — the actual seam along which both modular monoliths and microservices should
  be split.
- **Distributed monolith (anti-pattern)** — services that are technically separate deployables but
  so tightly coupled (shared database, synchronous call chains, coordinated deploys) that they
  have all of microservices' network cost and none of the independence benefit.

### 2. Where It Sits, and Why Teams Use It

This is the single most over-discussed and under-understood architecture decision in the industry.
Most companies that eventually need microservices started as a monolith, and most companies that
adopt microservices too early end up with a distributed monolith — worse than what they started
with. The decision is really about organizational scaling (can multiple teams ship independently
without stepping on each other) more than technical scaling (can the app handle load) — a
monolith can serve enormous traffic just fine with good caching and read replicas.

### 3. What Actually Breaks

- **Splitting services before the bounded contexts are clear** — services drawn along guessed
  lines instead of real domain seams end up needing constant cross-service calls just to complete
  one business operation, which is slower and less reliable than a single in-process function call.
- **Shared database across "microservices"** — the most common distributed-monolith trap: two
  services calling separately deployable code, but both reading and writing the same tables, so
  they can never actually deploy independently without coordination.
- **Choosing microservices for a small team** — the operational cost (service discovery, distributed
  tracing, N deployment pipelines, network failure handling) is real and constant; a team of five
  engineers usually pays more in this tax than it gains in independent deployability.
- **A modular monolith with leaky modules** — declaring "modules" that still reach into each
  other's internal tables or classes directly, which is a modular monolith in name only.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I'd default to a monolith, ideally a modular one with clear internal boundaries, unless there's
  a concrete organizational reason (multiple independent teams, wildly different scaling needs per
  component) to split further."
- "I look for bounded contexts — real domain seams — before drawing service boundaries, not
  arbitrary technical splits."
- "A shared database between two 'microservices' is a smell — it means they can't actually deploy
  independently."

### 5. Interview-Ready Answer

> "I don't treat microservices as an automatic upgrade from a monolith — I default to a modular
> monolith, with clear internal module boundaries along real bounded contexts, and only split into
> actual separate services when there's a concrete driver: independent team ownership, wildly
> different scaling profiles, or a genuine need to deploy one part without touching the rest. A
> lot of 'microservices' architectures I've seen are really distributed monoliths — separately
> deployed, but still sharing a database or a synchronous call chain — which gets you the network
> cost without the independence."

### 6. Go Deeper

companion Software Systems Handbook's §12 (Mental Model: Microservices vs Monoliths, DDD) chapter
for the full bounded-context methodology; this book's §112 (serverless/event-driven) and §114
(service mesh) for the operational layer that microservices architectures actually need once
adopted.

---
