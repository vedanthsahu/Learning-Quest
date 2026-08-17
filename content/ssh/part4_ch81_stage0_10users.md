## 81. Stage 0 → 10 Users: One Server, One Database, One Frontend

### 81.1 Requirements at This Stage

Loop has just been built. There are 10 users — friends and family of the founder, testing the product. Daily active usage is sporadic. There is no growth pressure, no uptime commitment, and no data volume worth discussing. Per §80.3's requirements framework: read/write ratio is unknown and irrelevant at this volume; consistency requirements are whatever a single, unreplicated database naturally provides (§32.2's ACID guarantees, uncomplicated by any distribution); availability requirements are informal ("try not to be down when I'm showing a friend the app").

### 81.2 The Architecture

```
[ Browser ] --HTTPS--> [ Single Server: app process + database, same machine ]
```

One virtual machine (or one managed container instance) runs the entire application: a single backend process serving both the API and the served frontend assets, talking to a single relational database (§7.3) running on the same machine. There is no load balancer (there is exactly one server — nothing to balance across, §28), no cache (§10 — there is no meaningful read volume to justify one), no queue (§11 — every operation, including sending a welcome email on signup, happens synchronously inline, and this is fine at this volume), and no CDN (§59.4 — ten users don't justify global edge infrastructure).

### 81.3 Estimation, Performed Anyway

Per §80.4's method, applied honestly even though the answer is unremarkable: 10 users, generously assumed to perform 50 actions each per day, is 500 actions/day — under 0.01 requests per second on average, and even a generous 10x peak multiplier (§23.3) leaves well under 1 request/second at peak. Storage: even assuming a generous 5KB per post including metadata, 10 users each posting 10 times a day for a year is roughly 18MB. Every single number in this estimation rounds down to "irrelevant" — and that conclusion is exactly the point of doing the estimation: it is not a wasted exercise, it is the calculation that *justifies*, with actual numbers rather than assumption, why nothing beyond a single server is warranted yet.

### 81.4 Deploy It, Measure It

The application is deployed to a single managed compute instance with a managed single-instance database (§43.4 — a managed database is used even at this trivial scale, because the operational cost of self-hosting one, per §13.5, is never justified merely by scale being small; if anything, small scale is exactly when a managed service's convenience is least questionable). Basic logging is enabled (simple, unstructured logs are entirely adequate at this volume, per §48.7's explicit "when is unstructured logging good enough" guidance). No formal SLO exists yet — there is no meaningful error budget to define (§52.2) when ten known users will simply mention it directly if something's wrong.

### 81.5 What This Stage Deliberately Does Not Have, and Why That's Correct

Per §1.5 and §80.6: no read replicas (§34 — no read load to scale), no sharding (§35 — a rounding error's worth of data), no message queue (§11 — nothing asynchronous is needed yet), no service mesh or microservices split (§12, §42 — one team, one codebase, zero organizational pressure), no CI/CD pipeline beyond the most basic automated deploy (§15 — though even here, basic automated tests and a single-command deploy are adopted immediately, per §15.6's explicit note that CI/CD is one of the few practices worth adopting from day one regardless of scale), and no formal incident response process (§24, §57 — the "incident response process" is currently "the founder notices and fixes it").

### 81.6 Retrospective: Architecture Decision Record

```
ADR-001: Single-server, single-database architecture for Loop's launch

Context: Loop is launching to a small, known group of test users
with no meaningful load or availability requirements.

Decision: Deploy as a single application server plus a single
managed database instance, no caching, queuing, or horizontal
scaling infrastructure.

Alternatives considered:
  - A "production-grade" microservices architecture from day one:
    rejected. No organizational or operational pressure (§12.3)
    exists to justify the complexity, and it would slow initial
    iteration for no measurable benefit.

Consequence: This architecture will not survive significant
growth unchanged. It is expected to be revisited at the first
sign of real, measured load (§82) — not before.
```

### 81.7 Engineering Intuition for This Stage

> **How do I know Stage 0 is the right stage to be at?** If your estimation exercise (§81.3), performed honestly, produces numbers that round down to "irrelevant" across traffic, storage, and concurrency, you are at Stage 0, regardless of how sophisticated a system you might be tempted to build.
>
> **What would over-engineering at this stage look like, concretely?** Introducing Kubernetes (§14, §45), a message queue (§11), or a microservices split (§12) before a single, measurable symptom justifies any of them — each is a real, well-covered pattern elsewhere in this handbook, and each is wrong specifically *here*, at this stage, for lack of the constraint that would justify it.
>
> **What is the one practice worth adopting even at this trivial scale?** Basic CI (automated tests on every change, §15.2) and a simple, repeatable deployment process — cheap enough to set up immediately and valuable from the very first commit, unlike almost everything else in this handbook, which should wait for its justifying constraint.

### 81.8 Exercises

1. Loop's founder asks whether they should "build it right the first time" with a microservices architecture, anticipating future growth. Using §81.6's ADR and the general principle from §1.5, write the one-paragraph response you would give.
2. Perform §80.4's estimation exercise for a hypothetical Stage 0 product of your own choosing, and confirm whether the resulting numbers genuinely justify a single-server architecture.

---
