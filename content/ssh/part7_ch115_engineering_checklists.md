## 115. Engineering Decision Checklists

### 115.1 Before Sharding a Database

- [ ] Confirmed a single, well-indexed, appropriately-replicated database genuinely cannot handle current or near-term load (§35.2, §108.9) — not sharding preemptively.
- [ ] Modeled actual (not just logical) load distribution across the proposed shard key (§114.1) to rule out hot-partition risk.
- [ ] Chosen a shard key that keeps the large majority of queries scoped to a single shard, avoiding expensive cross-shard joins/queries (§35.3).
- [ ] Planned a resharding strategy for future growth, not just the initial shard count (§35.4, §63).
- [ ] Considered a hybrid approach (dedicated isolation for known large outliers) if load is expected to be highly skewed (§114.1).

### 115.2 Before Splitting a Monolith into Microservices

- [ ] Confirmed the motivation is genuine team-boundary friction or independent scaling need, not aspiration (§108.1, §113.2).
- [ ] Drawn service boundaries along genuine bounded contexts (§12), not an arbitrary or convenience-based split.
- [ ] Planned distributed-transaction handling (saga pattern, §41.5) for any workflow spanning multiple services before the split, not after the first incident.
- [ ] Verified the organization has enough teams to meaningfully own the proposed number of services (§113.2's ratio lesson).
- [ ] Planned service-mesh/observability tooling (§42, §48) proportional to the new service count, not left as an afterthought.

### 115.3 Before Deploying Multi-Region Infrastructure

- [ ] Established a genuine driver: measured latency problem for a specific user population, or a real data-residency/regulatory requirement (§55, §88) — not deployed preemptively.
- [ ] Measured actual cross-region latency (application-to-database, not just CDN/static-asset) before assuming multi-region app servers alone solve the problem (§114.4).
- [ ] Chosen a replication mode (synchronous vs. asynchronous, active-passive vs. active-active) justified by the actual consistency requirement (§38, §108.4), not a default assumption.
- [ ] Planned and tested a failover/disaster-recovery procedure (§74), not just the happy-path multi-region deployment.

### 115.4 Before Adding a Caching Layer

- [ ] Confirmed the target is genuinely read-heavy with real read amplification or expensive computation (§10, §39) — not added as a reflexive default.
- [ ] Designed an explicit invalidation strategy for the specific "we need to correct this now" case (§113.4), not TTL-only expiry.
- [ ] Added stampede/thundering-herd protection (request coalescing, jittered expiry) for high-traffic keys (§39.4, §112.4).
- [ ] Determined which fields/data genuinely need fresher reads than others, rather than caching or not caching a whole entity uniformly (§109.3).

### 115.5 Before Choosing NoSQL Over a Relational Database

- [ ] Confirmed the actual access pattern and consistency requirement, per dataset, genuinely favor NoSQL's tradeoffs (§7.5, §108.2) — not chosen for "web scale" reputation.
- [ ] Verified a well-sharded relational database (§62's NewSQL options included) has actually been ruled out as insufficient, not just assumed insufficient.
- [ ] Considered per-dataset database choice rather than one database category for the entire system (§96).

### 115.6 Before Introducing a Message Queue

- [ ] Confirmed the caller genuinely doesn't need an immediate, synchronous result (§108.7) — not added by default to "decouple."
- [ ] Planned delivery-guarantee requirements explicitly (at-least-once vs. exactly-once, §40) and designed for idempotent consumption regardless.
- [ ] Planned dead-letter-queue handling for messages that repeatedly fail processing (Part V §91.E), not an infinite-retry default.
- [ ] Considered ordering requirements per use case (partition-key choice, §40.3) rather than assuming global ordering is free or necessary.

### 115.7 Before Adopting Kubernetes/Container Orchestration

- [ ] Confirmed genuine multi-service orchestration or scaling coordination needs exist (§108.6, §86) — not adopted by default for a small system.
- [ ] Planned readiness/liveness probes that reflect actual application readiness, not just process-running status (§112.2, §45).
- [ ] Assessed whether the team has the operational capacity to run and maintain a cluster, not just deploy onto one.

### 115.8 Before a Major Database or Infrastructure Migration

- [ ] Rehearsed the migration against production-representative data volume, not a smaller convenient test set (§113.3).
- [ ] Chosen a replication-based, low-downtime cutover strategy where minimizing downtime matters, rather than defaulting to dump-and-restore (§113.3, §34).
- [ ] Defined an explicit rollback plan before starting, not improvised mid-migration.

### 115.9 Before Declaring or Committing to an SLO

- [ ] Defined the SLO based on actual business/user need, not maximized toward 100% by default (§108.8, §52.2).
- [ ] Established an error budget and an explicit policy for what happens when it's exhausted (§52.3).
- [ ] Confirmed the SLIs backing the SLO are actually measurable with current instrumentation (§16, §48).

### 115.10 Before a Production Deployment (Any Change)

- [ ] Chosen a progressive rollout strategy (canary, staged flag rollout, §46.3, §110.4) rather than 100%-at-once for any behavior-affecting change.
- [ ] Defined explicit go/no-go monitoring checkpoints between rollout stages (§52's SLO-based criteria).
- [ ] Verified idempotency/retry-safety for any change touching payment, inventory, or other exactly-once-sensitive flows (§105.5, §110.2).

### 115.11 Before Adding a Circuit Breaker or Bulkhead

- [ ] Identified whether the target dependency is genuinely essential to the calling path's success or optional (§110.5, §112.3) — configuring accordingly, not uniformly.
- [ ] Set timeout/reopen thresholds based on that specific dependency's actual latency/recovery characteristics, not a single default across every dependency (§110.5).
- [ ] Isolated the dependency's resource pool (threads/connections) so its failure cannot exhaust resources needed by unrelated, healthy calls (§42.5, §112.3).

### 115.12 Engineering Intuition

> **How should these checklists actually be used?** As a pre-mortem tool run before the decision, not an audit performed after something has already broken — every item traces to a specific, named case study or trap elsewhere in this handbook that the checklist exists to prevent recurrence of.

> **What would over-engineering checklist usage look like?** Running the full "Before Multi-Region" checklist for a small internal tool with no genuine latency or residency driver — match checklist rigor to the actual scale and stakes of the system, exactly as §108.10's meta-trap warns against applying sophistication without a justifying constraint.

### 115.13 Further Reading

- Every cross-referenced section above traces to its full mechanism or case-study treatment earlier in this handbook — these checklists are deliberately terse pointers, not replacements for that depth.

---
