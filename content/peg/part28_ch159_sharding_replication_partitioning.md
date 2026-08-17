## §159. Sharding, Replication, Partitioning, and Read/Write Splitting

### 1. The Vocabulary

- **Replication** — copying the same data to multiple nodes, primarily for availability (survive a
  node failure) and read scaling (spread reads across replicas) — every replica has (eventually)
  the same full dataset.
- **Sharding** — splitting data across multiple nodes so each node holds only a subset (by some
  shard key), primarily for write scaling and storage scaling — no single node holds everything.
- **Partitioning** — a more general term than sharding; can mean splitting data within a single
  database instance (partitioned tables) or across nodes — sharding is specifically the
  across-nodes case.
- **Read/write splitting** — routing writes to a primary node and reads to replicas, a direct
  application of replication that requires the application (or a proxy) to know which queries can
  tolerate replication lag (§34).

### 2. Where It Sits, and Why Teams Use It

These four solve different scaling problems and are frequently confused with each other. A system
with heavy read traffic but manageable write volume and total data size wants replication (and
read/write splitting) — more replicas, more read capacity. A system whose write volume or total
data size exceeds what one node can handle needs sharding — splitting the data itself, not just
copying it. Real large-scale systems typically use both together: each shard is itself replicated
for availability.

### 3. What Actually Breaks

- **Confusing replication with sharding** — adding replicas doesn't help if the problem is write
  volume or total data size exceeding one node's capacity; that requires sharding, a fundamentally
  different (and more invasive) change.
- **A poorly chosen shard key producing a hot partition** — sharding by a key with very uneven
  distribution (e.g., sharding by signup date when most traffic is on recent signups) concentrates
  load on one shard, defeating the purpose of sharding at all (§170).
- **Read/write splitting without accounting for replication lag** — a user updates data, then
  immediately reads it back from a replica that hasn't caught up yet, and sees stale results — a
  real, common UX bug when read/write splitting is adopted without a "read your own writes"
  strategy for the specific cases that need it.
- **Re-sharding as an afterthought** — choosing a shard key without a plan for how to re-shard if
  distribution changes over time turns a routine scaling need into a major, risky migration later.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I distinguish replication (same data, more copies, for availability and read scaling) from
  sharding (split data, for write and storage scaling) — they solve different problems and aren't
  interchangeable."
- "I evaluate a shard key specifically for distribution evenness, since a bad shard key produces a
  hot partition that defeats the whole point of sharding."
- "When I use read/write splitting, I identify which specific reads need up-to-date data right
  after a write and route those to the primary, rather than assuming all reads can tolerate
  replication lag."

### 5. Interview-Ready Answer

> "Replication and sharding solve different scaling problems, and I'd pick based on which one
> actually applies — replication for read scaling and availability, sharding for write or storage
> scaling once a single node genuinely can't hold or handle it all. If I shard, I spend real time on
> the shard key choice specifically to avoid a hot partition, since an uneven key defeats the
> purpose. And if I use read/write splitting, I identify the specific reads that need
> up-to-the-second consistency — like a user reading back their own just-made change — and route
> those to the primary rather than assuming every read can tolerate replication lag."

### 6. Go Deeper

companion Software Systems Handbook's §8 (Mental Model: Replication & Sharding) chapter and
companion Software Systems Handbook's §63 (Replication & Sharding at Scale) chapter for full
shard-key selection and rebalancing strategies; this book's §34 (read replicas/replication lag)
and §170 (hot partition) for the adjacent lag-consistency and hot-partition failure modes.

---
