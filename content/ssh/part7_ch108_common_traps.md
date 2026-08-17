## 108. Hidden Traps and Common Mistakes in System Design Interviews and Real Reviews

### 108.1 Trap: "Microservices Are Always Better Than a Monolith"

**The trap:** A candidate or engineer defaults to a microservices architecture because it sounds more modern or scalable. **Why it's wrong:** §12 established that splitting a system has a real coordination and operational cost (network calls where there were function calls, distributed transactions where there were local ones, §42) — §86's capstone stage only justified a full microservices split at the 100K-1M user stage, driven by genuine, diffuse organizational pressure (many teams stepping on each other in one codebase), not by microservices being generically superior. **What a strong answer says instead:** "I'd start with a well-modularized monolith (§12) and split into services specifically where team boundaries or genuinely independent scaling needs demand it (§67, §86) — not by default."

### 108.2 Trap: "NoSQL Is 'Web Scale,' So Always Choose It Over SQL"

**The trap:** A candidate assumes any system with meaningful scale should default to a NoSQL database. **Why it's wrong:** §7's entire chapter exists to establish that relational and NoSQL databases solve different problems — relational databases scale further than commonly assumed (§62's NewSQL chapter exists specifically because "SQL doesn't scale" is often false), and NoSQL's relaxed consistency/schema tradeoffs (§38) are only worthwhile when the access pattern and consistency requirements actually call for them. **What a strong answer says instead:** "I'd choose the database category per dataset, based on its actual access pattern and consistency requirement (§7.5, §96), not by a blanket 'NoSQL for scale' rule — many of the largest systems in the world run substantially on well-sharded relational databases."

### 108.3 Trap: "Adding a Cache Always Improves Performance"

**The trap:** A candidate proposes caching as a default performance fix without considering cache-specific failure modes. **Why it's wrong:** §10 and §39 establish that caching introduces its own failure surface — cache stampede, cache avalanche, cache penetration (Part V §91.A) — and a poorly-designed cache-invalidation strategy can introduce subtle staleness bugs worse than the latency problem it was meant to solve. **What a strong answer says instead:** "I'd add caching specifically where read amplification or expensive computation justifies it, with an explicit invalidation strategy and stampede protection (§39.4) — not as a reflexive default performance lever."

### 108.4 Trap: "Strong Consistency Should Be the Default"

**The trap:** A candidate defaults to the strongest available consistency model for every dataset, "to be safe." **Why it's wrong:** §38's CAP/PACELC treatment establishes that strong consistency has a real availability and latency cost (§37's consistency-model spectrum) — §105.3's ad-click-tracking example and §105.5's payment-processing example are deliberately contrasted specifically because one genuinely needs strong consistency and the other doesn't, and defaulting to strong consistency everywhere pays that cost even where it buys nothing. **What a strong answer says instead:** "I'd determine the consistency requirement per dataset (§92.2 Step 2) — money and inventory typically need strong consistency; social/analytics data typically tolerates eventual consistency for a real availability and latency benefit."

### 108.5 Trap: "More Replicas Always Improve Availability"

**The trap:** A candidate assumes adding more database replicas is a strictly positive lever for reliability. **Why it's wrong:** §34's replication mechanics establish that more replicas increase write-propagation coordination cost and, for synchronous replication, can *reduce* write availability (more nodes that must acknowledge before a write succeeds) — the relationship between replica count and availability is not monotonic in every replication mode. **What a strong answer says instead:** "More replicas improve read availability and durability, but for synchronous replication, more required acknowledgments can reduce write availability — the correct replica count and replication mode depends on the actual read/write ratio and durability requirement (§34.3), not 'more is always better.'"

### 108.6 Trap: "Kubernetes/Containers Are Needed for Any Real Deployment"

**The trap:** A candidate proposes Kubernetes (§14, §45) for a system regardless of its actual operational complexity or team size. **Why it's wrong:** §45's Kubernetes depth and §69's at-scale treatment exist specifically for systems with genuine multi-service orchestration needs — a small system (§105.2's parking garage, §81's Stage-0 Loop) gains nothing from Kubernetes's operational overhead and loses simplicity for no corresponding benefit. **What a strong answer says instead:** "I'd introduce container orchestration when genuine multi-service deployment/scaling coordination needs exist (§86's stage-appropriate introduction) — a single well-deployed server or a simple managed-platform deployment is the correct answer at smaller scale, exactly as Loop's own early stages (§81-83) demonstrated."

### 108.7 Trap: "Async/Queues Solve Every Coupling Problem"

**The trap:** A candidate defaults to inserting a message queue between any two components to "decouple" them. **Why it's wrong:** §11 and §40-41 establish that asynchronous messaging trades immediate consistency and simple request-response reasoning for eventual delivery and materially harder debugging (ordering, duplicate delivery, DLQs, Part V §91.E) — not every interaction benefits from this tradeoff, particularly ones where the caller genuinely needs an immediate, synchronous answer to proceed. **What a strong answer says instead:** "I'd use async messaging where the caller doesn't need an immediate result and where decoupling failure domains (§42's bulkhead/circuit-breaker reasoning) provides real resilience benefit — a synchronous call is simpler and correct when the interaction is genuinely a request-response one."

### 108.8 Trap: "100% Uptime Is the Goal"

**The trap:** A candidate or engineer treats any downtime as an unconditional failure to eliminate. **Why it's wrong:** §19's reliability engineering chapter establishes this directly — 100% uptime is not just unachievable but the *wrong* target, since the cost of each additional "nine" of availability grows non-linearly (§52's SLO/error-budget framework exists specifically to make this tradeoff explicit and intentional). **What a strong answer says instead:** "I'd define an SLO appropriate to the business need (§52.2) and an error budget that makes the availability-versus-velocity tradeoff explicit — chasing 100% uptime past what the business actually requires trades away deployment velocity and engineering effort for no real user benefit."

### 108.9 Trap: "Sharding Should Happen Early, to Be Future-Proof"

**The trap:** A candidate proposes sharding a database from the very first version of a system, before any evidence of a scale need. **Why it's wrong:** §35's sharding mechanics and §85's capstone stage establish that sharding adds real, ongoing operational complexity (resharding, cross-shard queries, hot-partition risk, Part V §91.B) that should be adopted specifically when a single, well-indexed, appropriately-replicated database demonstrably cannot handle the load — Loop's own capstone didn't shard until the 10K-100K user stage (§85), justified by an actual write-volume ceiling, not by anticipation. **What a strong answer says instead:** "I'd start with a single database, add read replicas and caching first (§83-84), and shard only once a specific, measured write-volume ceiling is reached (§85) — premature sharding adds complexity that a simpler scaling lever would have deferred."

### 108.10 Trap: "Every Non-Obvious Decision Needs the Most Sophisticated Available Tool"

**The trap:** Facing a genuinely hard problem, a candidate reaches for the most advanced-sounding tool in their vocabulary (Kafka, Kubernetes, a consensus protocol) rather than the simplest tool that solves the actual stated problem. **Why it's wrong:** This is §1.5's foundational warning, restated as this chapter's meta-trap underlying nearly every other one above — sophistication should be justified by a demonstrated constraint (§92.2's ten-step framework existing specifically to produce that justification), not offered as evidence of knowledge. **What a strong answer says instead:** Explicitly, out loud: "here's the simplest approach that satisfies the stated requirements, and here's the specific constraint that would force something more sophisticated" — demonstrating command of complexity by choosing not to use it unnecessarily, which is a stronger signal than reflexively deploying it.

### 108.11 Engineering Intuition

> **What do all ten traps in this chapter have in common?** Each substitutes a general-sounding rule ("microservices are better," "more replicas help," "100% uptime is the goal") for the actual, requirement-specific derivation this handbook's entire ordering discipline (§0.1) exists to teach — every trap is a shortcut around Steps 1-3 of §92's HLD framework.

> **How should an engineer respond if they catch themselves mid-trap?** Say so directly and redirect to the actual requirement — "actually, let me reconsider — do we know this system's read/write ratio yet?" is a stronger signal than continuing confidently down an assumption-driven path.

### 108.12 Further Reading

- §1.5 (Premature Sophistication), §12 (Microservices vs. Monoliths), §38 (CAP/PACELC), §52 (Reliability Engineering), §85-86 (Capstone Sharding/Microservices Stages) — the direct diagnostic foundations behind every trap in this chapter.

---
