## §157. Strangler Fig and Legacy Migration Patterns

### 1. The Vocabulary

- **Strangler fig pattern** — gradually replacing a legacy system by routing an increasing share of
  traffic or features to a new system while the old one keeps running, until the old system handles
  nothing and can be safely decommissioned — named after a vine that grows around a host tree.
- **Facade/routing layer** — a thin layer in front of both old and new systems that decides,
  per-request or per-feature, which one handles it — the mechanism that makes gradual migration
  possible without a client-visible cutover.
- **Big bang rewrite (anti-pattern, for contrast)** — replacing an entire legacy system at once;
  historically has a poor track record because it defers all risk to one large, high-stakes cutover
  instead of spreading it out.
- **Feature parity** — the new system must replicate the old system's actual behavior (including
  its undocumented quirks) for the specific feature being migrated, not just its intended behavior
  — a frequent source of "the new system is technically correct but broke someone's workflow."

### 2. Where It Sits, and Why Teams Use It

The strangler fig pattern exists because rewriting a large legacy system in one shot is
consistently one of the riskiest things a team can do — requirements drift during the long rewrite,
undocumented behavior gets lost, and there's a single high-stakes cutover moment where everything
must work. Migrating gradually, one feature or one traffic slice at a time, means each step is
small enough to verify and roll back independently, and the legacy system keeps serving everything
not yet migrated the whole time.

### 3. What Actually Breaks

- **No routing layer, so migration means an all-or-nothing cutover anyway** — without an explicit
  facade deciding old-vs-new per request, "gradual" migration collapses back into a big-bang
  rewrite by default.
- **Migrating features without verifying real behavior, only documented behavior** — legacy systems
  often have undocumented quirks users depend on; a new system that matches the spec but not the
  actual old behavior breaks real workflows on cutover.
- **Never actually finishing the migration** — the strangler fig pattern can stall indefinitely,
  leaving two systems running in parallel forever, with the added complexity of the routing layer
  and dual maintenance becoming a permanent, unplanned cost instead of a temporary one.
- **Data consistency between old and new systems during the transition** — if both systems can be
  written to during migration, keeping their data in sync (or clearly partitioning who owns what)
  is a real, often underestimated design problem.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "For a legacy migration, I'd default to strangler fig over a big-bang rewrite — routing traffic
  incrementally so each step is independently verifiable and reversible."
- "I check actual production behavior, not just documented behavior, before considering a migrated
  feature done — legacy quirks that users depend on are a common source of migration breakage."
- "I set an explicit plan and timeline for decommissioning the old system, since strangler
  migrations can otherwise stall indefinitely with both systems running forever."

### 5. Interview-Ready Answer

> "For migrating off a legacy system, I'd use the strangler fig pattern rather than a full rewrite
> — a routing layer that gradually shifts traffic or specific features to the new system, so each
> step can be verified and rolled back independently instead of betting everything on one cutover.
> I'd specifically check the legacy system's actual production behavior, not just its documented
> behavior, before considering a migrated feature complete, since undocumented quirks are a common
> source of breakage. And I'd set an explicit target for fully decommissioning the old system,
> since these migrations can otherwise run in parallel indefinitely."

### 6. Go Deeper

Neither companion book has a dedicated legacy-migration chapter; companion Software Systems
Handbook's §67 (Microservices at Scale: mesh at scale, Conway's Law) chapter is the closest real
reference for the surrounding organizational/architectural context; this book's §96 (rollout
plans/backward compatibility) for the adjacent gradual-rollout discipline.

---
