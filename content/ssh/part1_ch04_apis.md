## 4. Mental Model: Backend & APIs

### 4.1 What This Chapter Covers

§3 established that a request travels through a network to reach your code. This chapter asks: once it arrives, why does your code expose an **API** at all, rather than letting callers reach in directly? Protocol-level detail (REST maturity levels, gRPC, GraphQL, pagination, idempotency keys) is deferred to Pass 2, §29.

### 4.2 The Problem: Letting Other Code Depend on Yours, Safely

The moment more than one piece of software needs to use functionality you wrote — a mobile app and a web app both needing "get user profile," or one internal service needing data owned by another — you face a choice about *how* they depend on you. The naive answer, "let them read your database directly" or "let them call your internal functions directly," works for exactly as long as your internals never change. The instant you rename a column, change a data type, or restructure your internal logic, every caller that depended on those internals breaks, simultaneously, without warning.

An **API** is the engineering answer to this problem: a deliberately narrow, explicitly-versioned surface that you promise to keep stable, behind which you are free to change anything you want. This is a direct instance of the "change pressure" identified in §1.1 — APIs exist so that a system can be modified by people who did not write the original code, without those changes breaking every caller. The API is a *contract*: callers agree to only rely on what the contract promises, and the owner agrees to keep the contract's promises even while changing everything behind it.

### 4.3 What an API Contract Actually Promises

A useful mental model: an API is not "a way to call code over the network" (that's just a mechanism) — it is a **promise about shape and behavior** that both sides can rely on without seeing each other's source code. Concretely, a contract typically promises:

- **Shape**: what fields exist in a request and response, and their types.
- **Behavior**: what happens for valid input, and what happens for invalid input (an error, and what kind).
- **Stability**: how and when the contract itself is allowed to change (this is what API *versioning* exists to manage).

Violating any of these — silently changing a field's type, silently changing what an error means, removing a field without warning — is a **breaking change**, and the entire discipline of API versioning (§29) exists to let an owner evolve their system without imposing breaking changes on every caller simultaneously.

### 4.4 Synchronous vs. Asynchronous: The First Fork in Every API Decision

Every interaction across an API forces a choice with consequences that ripple through the whole system: does the caller *wait* for the answer (**synchronous**), or does the caller hand off the request and get notified (or check back) later (**asynchronous**)?

Synchronous calls are simpler to reason about — the caller's code reads top-to-bottom as if the call were local — but they chain the caller's own responsiveness to the callee's. If your service calls another service synchronously, and that service is slow, your service is now slow too, and if enough calls pile up waiting, this is exactly the cascading failure pattern from §1.3.3. Asynchronous calls decouple the two — the caller can move on immediately — at the cost of real complexity: the caller no longer has an answer *right now*, and the system needs some mechanism (a queue, a webhook, a polling endpoint) to eventually deliver the result. This exact tension is why message queues and event-driven architectures exist at all, and it is developed fully starting at §11.

### 4.5 Why "Just Expose the Database" Fails as You Grow

It is worth being explicit about why the naive alternative to an API — letting every caller talk to the database directly — reliably fails, because the failure is instructive about contracts in general. A database schema is an *internal implementation detail* of whatever owns that data: it reflects storage and query-performance concerns, not the needs of every possible caller. The moment two unrelated callers both depend on the raw schema, the schema itself becomes something that can never change without coordinating every caller by hand — which defeats the entire purpose of splitting a system into independently-changeable parts (§1.2, shift 3; §12). An API exists specifically to sit between callers and internal storage so that the storage can evolve freely.

### 4.6 What APIs Cannot Fix

An API contract disciplines the *interface*; it does not by itself guarantee availability, correctness under concurrent access, or that both sides agree on the contract's current version. Two services can each faithfully implement "their side" of a contract and still produce a coordination failure (§1.3.2) if one has deployed a new version of the contract and the other has not — this is why contract/schema evolution and versioning strategy (§29) is treated as a first-class engineering problem, not an afterthought, in Pass 2.

### 4.7 Engineering Intuition

> **How do I know I need a formal API, rather than an ad hoc integration?** The moment a second, independently-deployed piece of software needs to consume something you own, you need a contract — even if today that "second piece of software" is just a different version of your own frontend.
>
> **What symptoms indicate a missing or weak contract?** Deploys of one service routinely break another team's service; "just check with them before you deploy" is a real, spoken step in your release process; nobody can say with confidence which callers depend on which fields.
>
> **What metrics indicate it?** A spike in 4xx/5xx errors on one service correlated in time with a deploy of a *different* service; the number of "hotfix, revert the field rename" incidents per quarter.
>
> **What breaks first if you ignore this?** Any internal refactor becomes globally risky, because there is no boundary containing the blast radius (§1.3.3) of a change — this is precisely the "organizations outgrew a single team's head" pressure from §1.2.
>
> **When should you *not* build a formal versioned API?** Inside a single deployable, single-team codebase, an internal function call is a perfectly good "contract" — formal API versioning machinery is a cost you pay to manage change *across* independent deployment boundaries, and it is wasted effort within one.
>
> **What would a hyperscale company do?** Maintain schema registries, contract testing, and automated breaking-change detection in CI, because with thousands of services, a human "just check with them" process cannot scale (§67).
>
> **What would a two-person startup do?** A simple REST API with an informal, undocumented contract and no versioning at all — perfectly reasonable when the same two people own both sides of every call.
>
> **What changes with scale?** At 100 users with one team, the "contract" is a shared understanding in two people's heads. At 1,000,000+ users with dozens of teams, the contract must be written down, tested automatically, and versioned explicitly, because no shared understanding can scale to that many simultaneous callers and changes (§67).

### 4.8 Exercises

1. Identify one place in a system you know where a caller depends on another component's internal implementation detail rather than a stable contract. What would have to change for that dependency to break?
2. For a synchronous API call you rely on daily, argue what would have to be true about it for calling it asynchronously to be strictly better, and what would be lost by doing so.

### 4.9 Further Reading

- Roy Fielding, *Architectural Styles and the Design of Network-based Software Architectures* (2000) — the dissertation that introduced REST; read for the *why*, since the term is now used far more loosely than the original argument.
- Martin Fowler, "Consumer-Driven Contracts" — the conceptual bridge between §4.3's notion of a contract and the automated contract-testing practices referenced in §4.7.

---
