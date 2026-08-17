## §170. Hot Partition and Skewed Load

### 1. The Vocabulary

- **Hot partition** — a single shard, Kafka partition, DynamoDB partition, or cache node receiving
  a disproportionate share of traffic compared to its peers, because the data (or key) distribution
  routed to it is uneven.
- **Partition key / shard key skew** — the root cause: the key chosen to distribute data doesn't
  actually distribute traffic evenly, often because it correlates with something non-uniform (a
  popular customer ID, a recent timestamp when most traffic is on recent data).
- **Head-of-line blocking (related concept)** — within a hot partition specifically, if messages or
  requests are processed in strict order, one slow item can block everything queued behind it on
  that same partition (§173).

### 2. Where It Sits, and Why Teams Use It

This is §159's sharding/partitioning concept from the specific angle of "what happens when it goes
wrong." A shard key that seemed reasonable at design time (e.g., customer ID) can still produce a
hot partition in practice if one customer is disproportionately large or active — the unevenness is
a property of real-world data distribution, not necessarily a design mistake visible up front. This
is also exactly why "add more shards" alone doesn't always fix a scaling problem: if the traffic
distribution across keys is inherently skewed, more shards just means more idle shards plus one
still-hot one.

### 3. What Actually Breaks

- **A shard key correlated with popularity or recency** — sharding by a naturally uneven attribute
  (a trending topic ID, "today's date" when most reads are for today) concentrates load
  predictably and repeatedly on the same partition.
- **Assuming more shards fixes an already-skewed distribution** — adding shards spreads *evenly
  distributed* load further; it does nothing for load that's inherently concentrated on one key,
  which stays concentrated on whichever single shard now owns that key.
- **No monitoring at the per-partition level** — aggregate cluster metrics can look completely
  healthy while one specific partition is saturated, since it's averaged out across many other,
  less-loaded partitions.
- **No mitigation strategy prepared in advance** — common fixes (splitting a hot key's data across
  multiple sub-keys with a suffix, adding a caching layer in front of the hot partition, or
  redesigning the key) all take real implementation time; discovering the need for one of these
  mid-incident is much worse than having a plan ready.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I evaluate a shard or partition key specifically for whether real-world traffic will be evenly
  distributed across it, not just whether it looks reasonable in the abstract."
- "I know that adding more shards doesn't fix a hot partition caused by key skew — the hot key
  just stays on one shard regardless of how many total shards exist."
- "I monitor at the per-partition level, not just aggregate cluster metrics, since a hot partition
  can hide behind a healthy-looking average."

### 5. Interview-Ready Answer

> "A hot partition happens when a shard or partition key doesn't distribute real-world traffic
> evenly — a specific customer or trending item ends up concentrated on one shard while the rest sit
> comparatively idle. I check for this by monitoring at the per-partition level, since aggregate
> metrics can look healthy while one partition is actually saturated. And I know that simply adding
> more shards doesn't fix it if the underlying key is skewed — the fix is usually splitting the hot
> key's data across sub-keys, adding a cache in front of it, or reconsidering the key itself."

### 6. Go Deeper

companion DSA Engineering Handbook's §48 (Kafka: Queues, Append-Only Logs & Sequential I/O)
chapter and companion DSA Engineering Handbook's §52 (Cassandra & Wide-Column Stores: LSM Trees,
Bloom Filters & Consistent Hashing) chapter for full key-design and mitigation strategies in
partitioned systems; this book's §159 (sharding/replication/partitioning) for the foundational
concept this chapter's failure mode extends.

---
