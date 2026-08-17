## 95. Software Architecture Patterns Catalog, Part 1: Structuring a Single System

### 95.1 What This Catalog Adds

§12 and §42 already derived, from first principles, why and when to split a monolith and how to manage the resulting service fleet. This chapter and the next name the *specific, recognized architectural styles* that decision space actually produces — the names an architect uses on a whiteboard — and adds several styles (Clean/Hexagonal/Onion, SOA, and Part 2's event-driven and specialized styles) not previously named explicitly.

### 95.2 Monolith

**Problem it answers**: a small team needs to ship one working system without incurring any of the network, contract-versioning, or distributed-systems overhead described in §12.4 before that overhead is justified. **Structure**: one deployable unit, one codebase, one database (usually). **Advantages**: simple to develop, test, deploy, and reason about — every internal call is a real function call, not a network call (§3.2). **Disadvantages**: scales as one unit (§12.3-12.4); a bug in one area can, without internal discipline, affect unrelated areas; large team coordination becomes difficult past a certain size (§12.3). **When to use**: exactly Loop's Stage 0-1 situation (§81-84) — a small team, no organizational split pressure, no divergent per-component scaling need. **When not to use**: once §12.3's organizational or operational pressure is real and measured, not anticipated. **Real-world examples**: the overwhelming majority of successful startups begin here; Shopify famously ran (and still runs core commerce logic within) a large, deliberately-maintained monolith well past the point many assume monoliths stop scaling.

### 95.3 Modular Monolith

**Problem it answers**: a monolith's *organizational* coordination cost (§12.3) is becoming real, but the team isn't yet large enough, or the operational pressure isn't yet distinct enough, to justify §12.4's full network-boundary cost. **Structure**: one deployable unit, but internally organized into strictly-separated modules with enforced boundaries (often via language-level module/package boundaries and lint rules preventing cross-module reach-ins) — each module could, in principle, be extracted into its own service later with comparatively little rework, because its boundary was already disciplined even while co-deployed. **Advantages**: monolith's operational simplicity, with a meaningful fraction of microservices' organizational clarity. **Disadvantages**: the discipline enforcing module boundaries requires ongoing team buy-in and tooling — nothing prevents a team under deadline pressure from quietly violating a module boundary unless it's actively enforced. **When to use**: a team large enough to feel real organizational friction (§12.3) but not yet large enough, or without enough operational divergence (§12.3), to justify true service extraction — frequently the right answer for teams that reflexively jump straight from monolith to microservices without this genuinely useful intermediate step.

### 95.4 Layered (N-Tier) Architecture

**Problem it answers**: within a single deployable unit, different concerns (handling an external request, running business logic, accessing data) need to be separated so a change to one doesn't require understanding or risk breaking the others. **Structure**: strictly-ordered horizontal layers — commonly Presentation, Business Logic, Data Access — where each layer may only call the layer directly beneath it, directly the structure diagrammed in §93.5. **Advantages**: simple, well-understood, easy to onboard new engineers into. **Disadvantages**: strict layering can force data to pass through layers that add no real value for a given request, and a change that's conceptually about one *feature* (not one *layer*) often requires touching every layer, since layers are organized by technical concern, not by business capability. **Failure mode**: layers becoming a bureaucratic formality rather than a genuine boundary, with business logic leaking into the presentation layer under deadline pressure.

### 95.5 Clean Architecture, Hexagonal Architecture, and Onion Architecture

**Problem they answer**: layered architecture (§95.4) still lets the business logic layer depend, even indirectly, on details of specific frameworks or databases — meaning a database change or framework upgrade can still ripple into core business rules. These three related styles (differing mainly in diagramming convention and emphasis, not in core principle) all restate the Dependency Inversion Principle (§93.2) as a whole-application architecture: **business logic sits at the center, depending on nothing external**, and every technical detail (a specific database, a specific web framework, a specific message queue) is pushed to the outside, implementing interfaces the core defines — precisely inverting the naive layered architecture's dependency direction. **Ports and Adapters** is the specific name Hexagonal Architecture uses for this: the core defines "ports" (interfaces) it needs, and each specific technology is an "adapter" implementing a port — directly the Adapter pattern from §94.3, now applied at whole-application scale. **Advantages**: business logic can be tested with zero real infrastructure (no database, no framework) because it depends on nothing concrete; swapping a database or framework touches only its adapter, never core logic. **Disadvantages**: meaningfully more upfront structure and indirection than a simple layered approach — a real cost, justified specifically when business logic complexity and longevity are high enough that insulating it from technology churn matters (a payments engine expected to outlive three framework generations) and *not* justified for a short-lived internal tool.

```
Hexagonal / Clean / Onion (all restating the same core idea):

        [ Web Framework Adapter ]   [ Database Adapter ]
                    \                    /
                     \                  /
                  [ Ports (interfaces) ]
                            |
                    [ CORE BUSINESS LOGIC ]
                     (depends on NOTHING
                      external — only on
                      its own port interfaces)

Dependency arrows point INWARD, toward the core — exactly
DIP (§93.2) applied to the whole application, not one class.
```

### 95.6 Microservices

Already fully derived from first principles in §12 and operationalized at scale in §42 and §67 — included here only to name it explicitly alongside its siblings in this catalog. **Advantages/disadvantages/failure modes/scaling**: see §12.3-12.4, §42.4-42.5, §67 in full. **Real-world examples**: Netflix and Amazon are the most frequently cited large-scale adopters, and both companies' own public engineering writing (referenced throughout Parts II-III) documents the organizational, not merely technical, motivation behind their respective splits — directly reinforcing Conway's Law (§67.2) as the actual driver, not technology preference.

### 95.7 Service-Oriented Architecture (SOA)

**Problem it answers**: SOA predates modern microservices and solves a closely related but distinct problem — integrating multiple large, often independently-built enterprise systems (frequently including third-party or legacy software the organization doesn't fully control) so they can share functionality via well-defined service contracts, without each one needing direct, ad hoc integration with every other. **Structure**: services communicate through a shared **Enterprise Service Bus (ESB)** — a centralized integration and message-routing layer, distinct from microservices' typical preference for decentralized, direct service-to-service communication (§42.3) or event streams (§97). **Key distinction from microservices**: SOA's ESB is a shared, often heavyweight, centrally-governed integration layer; microservices architectures generally prefer smaller, independently-deployable services communicating directly or via lightweight, decentralized messaging, specifically to avoid the ESB becoming a bottleneck and a single point of organizational and technical coupling. **When SOA still appears**: large enterprises with substantial legacy and third-party system integration needs, where a centralized integration layer's governance benefits outweigh the coupling risk that motivated the shift toward microservices elsewhere in the industry.

### 95.8 Engineering Intuition for This Catalog

> **How do I know if I need Hexagonal/Clean Architecture, or if a simple layered approach is enough?** Ask how long this specific business logic is expected to live, and how likely its underlying technology (database, framework) is to change during that lifetime — high longevity and high technology churn risk justify the added indirection; a short-lived internal tool does not.
>
> **How do I distinguish SOA from microservices in an interview?** Name the integration mechanism — a shared, centrally-governed ESB points to SOA; decentralized, independently-deployed services communicating directly or via lightweight events points to microservices.
>
> **What would over-engineering this catalog look like?** Introducing Hexagonal Architecture's full port/adapter ceremony for a small monolith with one database that will never realistically change — real, if invisible, engineering cost paid for a flexibility the system will never use.

### 95.9 Exercises

1. A team's business logic is scattered with direct calls to a specific ORM's query builder throughout. Using §95.5, explain what architectural boundary is missing and what specific change (naming the pattern from §94.3) would restore it.
2. Explain, using §95.7, why a large bank integrating a 20-year-old mainframe system with several newer microservices might deliberately choose an ESB-based SOA approach for that specific integration, even while running microservices elsewhere.

---
