## §57. Blast Radius, Multi-AZ, and Disaster Recovery

### 1. The Vocabulary

- **Single point of failure (SPOF)** — any one component whose failure takes down the whole
  system.
- **Blast radius** — how much of the system is affected when a given component fails — the design
  goal is shrinking this, not just avoiding failure entirely (which is impossible).
- **Multi-AZ (Availability Zone)** — running redundant infrastructure across physically separate
  data centers within a region, so one AZ's outage doesn't take the whole service down.
- **Disaster recovery (DR)** — the plan for recovering from a major, region-level (or worse)
  failure, including RPO/RTO targets (§35).

### 2. Where It Sits, and Why Teams Use It

No system avoids failure entirely — the realistic design goal is making sure any single failure's
blast radius is small and recoverable, rather than pretending failure won't happen.

### 3. What Actually Breaks

- **A "redundant" setup that's actually a single point of failure in disguise** — two application
  instances behind a load balancer sounds redundant, until you notice they both depend on one
  database instance with no replica, or share one network path — true redundancy requires
  checking every layer, not just the one that's easiest to duplicate.
- **Everything in one Availability Zone** — a single AZ outage (power, networking, hardware) takes
  the entire service down even with multiple instances, if all of them happen to live in that one
  AZ.
- **No tested DR plan** — similar to §35's backup-restore point: a DR plan that's never been
  actually exercised is an assumption, not a verified capability.
- **Underestimating blast radius of a shared dependency** — a shared config service, shared auth
  service, or shared database that many otherwise-independent services all depend on means a
  failure there has a much bigger blast radius than its own apparent size suggests.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I check every layer for true redundancy, not just the layer that's easiest to duplicate — a
  redundant app tier behind a single-instance database isn't actually redundant."
- "I distribute across multiple Availability Zones specifically so one AZ's failure doesn't take
  everything down."
- "A shared dependency used by many otherwise-independent services has an outsized blast radius,
  and deserves proportionally more reliability investment."

### 5. Interview-Ready Answer

> "I think about blast radius as the realistic design goal, since avoiding all failure entirely
> isn't achievable. That means checking every layer for a hidden single point of failure — a
> redundant application tier is meaningless if it all points at one non-redundant database — and
> spreading real redundancy across multiple Availability Zones so a single zone's outage doesn't
> take the whole system down. For anything that's a widely shared dependency, I treat its
> reliability as more important than its apparent size would suggest, because its blast radius is
> everyone who depends on it."

### 6. Go Deeper

companion Software Systems Handbook's §52 (Reliability Engineering Deep Dive) chapter; companion
Cloud Engineering Playbook's §44 (Multi-Region & Disaster Recovery Patterns) chapter and companion
Cloud Engineering Playbook's §29 (Account Governance: CloudTrail, Cost Management & Multi-Account
Basics) chapter.

---
