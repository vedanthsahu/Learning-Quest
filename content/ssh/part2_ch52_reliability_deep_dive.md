## 52. Reliability Engineering Deep Dive: SLIs/SLOs/Error Budgets, Redundancy, Failover, Chaos Engineering

### 52.1 What This Chapter Adds to §19

§19 established SLIs, SLOs, error budgets, redundancy, and chaos engineering at the mental-model level. This chapter covers the concrete mechanics: how to actually choose and measure an SLI, how error budget policy operates day to day, the specific redundancy and failover architectures, and how a real chaos engineering program is structured.

### 52.2 Choosing SLIs That Actually Reflect User Experience

Not every technically-measurable metric makes a good SLI. A good SLI is measured as close to the actual user experience as possible — for a web service, the fraction of HTTP requests completed successfully within an acceptable latency, measured at the load balancer or edge (as close to the real user as the system can observe), rather than a server-side, internal metric that might look healthy even while users experience failures the internal metric never captures (e.g., a load balancer failing to route a request to any backend at all wouldn't appear in a purely server-side success-rate metric). The engineering discipline here: work backward from "what would a user actually complain about" and choose an SLI that would detect exactly that, rather than choosing an SLI merely because it's convenient to measure from wherever instrumentation already exists.

### 52.3 The Error Budget Policy: What Actually Happens When the Budget Is Spent

§19.3 introduced the error budget as a resource that, once exhausted, is a signal to slow down. In practice, this requires an explicit, pre-agreed **error budget policy** — a concrete, specific statement of what changes when the budget is spent, decided calmly in advance rather than negotiated under pressure during an actual incident. A typical policy might specify: once the rolling error budget for a service is exhausted, feature releases to that service are paused (though critical fixes and security patches continue), and engineering priority shifts explicitly to reliability work until the budget recovers. The value of deciding this in advance, as policy, rather than case by case, is that it removes an otherwise-recurring, often contentious negotiation ("should we ship this feature or focus on stability") and replaces it with a standing, objective, pre-agreed rule triggered automatically by the measured data.

### 52.4 Redundancy Architectures: Active-Passive vs. Active-Active

Given §19.4's general redundancy argument, two concrete architectures implement it differently:

- **Active-passive**: one instance (or region) actively serves all traffic while a standby copy remains ready but idle, taking over only if the active instance fails (**failover**). Simpler to reason about (only one copy is ever actually serving live traffic and mutating state at a time, avoiding the multi-writer coordination concerns from §9 and §36), but the standby capacity sits unused most of the time, a direct cost, and failover itself takes some nonzero time (detecting the failure, then redirecting traffic), during which the system is degraded or unavailable.
- **Active-active**: multiple instances (or regions) simultaneously serve live traffic, with load distributed across all of them. No capacity sits idle, and the loss of any one instance simply means the others absorb its share of traffic — potentially with no visible failover event at all — but this requires solving the genuinely harder problem of keeping multiple simultaneously-active, simultaneously-writing instances consistent with each other, directly invoking the consensus, quorum, and consistency-model machinery from §34, §36, and §38 rather than sidestepping it.

The choice between them is, again, §1.7's tradeoff shape: active-passive is operationally simpler at the cost of wasted standby capacity and a failover gap; active-active eliminates that waste and gap at the cost of substantially harder multi-writer consistency engineering — a cost that is often deferred until the specific scale or availability requirement genuinely demands paying it (§87-89).

### 52.5 Failover Mechanics: Detecting Failure and Redirecting Traffic

A concrete failover sequence requires, first, reliable **failure detection** — commonly health checks (§28.5) or a heartbeat mechanism, tuned carefully to distinguish genuine failure from transient slowness (recall §9.2's fundamental "slow versus dead" ambiguity — an overly aggressive detection threshold produces false-positive failovers triggered by mere slowness, while an overly conservative one delays a genuine failover unacceptably long). Second, **traffic redirection** — updating DNS (subject to the TTL caching delay from §27.6), reconfiguring a load balancer (§28), or updating a service discovery mechanism, so that new requests reach the newly-active instance instead of the failed one. The total time from actual failure to fully-redirected traffic — the **failover time** — is itself a measurable, tunable, and often business-critical number, directly informing the achievable SLO (§52.2) for any service relying on this failover mechanism as its primary reliability strategy.

### 52.6 Chaos Engineering in Practice: A Structured Program, Not Random Sabotage

§19.5 introduced chaos engineering as deliberately injecting failure to verify reliability mechanisms actually work. A disciplined program follows a specific structure, not ad hoc, unplanned disruption: first, define a **steady-state hypothesis** — a measurable, expected-normal behavior of the system (e.g., "p99 latency stays under 200ms and error rate stays under 0.1%"); then, inject a specific, controlled failure (terminate an instance, introduce network latency between two services, exhaust a resource); then, observe whether the steady-state hypothesis still holds during and after the injected failure; and finally, if it doesn't hold, treat that as a genuine finding — a real gap between assumed and actual resilience — to be fixed, not merely documented. Mature programs run this deliberately in production (not only in a staging environment, since production is the only environment where real traffic, real data volume, and real infrastructure complexity are actually present) but do so with careful scoping (a small, bounded blast radius, an easy and immediate abort mechanism) so that a chaos experiment that reveals a genuine gap doesn't itself cause the very outage it was meant to responsibly uncover.

### 52.7 Common Mistakes and Production Debugging Signals

- Choosing an SLI that's convenient to measure (an internal server metric) rather than one that reflects real user experience (§52.2), producing a dashboard that stays green while real users experience real problems the chosen SLI simply cannot see.
- Having an error budget and SLO defined on paper with no actual, agreed policy for what changes once the budget is exhausted (§52.3), rendering the entire framework a reporting exercise rather than a genuine decision-making tool.
- Assuming an active-passive failover mechanism works correctly without ever actually testing a real failover (directly the gap chaos engineering, §52.6, exists to close) — discovering during a real incident that the standby wasn't actually receiving replicated data correctly (§34.6) is a far more costly way to learn this than a deliberate, controlled chaos experiment.

### 52.8 Engineering Intuition

> **How do I know if my SLI actually reflects user experience?** Ask whether a scenario a real user would clearly experience as "broken" would actually move your chosen SLI — if you can construct a plausible user-visible failure that your SLI wouldn't detect, the SLI needs to be measured closer to the actual user.
>
> **What symptoms indicate an error budget policy gap?** Recurring, ad hoc arguments about whether to ship a risky change, with no standing, pre-agreed rule to settle the question — a sign the policy exists only as a number, not as an actual decision framework.
>
> **What metrics indicate a redundancy/failover gap?** Failover time, measured directly during actual chaos experiments (§52.6) rather than assumed from architecture diagrams alone; replica lag (§34.4) at the moment of a real or simulated failover, which determines how much data, if any, is lost.
>
> **What breaks first if failover is never actually tested?** The standby or redundant path, untested, frequently turns out not to work exactly as assumed — stale replication, missing configuration, an overlooked dependency — and this is discovered at the worst possible moment: during a real, live incident, rather than during a controlled, scheduled test.
>
> **When is active-passive clearly sufficient, without needing active-active's added complexity?** When the failover time (§52.5) is well within the service's actual SLO tolerance, and the cost of active-active's harder consistency engineering (§52.4) isn't justified by a requirement for zero visible downtime.
>
> **What would a hyperscale company do?** Run continuous, automated, production chaos engineering programs (Netflix's Chaos Monkey being the most widely cited example, §74), use active-active architectures for their most availability-critical services despite the added consistency engineering cost, and enforce error budget policies as genuine, automated release gates rather than manual, negotiated decisions.
>
> **What would a two-person startup do?** Define a simple, honest SLO and a lightweight, informally-agreed error budget policy, use active-passive failover for their most critical dependency, and test that failover manually and occasionally rather than running a continuous automated chaos program.
>
> **What changes with scale?** At small scale, an honest, manually-tested active-passive setup with a simple SLO is proportionate. At large scale, where downtime cost and user expectations both grow substantially, active-active architectures, continuous automated chaos testing, and strictly-enforced error budget policies become standard, necessary practice (§74).

### 52.9 Exercises

1. Propose an SLI for a specific user-facing feature you know, and stress-test it by describing a realistic user-visible failure scenario, checking whether your proposed SLI would actually detect it.
2. A team has an active-passive database setup with asynchronous replication (§34.3) and has never tested an actual failover. Using §52.6, design a minimal, safely-scoped chaos experiment to validate that failover actually works as assumed, and specify the steady-state hypothesis it should test against.

### 52.10 Further Reading

- Google, *Site Reliability Engineering*, Chapters 3-4 and 34 — the authoritative treatment of SLIs, SLOs, error budget policy, and testing for reliability underlying this entire chapter.
- Casey Rosenthal & Nora Jones, *Chaos Engineering* — the definitive practitioner's guide to structuring a real chaos engineering program, directly extending §52.6.

---
