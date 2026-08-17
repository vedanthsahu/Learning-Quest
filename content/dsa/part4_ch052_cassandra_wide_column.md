## §52. Cassandra & Wide-Column Stores: LSM Trees, Bloom Filters & Consistent Hashing

### 1. Decision Snapshot

Cassandra combines three structures from this book directly: an **LSM Tree** (§25) as its
per-node storage engine, **Bloom Filters** (§22) to avoid unnecessary disk reads against SSTables
that don't contain a queried key, and **Consistent Hashing** (§24) to decide which nodes in the
cluster own which data — plus **Merkle Trees** (§26) for efficient anti-entropy repair between
replicas.

### 2. The Problem This System Had to Solve

A distributed, wide-column store needs to accept extremely high write volume across many nodes
(motivating the LSM Tree), avoid expensive disk reads for keys that don't exist on a given node
(motivating Bloom Filters), distribute data across a cluster that grows and shrinks over time
without massive reshuffling (motivating Consistent Hashing), and efficiently detect and repair
data that's drifted out of sync between replicas (motivating Merkle Trees) — four distinct
problems, four structures, each doing exactly the job it's suited for.

### 3. Which Structures It Uses, and Why

**Write path**: every write goes to an in-memory memtable plus a durable commit log, exactly
§25's LSM Tree write path — sequential, never in-place. **Read path**: a read must potentially
check the memtable plus several on-disk SSTables; before touching disk for each SSTable,
Cassandra checks that SSTable's **Bloom Filter** (§22) — a "definitely not here" answer skips an
expensive disk read entirely, which matters enormously given how many SSTables can accumulate
before compaction catches up. **Cluster topology**: which physical node(s) own a given partition
key is determined by walking a **consistent hash ring** (§24) — this is what lets Cassandra add or
remove nodes with only a bounded fraction of data needing to move, instead of a full cluster-wide
reshuffle. **Anti-entropy repair**: when replicas of the same data drift apart (due to a node
being temporarily unreachable, for instance), Cassandra compares **Merkle Tree** (§26) root
hashes between replicas first, descending only where they disagree, to efficiently find and
repair just the actually-divergent data instead of comparing everything.

### 4. Simplified Architecture Diagram

```
Write "user:42" -> hashed onto consistent hash ring (§24) -> owned by Node_B (+ replicas)
                -> Node_B: append to commit log + memtable (§25 LSM write path)

Read "user:99" on Node_B:
  check memtable -- miss
  check SSTable_3's Bloom Filter (§22) -- "definitely not here" -> SKIP disk read
  check SSTable_2's Bloom Filter -- "maybe" -> disk read -> found

Anti-entropy repair between Node_B and its replica Node_C:
  compare Merkle Tree (§26) root hashes -- differ -> descend -> find the ONE divergent
  key range -> repair only that range, not the entire dataset
```

### 5. What This Teaches You in General

Production distributed systems rarely rely on a single clever structure — they compose several,
each solving one specific sub-problem, and the "architecture" is really the composition itself.
Recognizing this chapter as "four separate chapters' worth of structures working together for
one coherent reason" is the single clearest illustration in this book of how Part II's individual
structures actually earn their keep in a real system, rather than being isolated interview
trivia.

### 6. Interview Questions This Connects To

"Why would you choose Cassandra over a relational database for a write-heavy, distributed
workload" pulls together §25 (LSM write throughput) and §24 (horizontal scalability via
consistent hashing) into one coherent answer. "How does a distributed database efficiently detect
and repair replicas that have drifted out of sync" is directly answered by Merkle Tree comparison
(§26). "Why does Cassandra use Bloom Filters" directly reinforces §22's core lesson: avoid an
expensive disk read the moment you can prove a key definitely isn't present.

### 7. Key Takeaways

- Cassandra is the single clearest example in this book of multiple Part II structures composing
  into one coherent system, each solving a distinct, real sub-problem: LSM Trees (§25) for
  writes, Bloom Filters (§22) for read efficiency, Consistent Hashing (§24) for cluster
  distribution, Merkle Trees (§26) for replica repair.
- None of these four structures could substitute for another — each addresses a genuinely
  different concern, which is exactly why a real distributed store needs all four together.
- "Which structure solves which specific problem" is a more valuable interview answer than a
  vague "Cassandra uses fancy data structures."
- This composition pattern — several specialized structures, each earning its place — is worth
  recognizing as a template for reasoning about other complex production systems too.

---
