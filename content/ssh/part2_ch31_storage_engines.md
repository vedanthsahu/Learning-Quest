## 31. Storage Engines: B-Trees, LSM-Trees, Write-Ahead Logs, Page Cache, Buffer Pools

### 31.1 What This Chapter Adds to §6

§6 walked through why indexes, transactions, and crash recovery exist, at the level of "what problem does this solve." This chapter opens up the actual data structures and mechanisms real databases use to deliver those guarantees efficiently on real disks.

### 31.2 B-Trees: The Classic Index Structure

A **B-Tree** is a balanced tree structure where each node holds many sorted keys and pointers to child nodes (a high **branching factor**, often hundreds), specifically designed around the physical reality that reading from disk happens in fixed-size blocks — a B-Tree node is sized to match a disk page, so retrieving one node costs one disk read regardless of how many keys it holds. Because of the high branching factor, even a very large B-Tree (millions of rows) has a shallow depth (often 3-4 levels), meaning any lookup requires only 3-4 disk reads to reach the target row — this is precisely the mechanism that makes §6.3's "avoid the linear scan" promise concrete: a lookup that would cost millions of comparisons in a flat file costs a handful of page reads in a B-Tree.

```
B-Tree (simplified, branching factor 3):

              [ 50 | 90 ]
             /     |      \
     [10|30]   [60|75]   [95|99]
     /  |  \    /  |  \    /  |  \
   ... ... ... ... ... ... ... ... ...

Lookup for key 63: root says "between 50 and 90" -> go to middle
child; that node says "between 60 and 75" -> descend again.
Each step eliminates most of the remaining keys, in one disk
read per level.
```

Writes to a B-Tree can require rebalancing (splitting a full node into two) — bounded, predictable work, but work that happens in-place on disk, at the exact location the data logically belongs, which is why B-Trees are historically the default choice for read-heavy or balanced workloads.

### 31.3 LSM-Trees: Optimizing for Write-Heavy Workloads

A **Log-Structured Merge-Tree (LSM-Tree)** takes a fundamentally different approach, optimized for write throughput: instead of updating data in place on disk (as a B-Tree does), writes are first appended to an in-memory structure (a **memtable**, usually a sorted structure like a skip list), which is fast because appending sequentially is far cheaper than seeking to an arbitrary disk location. Once the memtable reaches a size threshold, it is flushed to disk as an immutable, sorted file (an **SSTable**). Over time, many such files accumulate, and a background process called **compaction** periodically merges them, removing duplicate or overwritten keys and keeping the total number of files manageable.

```
LSM-Tree write path:

  write --> memtable (in-memory, sorted)
                |
                | (memtable full)
                v
          flush to disk as SSTable (immutable, sorted)
                |
                | (many SSTables accumulate)
                v
          background compaction merges SSTables,
          discarding obsolete/overwritten entries
```

The tradeoff versus B-Trees: writes are dramatically faster (sequential append, no in-place seek/rebalance), but reads are more expensive in the worst case, because a single key's current value might exist in the memtable, or in any of several SSTables, requiring the engine to check multiple locations (mitigated by in-memory structures like **Bloom filters** that can quickly rule out "this SSTable definitely doesn't contain this key" without an actual disk read). This tradeoff — write-optimized versus read-optimized — is a direct instance of §1.7's general shape, and it is why LSM-Trees dominate write-heavy systems (many NoSQL databases, §7.4) while B-Trees remain common in traditional relational databases with more balanced or read-heavy workloads.

### 31.4 Write Amplification and Read Amplification: Naming the LSM-Tree Costs

Two terms (Part V §91.E) precisely describe LSM-Trees' costs. **Write amplification** is the phenomenon where one logical write ends up being physically written to disk multiple times — once at initial flush, and again every time a subsequent compaction rewrites the data into a merged file — meaning the actual disk I/O generated is a multiple of the logical write volume. **Read amplification** is the corresponding read-side cost: because a key's value might be scattered across the memtable and multiple SSTables, a single logical read can require checking several locations before finding (or ruling out) the key. Both are the direct, quantifiable price of trading in-place updates for sequential-append writes, and both are actively managed (via compaction strategy tuning, Bloom filters, and index caching) rather than eliminated.

### 31.5 The Write-Ahead Log: Making §6.6's Crash Safety Concrete

§6.6 asked how a system guarantees a write either fully happened or didn't happen at all, despite a crash being possible mid-write. The **write-ahead log (WAL)** is the mechanism: before any change is applied to the actual data structure (whether B-Tree or LSM-Tree), a record describing that change is first appended to a simple, sequential log file and durably flushed to disk. Only after the log record is safely persisted does the engine apply the change to the "real" data structure in memory or on disk. If the system crashes before the real structure is updated, the WAL still has a durable record of the intended change, and on restart, the engine **replays** the log from the last known consistent point, reapplying any changes that were logged but not yet reflected in the main structure. This is why the log must be written sequentially and flushed before acknowledging a write as successful — the sequential write pattern is cheap, and it is the one write that absolutely must survive a crash for any durability guarantee to hold at all.

### 31.6 The Buffer Pool and Page Cache: Why Most Reads Never Touch Disk

Given that disk I/O is orders of magnitude slower than memory access (§2.6), database engines maintain a **buffer pool** (or rely on the OS's **page cache**) — a large area of memory holding recently-accessed disk pages, so that a repeated read of the same page is served from memory rather than triggering another disk read. Managing what stays in this cache when it's full uses eviction policies conceptually identical to the caching mechanisms in §39 — commonly a variant of **LRU (least recently used)**, evicting the page that hasn't been touched in the longest time on the assumption it's least likely to be needed again soon. A database's real-world performance is frequently dominated by its buffer pool's **hit rate** — the fraction of reads served from memory rather than disk — which is precisely why "does the working set fit in available memory" is one of the first diagnostic questions when a database's performance degrades unexpectedly.

### 31.7 Common Mistakes and Production Debugging Signals

- Choosing a B-Tree-based database for an extremely write-heavy workload (or vice versa) without profiling actual read/write ratios — a mismatch here shows up as unexplained I/O saturation that no amount of query optimization fixes, because the underlying storage engine's write or read path is fundamentally working against the workload's shape.
- Ignoring compaction tuning on an LSM-Tree-based system under heavy sustained writes, leading to an ever-growing number of unmerged SSTables and correspondingly degrading read performance (§31.4) over time.
- Sizing a buffer pool or expecting page-cache effectiveness without accounting for the actual working-set size — a database whose active data far exceeds available memory will show poor performance no matter how well-indexed its queries are, because it is effectively always reading from disk (§31.6, connecting back to the thrashing concept in §25.3).

### 31.8 Engineering Intuition

> **How do I know which storage engine family fits my workload?** Measure your actual read/write ratio and access pattern. Write-heavy, append-like workloads (logging, time-series, event ingestion) favor LSM-Trees; balanced or read-heavy workloads with frequent updates to existing rows favor B-Trees.
>
> **What symptoms indicate a storage-engine mismatch?** Sustained high disk I/O that scales with write volume in a way query optimization can't address; read latency creeping upward over time in a system under heavy sustained writes (a classic LSM compaction-lag symptom).
>
> **What metrics indicate it?** Buffer pool / page cache hit rate; number of unmerged SSTables or compaction backlog (for LSM-based systems); disk read/write IOPS relative to logical operation volume (a direct measure of read/write amplification).
>
> **What breaks first if this is ignored?** Performance degrades not gradually and predictably, but in a way that seems to defy query-level optimization — because the bottleneck is in the storage engine's fundamental write or read path, not in any specific query.
>
> **When does this level of detail not matter?** For the overwhelming majority of application engineers using a well-established managed database, the storage engine's internals are the database vendor's problem, not yours — this depth matters for choosing between database technologies and for diagnosing genuinely storage-engine-shaped performance problems.
>
> **What would a hyperscale company do?** Choose (or build) storage engines deliberately matched to each specific workload's read/write profile, and actively tune compaction strategies and buffer pool sizing as a continuous operational practice.
>
> **What would a two-person startup do?** Use whatever storage engine their chosen managed database uses by default, and revisit the choice of database technology only if a specific, measured performance problem points to a fundamental mismatch.
>
> **What changes with scale?** At low data volume, almost any storage engine performs adequately because the entire working set fits comfortably in memory (§31.6) regardless of the on-disk structure. As data volume grows past available memory, the underlying storage engine's characteristics — and how well they match your actual read/write pattern — become a first-order determinant of performance.

### 31.9 Exercises

1. A time-series ingestion system (constant high-volume writes, infrequent reads of recent data) is built on a B-Tree-based relational database and shows poor write throughput under load. Using §31.2-31.3, explain why an LSM-Tree-based engine would likely perform better here.
2. Explain, using §31.5, why a write-ahead log entry must be durably flushed to disk before the corresponding change is applied to the main data structure, and what could go wrong if the order were reversed.

### 31.10 Further Reading

- Alex Petrov, *Database Internals* — a thorough, implementation-level treatment of B-Trees, LSM-Trees, and WALs across many real database systems.
- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 3 ("Storage and Retrieval") — a clear, comparative treatment of the same structures covered in this chapter.

---
