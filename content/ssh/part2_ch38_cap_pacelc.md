## 38. CAP and PACELC in Practice: Proofs by Failure Scenario, Real System Classifications

### 38.1 What This Chapter Formalizes

§8.3 and §9.6 previewed that replicated, distributed data forces a tradeoff between consistency and availability. This chapter states that tradeoff formally as the **CAP theorem**, proves it by walking through the exact failure scenario that forces the choice, extends it with **PACELC** (which addresses CAP's most common misreading), and classifies familiar real systems against both.

### 38.2 CAP, Stated Precisely

The CAP theorem states that a distributed data system can provide at most two of the following three properties simultaneously: **Consistency** (every read receives the most recent write, or an error), **Availability** (every request receives a non-error response, without guarantee it contains the most recent write), and **Partition tolerance** (the system continues operating despite network partitions — messages between some nodes being dropped or arbitrarily delayed).

The most common and most consequential misreading of CAP is treating it as "pick any two of the three, as a design menu." In practice, partition tolerance is not optional: real networks *will* partition, at least occasionally, and a system that simply stops working the instant any network partition occurs is not viable for a genuinely distributed system spanning more than one machine or data center. The real choice CAP forces is between **C and A specifically during an actual partition** — when a partition is happening, do you preserve consistency (by refusing to serve some requests until the partition heals) or preserve availability (by continuing to serve requests, accepting that some replicas may return stale or divergent data)?

### 38.3 Proving the Tradeoff by Walking Through a Concrete Partition Scenario

Consider two replicas, A and B, of the same data, with a network partition now separating them so neither can communicate with the other.

```
Before partition:           During partition:
  [Replica A] <---> [Replica B]      [Replica A]   X   [Replica B]
   (in sync)                          (isolated)      (isolated)

A client writes a new value to Replica A during the partition.
A DIFFERENT client, at the same time, sends a READ to Replica B.

Replica B now has exactly two options, and only two:

  Option 1 (choose Consistency): Replica B refuses to answer
  the read (or answers with an explicit "I cannot guarantee
  this is current," which is itself an availability failure
  for that request) -- because it cannot confirm whether a
  more recent write has happened elsewhere it can't reach.

  Option 2 (choose Availability): Replica B answers the read
  with whatever value it locally has -- which may now be
  STALE, since it cannot know about A's new write during the
  partition.

There is no third option that gives a guaranteed-current
answer AND always responds, while B remains unreachable from A.
```

This is not a limitation of any particular implementation — it is a direct logical consequence of the partition itself: Replica B genuinely cannot know, with certainty, whether a more recent write exists elsewhere, and the only way to guarantee an always-correct answer would be to wait until the partition heals, which directly sacrifices availability during that wait.

### 38.4 PACELC: Extending CAP to the (Much More Common) Non-Partitioned Case

CAP's tradeoff only actually applies **during an active partition (P)** — but partitions, while they do happen, are a comparatively rare event; most of the time, a distributed system is operating normally, with all nodes reachable. **PACELC** extends the analysis to this far more common situation: **if Partitioned (P), choose between Availability (A) and Consistency (C)** — this is CAP restated — **Else (E, i.e., during normal operation), choose between Latency (L) and Consistency (C)**. Even with no partition at all, achieving strong consistency (e.g., waiting for a quorum of geographically distant replicas to acknowledge, per §34.5) costs real latency compared to accepting a possibly-slightly-stale local read — meaning the consistency/performance tradeoff is not something you only pay during rare partitions, it is a tradeoff paid continuously, on every single operation, even when everything is working perfectly. This is precisely why PACELC is considered a more complete and practically useful framework than CAP alone: CAP tells you what happens during a rare bad day, while PACELC's "else" branch tells you what you're paying every single normal day.

### 38.5 Classifying Real Systems Against the Framework

Rather than treating CAP/PACELC as abstract theory, real systems make concrete, identifiable choices:

- A traditional single-region relational database with synchronous replication (§34.3) is **PC/EC**: it prioritizes consistency both during partitions (refusing/blocking writes if it can't reach a required replica) and during normal operation (waiting for synchronous acknowledgment, paying the latency cost, §34.3).
- A system like Amazon's original Dynamo (and many modern NoSQL stores modeled on it) is commonly **PA/EL**: during a partition, it favors staying available (accepting writes on any reachable replica, resolving conflicts later via mechanisms like vector clocks, §37.3), and during normal operation, it favors low latency over waiting for strong consistency guarantees.
- A system like Google Spanner, using tightly synchronized clocks and a consensus protocol across regions, is closer to **PC/EC** even at global, multi-region scale — but achieves this by paying substantial engineering cost (specialized, highly-synchronized clock hardware) specifically to keep the latency cost of that consistency choice as low as physically achievable, illustrating that the tradeoff can be engineered around at real cost, but never eliminated entirely.

The point of this classification exercise is not memorizing which named system falls in which quadrant — it's building the habit of asking "what does this specific system actually choose, under partition and during normal operation" for any distributed data system you evaluate or design, rather than treating "it uses replication" as if that alone answered the question.

### 38.6 Common Mistakes and Production Debugging Signals

- Selecting a database technology based on marketing language ("highly available," "strongly consistent") without identifying which specific CAP/PACELC quadrant it actually occupies under the failure and latency conditions that matter for your use case.
- Assuming a partition is a rare enough event to ignore in design, when — at sufficient scale and geographic distribution — partitions (or partition-like conditions: a slow, degraded link that behaves like an intermittent partition) become a routine, expected operating condition rather than an edge case (§64, §74).
- Ignoring the "E" (else) branch of PACELC entirely, tuning a system only for its rare-partition behavior while failing to notice the continuous, everyday latency cost being paid for a consistency guarantee that use case might not actually need (§38.4).

### 38.7 Engineering Intuition

> **How do I know which side of the CAP tradeoff I need, for a specific dataset?** Ask what happens if, during a partition, two different users see two different (both individually reasonable) answers for a moment — if that's tolerable, favor availability; if it causes real business harm (double-spending, double-booking), favor consistency.
>
> **What symptoms indicate a CAP/PACELC mismatch?** A system chosen for high availability producing subtle correctness bugs under network instability (an availability-favoring choice applied to consistency-critical data); or a system chosen for strong consistency showing unnecessarily high latency for data that never actually needed that guarantee (a consistency-favoring choice applied where the "E" branch's latency cost wasn't worth paying).
>
> **What metrics indicate it?** Divergence between replicas' served values during and after network instability (an availability-favoring system, working as designed); baseline operation latency attributable specifically to consistency-related coordination, isolated via tracing (§16.3).
>
> **What breaks first if this isn't consciously decided?** An unconsidered default choice — often whatever a chosen database happens to prioritize — ends up governing consistency-critical business logic that actually needed the opposite tradeoff, discovered only when a partition or latency spike actually occurs in production.
>
> **When should you favor availability over consistency?** For data where a brief, bounded window of staleness or divergence causes no real harm and the cost of coordinating for strong consistency (in latency or reduced uptime) is not justified by the data's actual sensitivity.
>
> **What would a hyperscale company do?** Classify every dataset explicitly against CAP/PACELC, choosing different technologies and configurations deliberately per dataset's actual sensitivity, and invest specifically in reducing the "E" branch's latency cost (via techniques like Spanner's synchronized clocks, §64) only where the business value of strong global consistency justifies that investment.
>
> **What would a two-person startup do?** Use a single-region, strongly-consistent relational database for virtually everything, deliberately avoiding the entire multi-region CAP/PACELC tradeoff space until genuine multi-region scale or availability requirements force the question (§87).
>
> **What changes with scale?** At single-region, low-latency scale, the CAP/PACELC tradeoff is often nearly free to resolve in favor of consistency, since round trips are cheap and partitions are rare. At global, multi-region scale, both the frequency of partition-like conditions and the latency cost of strong consistency grow substantially, making this chapter's framework a central, unavoidable part of the architecture (§62-64, §87-89).

### 38.8 Exercises

1. For a system you know, identify one dataset that should clearly favor consistency (per §38.3's partition scenario) and one that should clearly favor availability, and justify each choice in terms of real business consequences of the "wrong" answer being served.
2. Using §38.4, explain why a system with no history of ever experiencing a network partition can still be paying a real, continuous cost for its consistency guarantee, and identify what that cost is.

### 38.9 Further Reading

- Eric Brewer, "CAP Twelve Years Later: How the 'Rules' Have Changed" (2012) — CAP's original author revisiting and correcting common misreadings, directly addressing §38.2's clarification.
- Daniel Abadi, "Consistency Tradeoffs in Modern Distributed Database System Design" (2012) — the original paper introducing PACELC, extending CAP exactly as covered in §38.4.

---
