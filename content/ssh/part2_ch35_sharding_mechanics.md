## 35. Sharding Mechanics: Partitioning Strategies, Resharding, Hot Partitions, Distributed IDs

### 35.1 What This Chapter Adds to §8.4

§8.4 established why sharding exists and named the hot-shard risk. This chapter covers the concrete partitioning strategies used to assign data to shards, the operational reality of resharding a live system, and the specific problem of generating unique IDs once a single database's auto-increment counter is no longer available.

### 35.2 Partitioning Strategies: How a Key Gets Mapped to a Shard

- **Range partitioning**: assign contiguous ranges of the key space to each shard (e.g., users A-M on Shard 1, N-Z on Shard 2). Simple, and it makes range queries (fetch everything between two keys) efficient, since a range query typically touches few, contiguous shards — but it is highly susceptible to **hot shards** if the key distribution isn't uniform (a popular alphabetical range, or a monotonically-increasing key like a timestamp, concentrates most new writes onto whichever shard currently owns the "latest" range).
- **Hash partitioning**: apply a hash function to the key and assign shards based on the hash value, spreading keys uniformly regardless of their natural distribution, directly solving range partitioning's hot-shard risk for skewed key distributions — at the direct cost of destroying any locality between related keys, meaning a range query (e.g., "all events between two timestamps") likely must query every shard, since consecutive logical keys are scattered arbitrarily across the shard space by the hash function.
- **Directory-based partitioning**: maintain an explicit, separate lookup table mapping each key (or key range) to its shard, rather than computing the assignment algorithmically. This offers maximum flexibility (any custom assignment logic, easy rebalancing by simply updating the directory) at the cost of the directory itself becoming a critical, potentially bottlenecked piece of shared infrastructure that every query must consult.

The choice among these directly reflects the tradeoff shape from §1.7: range partitioning optimizes for range-query efficiency at the risk of hot shards; hash partitioning optimizes for uniform distribution at the cost of range-query efficiency; directory-based partitioning optimizes for flexibility at the cost of an additional dependency and potential bottleneck.

### 35.3 The Hot Shard Problem, Concretely

A **hot shard** (or hot partition, Part V §91.B) occurs when data or access patterns are not actually uniform, even under a partitioning strategy designed to distribute load — a single celebrity user's data on a social platform, a single extremely popular product's inventory record, or (as flagged in §35.2) a monotonically increasing key concentrating all new writes on one shard regardless of hashing. Because sharding's entire purpose is spreading load evenly (§8.4), a hot shard defeats that purpose for the specific keys concentrated there, and — because that one shard cannot simply be scaled independently of the sharding scheme without a deeper redesign — a hot shard is often one of the most difficult production problems to resolve without a genuine repartitioning of the affected data (§35.4).

### 35.4 Resharding: Changing the Partitioning Scheme Without Downtime

Because data volume and access patterns change over time, a sharding scheme chosen initially will eventually need to change — either to add more shards as total data grows, or to address a hot shard (§35.3) discovered after the fact. **Resharding** a live system, without unacceptable downtime, is one of the more operationally delicate procedures in this book, because it requires moving data between shards while the system continues serving reads and writes against that same data. The general pattern: begin **dual-writing** (writes go to both the old and new shard assignment simultaneously), backfill historical data into its new shard location, verify the new assignment is complete and correct, then cut reads over to the new assignment, and finally stop writing to the old location. Skipping the careful, staged verification in this sequence is a common source of serious data-loss or data-inconsistency incidents — resharding is exactly the kind of operation where "just move the data and switch over" fails silently in ways that aren't caught until well after the fact.

### 35.5 Distributed ID Generation: Losing the Convenience of a Single Auto-Increment Counter

A single, unsharded database can trivially generate unique, ordered IDs via a simple auto-increment counter. Once data is spread across multiple shards, no single counter can safely generate IDs for inserts happening concurrently across all of them — some alternative is needed:

- **UUIDs**: generate a large random identifier, unique with overwhelmingly high probability, requiring no coordination at all between shards. The cost: UUIDs are not naturally ordered by creation time, and their randomness can hurt index locality (a B-Tree index on random UUIDs, per §31.2, sees insertions scattered across the tree rather than appended at one end, which is less efficient than sequential insertion).
- **Snowflake-style IDs** (as popularized by Twitter): construct an ID from a timestamp, a machine/shard identifier, and a local sequence counter, packed into a single integer. This preserves rough time-ordering (useful for range queries and index locality) while still allowing fully independent, coordination-free ID generation across many shards simultaneously, at the cost of a more involved generation scheme and a dependency on reasonably synchronized clocks across machines (connecting directly to §37's treatment of why distributed clock synchronization is itself a hard problem).

The choice between these is, again, an instance of §1.7's tradeoff shape: UUIDs are simpler and require zero coordination but sacrifice ordering and index locality; Snowflake-style IDs preserve useful ordering properties at the cost of a more complex generation scheme and a dependency on the clock-synchronization concerns developed fully in the next chapter.

### 35.6 Common Mistakes and Production Debugging Signals

- Choosing hash partitioning for data that is frequently queried by range (e.g., "all orders in the last hour"), and then discovering that every such query must fan out to every shard (§35.2), producing far more cross-shard coordination overhead than anticipated.
- Sharding by a key that turns out to be highly skewed in practice (e.g., sharding by customer, when one enterprise customer accounts for a disproportionate fraction of all data and traffic) — a hot-shard problem (§35.3) that is often only discovered well after the initial sharding scheme is in production.
- Attempting a "big bang" resharding cutover instead of the staged dual-write-then-verify-then-cutover approach in §35.4, risking data loss or inconsistency that isn't caught until after the cutover is already complete.

### 35.7 Engineering Intuition

> **How do I know my partitioning strategy is a good fit?** Check whether your actual query patterns are dominated by point lookups (favoring either strategy) or range queries (favoring range partitioning, or requiring an explicit strategy to avoid full-fanout queries under hash partitioning).
>
> **What symptoms indicate a hot shard?** One shard consistently showing far higher CPU, I/O, or latency than its siblings, despite a partitioning scheme intended to distribute load evenly.
>
> **What metrics indicate it?** Per-shard request volume, storage size, and latency, compared across the full set of shards — meaningful, sustained divergence across otherwise-identical shards is the direct signal.
>
> **What breaks first if resharding isn't done carefully?** Data loss or silent inconsistency between old and new shard assignments, often not discovered until well after the cutover, when a customer reports missing or duplicated data.
>
> **When should you avoid sharding by a natural, possibly-skewed key (like customer or user ID) directly?** When you know or suspect the key distribution is heavily skewed — consider hash partitioning on that key, or a composite scheme, rather than assuming natural keys distribute evenly.
>
> **What would a hyperscale company do?** Use Snowflake-style distributed ID generation as standard infrastructure, monitor per-shard load continuously to catch hot shards early, and treat resharding as a well-rehearsed, tooling-supported operational procedure rather than an ad hoc, rare event (§63).
>
> **What would a two-person startup do?** Use UUIDs for simplicity (accepting the index-locality cost, since their data volume is small enough it doesn't matter yet) and defer sharding — and therefore resharding — entirely until it's genuinely necessary (§8.6, §85).
>
> **What changes with scale?** At small scale, sharding, distributed ID generation, and resharding are entirely unnecessary complexity. Once sharding becomes necessary (§85 in Part IV), the specific partitioning strategy and ID-generation scheme chosen have long-lasting operational consequences, and resharding, when eventually needed, becomes a significant, carefully-planned undertaking (§63).

### 35.8 Exercises

1. A system shards user data by hashing user ID, and a support team frequently needs to query "all users who signed up in the last week" — a query that must now fan out to every shard. Using §35.2, explain why this happened and what alternative partitioning strategy (with what tradeoff) would avoid it.
2. Explain, using §35.5, why a UUID-keyed table can suffer worse index performance under high insert volume than a table keyed by a monotonically-increasing or Snowflake-style ID, referring back to §31.2's description of B-Tree structure.

### 35.9 Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 6 ("Partitioning") — the direct, comprehensive extension of §35.2-35.4.
- Twitter Engineering, "Announcing Snowflake" (2010) — the original blog post describing the distributed ID scheme referenced in §35.5.

---
