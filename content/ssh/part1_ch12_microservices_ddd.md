## 12. Mental Model: Microservices vs. Monoliths, and Domain-Driven Design

### 12.1 The Question Underneath the Buzzwords

Stripped of fashion, this chapter is about one question: **should one team's code and one other team's code live in the same deployable unit, or in separate ones?** A **monolith** answers "the same unit" — all functionality is built, tested, and deployed together as one artifact. **Microservices** answer "separate units" — functionality is split into independently deployable services that communicate over the network (§3, §4). Neither answer is inherently superior; each is a different resolution of the tradeoff between simplicity and independence. Service mesh, API gateways, and the operational mechanics of running many services are deferred to Pass 2, §42.

### 12.2 Why a Monolith Is Usually the Right Starting Point

A monolith's core advantage is that everything a request touches is one process, one codebase, one deploy: a function call between two pieces of logic is a real function call, not a network call (§3.2), which means it's fast, doesn't need a contract negotiated across a team boundary (§4.3), and can be refactored freely by whoever needs to, in one commit. For a small team, this is a substantial, often underrated advantage — the "change pressure" that motivated splitting a system (§1.2, shift 3) does not yet exist when one team owns everything.

### 12.3 Why Monoliths Eventually Strain

Two independent pressures push a monolith toward being split, and it matters which one is actually present, because they call for different responses. The first is **organizational**: once many teams work in the same codebase, they begin blocking each other — one team's bug or slow test suite delays every other team's release, and coordinating who owns what becomes its own overhead. The second is **operational**: once different parts of the system have very different scaling needs (one part is CPU-heavy and rarely used, another is lightweight but called constantly), deploying and scaling them as a single unit wastes resources and forces the whole system to be redeployed for a change to any one part. Splitting a monolith in response to the first pressure without the second (or vice versa) frequently produces a worse outcome than staying monolithic — this is why "just switch to microservices" is not, by itself, a valid engineering justification (§1.5).

### 12.4 The Price of Splitting: You Have Reintroduced Every Networking Problem

The moment functionality that used to be a function call becomes a network call between two services, every property established in §3.2 and §9 reapplies: the call can now fail partially, take unpredictable time, and be duplicated by a retry. A monolith's internal function calls are immune to all of this by construction; a microservices architecture buys organizational and operational independence at the direct cost of reintroducing distributed-systems complexity (§9) into what used to be simple, local logic. This is the single most important fact to hold onto when evaluating a proposed split: **you are not eliminating complexity, you are trading one kind (coordination within a shared codebase) for another (coordination across a network)**, and the trade is only worth it once the first kind has become more expensive than the second.

### 12.5 Domain-Driven Design: Deciding *Where* to Cut

If a split is justified, the next question is where to draw the boundary — and drawing it in the wrong place (e.g., splitting by technical layer, like "all database code" versus "all business logic," rather than by business capability) tends to produce services that must constantly call each other to complete any single real-world operation, reintroducing the tightly-coupled synchronous chains warned about in §11.1, just now across formal service boundaries instead of within one codebase. **Domain-Driven Design** is the discipline of identifying **bounded contexts** — coherent areas of business meaning (e.g., "billing," "inventory," "identity") within which terms and rules have one consistent meaning — and drawing service boundaries along those lines instead of along arbitrary technical ones. The mental-model takeaway: a good service boundary is one where most calls stay *inside* it and few calls need to cross *between* services, because every cross-boundary call inherits §12.4's cost.

### 12.6 Engineering Intuition

> **How do I know whether to split a monolith?** When you can name a specific organizational pain (teams blocking each other, unrelated deploys colliding) or a specific operational pain (wildly different scaling needs for different parts of the system) that is measurably costing you today — not a belief that microservices are simply more "modern" or "correct."
>
> **What symptoms indicate a monolith is genuinely straining?** Deploy frequency dropping as team count grows; a disproportionate share of incidents caused by unrelated changes interacting badly in the same deploy; one part of the system needing to scale to ten times the servers of another part solely because they're forced to scale together.
>
> **What metrics indicate it?** Deploy lead time and deploy failure rate trending worse as headcount grows; resource utilization imbalance across logically distinct parts of the system.
>
> **What breaks first if you split prematurely?** Latency and failure rate both increase, because operations that used to be one fast, reliable function call are now one or more slow, potentially-failing network calls (§12.4) — with none of the organizational benefit realized yet, because the team was small enough not to need it.
>
> **When should you *not* split?** Whenever a single team (or a small number of teams that coordinate easily) owns the whole system and it has no significant operational imbalance — which describes most systems for a large part of their lifetime (§82–84 in Part IV).
>
> **What would a hyperscale company do?** Run hundreds or thousands of independently-deployable services, organized deliberately along domain boundaries (§12.5), specifically because they have far more teams than any single codebase could support without constant collision (§67).
>
> **What would a two-person startup do?** Build and stay on a single monolith for a very long time, because two people cannot generate the organizational pressure that justifies the operational cost of splitting.
>
> **What changes with scale?** At small team size and moderate load, a monolith is close to strictly better. The case for splitting strengthens as team count grows (organizational pressure) or as specific components' scaling needs diverge sharply (operational pressure) — a transition Part IV places explicitly around §86, not before.

### 12.7 Exercises

1. For a system you know, argue whether its current pain (if any) is organizational, operational, both, or neither, using §12.3's distinction — and whether microservices would actually address that specific pain.
2. Propose a domain-driven boundary for splitting a monolithic e-commerce application (e.g., along "inventory," "orders," "billing," "identity") and identify which operations would now require a cross-service call that used to be a single function call.

### 12.8 Further Reading

- Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software* — the origin of the bounded-context concept underlying §12.5.
- Martin Fowler & James Lewis, "Microservices" (martinfowler.com) — a foundational, notably balanced treatment of the tradeoffs summarized in this chapter, written before the term became a default assumption.

---
