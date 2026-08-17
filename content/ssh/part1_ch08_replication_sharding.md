## 8. Mental Model: Replication and Sharding

### 8.1 Why One Machine Is Never Enough, Forever

§1.4 named storage and compute as resources everything contends for, and every single machine, no matter how large, has a ceiling on both. A database's data will eventually not fit on one disk; a database's read or write traffic will eventually exceed what one machine's CPU and I/O can serve. Replication and sharding are the two fundamentally different answers to "what do we do when one machine is not enough" — and it matters a great deal which problem each one actually solves, because they are frequently confused for one another. Mechanisms (synchronous/asynchronous replication protocols, partitioning strategies, resharding) are deferred to Pass 2, §34–35.

### 8.2 Replication: Solving "What If This Machine Dies," Not "What If This Machine Is Full"

**Replication** means keeping full copies of the same data on multiple machines. Its primary purpose is *not* scaling capacity — it is survival: if one machine holding the only copy of your data fails, that data is gone. Replication exists so that a copy of the data always survives the loss of any single machine, directly addressing the "failure pressure" identified in §1.1.

A useful secondary benefit falls out of replication almost for free: if there are multiple copies of the data, read traffic can potentially be spread across all of them, rather than hitting one machine alone. This is why replication is often *also* discussed as a scaling technique — but it is worth being precise that this benefit applies to **read** capacity, not write capacity or total storage capacity. Every replica still needs to receive every write, so replication does not, by itself, let you store more data or accept more writes than a single machine could — that is precisely the gap sharding exists to fill (§8.4).

### 8.3 The Cost Replication Introduces: Copies Can Disagree

The moment data exists in more than one place, a new question appears that a single copy never had to answer: when a write happens, do all copies need to confirm it before the write is considered "done," or can the write be considered done as soon as one copy has it, with the others catching up shortly after? This is the seed of the **consistency vs. availability** tradeoff formally developed in §9 and §38 — waiting for every replica to confirm a write (favoring consistency) makes the write slower and blocks entirely if any replica is unreachable, while accepting a write after only one copy has it (favoring availability) means a reader hitting a different, not-yet-caught-up replica can briefly see stale data. Neither choice is free, and which one a given system should make depends entirely on how costly staleness is for that specific data — a decision revisited concretely throughout Part IV.

### 8.4 Sharding: Solving "What If This Machine Is Full or Overloaded"

**Sharding** (or partitioning) means splitting the data itself into disjoint pieces, each stored on a different machine, so that no single machine needs to hold all of it or serve all the traffic against it. Where replication answers "what if this machine dies," sharding answers "what if this machine's capacity, storage or throughput, is simply not enough" — a direct response to the "demand outgrew any single machine" shift from §1.2.

The central new problem sharding introduces is deciding **which shard a given piece of data belongs to**, and doing so in a way that keeps data reasonably evenly spread across shards (avoiding a **hot shard**, where one shard ends up with far more data or traffic than the others, defeating the whole purpose of splitting in the first place). A second, larger problem follows directly from the first: any query that needs data spanning multiple shards — a join across two differently-sharded tables, or an aggregate across all of them — is now dramatically more expensive or, in some designs, no longer directly possible at all, because the database can no longer simply combine everything in one place the way it could when all data lived on one machine.

### 8.5 Replication and Sharding Are Usually Combined, Not Chosen Between

A common early misconception is treating replication and sharding as alternative answers to the same question. They are not — they answer different questions and are typically deployed together: each shard, holding one slice of the overall dataset, is *itself* replicated for durability and read scaling, so that the loss of any one machine within any one shard does not lose that shard's slice of the data. The mental model to retain: sharding decides *which* machine(s) hold a given piece of data; replication decides *how many* copies of that data exist and survive failure. A production system almost always needs both, layered.

### 8.6 Engineering Intuition

> **How do I know I need replication?** The moment losing the single machine holding your data would be an unacceptable business outcome — which, for almost any production system handling real user data, is immediately, from day one.
>
> **How do I know I need sharding?** Only once your data no longer fits, or your write/query throughput no longer fits, within what a single (replicated) machine can serve — a threshold that arrives much later than most engineers assume, and that a well-indexed, well-cached, vertically-scaled single-shard database can often postpone for a very long time (§18, §51).
>
> **What symptoms indicate you need one but not the other?** Sustained high write latency or a dataset approaching a single machine's storage ceiling points toward sharding. A single hardware failure causing a full outage, with no data-loss-related symptoms otherwise, points toward needing replication instead.
>
> **What metrics indicate it?** Disk utilization approaching capacity and sustained write-side CPU/I/O saturation on the primary, for sharding; replica lag and mean-time-to-recovery after a node failure, for replication.
>
> **What breaks first if you ignore these needs?** Without replication: a single hardware failure becomes a full outage or permanent data loss. Without sharding, once genuinely needed: writes queue and latency climbs without bound as one machine's capacity is exceeded, regardless of how well-tuned the software above it is.
>
> **When should you *not* shard yet?** Whenever the actual bottleneck can still be solved by cheaper means — better indexing, caching, connection pooling, or simply a larger single machine (vertical scaling, §18). Sharding is one of the most expensive and hardest-to-reverse architectural decisions in this book (§35), and adopting it before the constraint that justifies it exists is a textbook case of the anti-pattern named in §1.5.
>
> **What would a hyperscale company do?** Run sharded, multi-region, replicated databases as a matter of course, because their write volume and dataset size have long since exceeded any single machine — but even they delay sharding a *new*, smaller dataset until it actually needs it.
>
> **What would a two-person startup do?** Run one primary database with one or two replicas for durability and basic read scaling, and never shard, because their entire dataset comfortably fits, and will fit for a long time, on a single well-resourced machine.
>
> **What changes with scale?** Replication is close to a Day 1 requirement at almost any scale where data loss matters (§82). Sharding typically does not become necessary until well into the middle stages of Part IV's capstone project (§85), and adopting it earlier than that is far more often a cost than a benefit.

### 8.7 Exercises

1. A system currently has one database machine and no replicas. Its data comfortably fits on disk, but a recent hardware failure caused a two-hour outage and lost the last few minutes of writes. Using only §8.2–8.3, argue for what should be added first, and why it is not sharding.
2. Explain, in your own words, why a cross-shard join is fundamentally more expensive than a join on a single, unsharded database, referring back to §6.3's explanation of why indexes exist in the first place.

### 8.8 Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapters 5 (Replication) and 6 (Partitioning) — the direct mechanism-level follow-up to this chapter's conceptual framing, previewing §34–35.
- Amazon, "Dynamo: Amazon's Highly Available Key-value Store" (2007) — an influential real-world treatment of combining replication and partitioning under the consistency/availability tradeoff introduced in §8.3.

---
