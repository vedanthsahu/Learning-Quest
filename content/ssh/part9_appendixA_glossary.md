# APPENDICES

## Appendix A: Glossary

*An alphabetical index of every major bolded term introduced in this handbook. Each entry gives a one-line definition and the section where it was first developed in full. For terms with an extended encyclopedia treatment (definition, history, real example, failure example, detection, mitigation), see Part V (§91.A-E), cross-referenced below.*

**Active-Active** — A redundancy architecture where multiple instances/regions simultaneously serve live traffic. §52.4, §88.3

**Active-Passive** — A redundancy architecture where one instance/region serves traffic while a standby remains idle until failover. §52.4, §87.3

**ADR (Architecture Decision Record)** — A durable document capturing an architectural decision, its context, alternatives, and reasoning. §57.7, used throughout Part IV

**ANN (Approximate Nearest Neighbor)** — Search algorithms that trade exactness for speed when finding similar vectors. §21.4, §54.5-54.6

**Atomicity** — The ACID property that a transaction's operations either all take effect or none do. §32.2

**Backpressure** — See Part V, §91.D

**Batching** — Grouping multiple operations into one combined operation to amortize per-operation overhead. §22.3, §51.4

**Bindings (Consensus terms: Epoch, Lease, Quorum)** — See Part V, §91.C

**Blast Radius** — See Part V, §91.A

**Bloom Filter** — A probabilistic structure that can quickly rule out "this definitely isn't here" without a full lookup. §31.3

**Bounded Context** — A domain-driven design concept: a coherent area of business meaning within which terms have one consistent definition. §12.5

**Brownout** — See Part V, §91.A

**Bulkhead** — See Part V, §91.D

**Buffer Pool** — In-memory cache of disk pages maintained by a database engine. §31.6

**B-Tree** — A balanced, high-branching-factor tree structure underlying most relational database indexes. §31.2

**CAP Theorem** — The impossibility of simultaneously guaranteeing Consistency, Availability, and Partition tolerance. §38.2

**Cardinality (observability)** — The number of distinct label/tag value combinations a metric can take. §71.2

**Cascading Failure** — See Part V, §91.A

**Chaos Engineering** — Deliberately injecting controlled failure to verify resilience mechanisms actually work. §19.5, §52.6, §74.4

**Circuit Breaker** — See Part V, §91.D

**Cold Start** — See Part V, §91.E

**Compaction** — Background merging of LSM-Tree SSTables to remove obsolete data. §31.3

**Composite Index** — A multi-column database index. §33.4

**Congestion Control** — TCP's mechanism for discovering sustainable throughput on a network path. §27.3

**Connection Pool / Connection Pool Exhaustion** — A set of reusable connections; exhaustion occurs when all are in use. §51.3; see also Part V, §91.B

**Consensus** — See Part V, §91.C

**Consistent Hashing** — A hashing scheme where adding/removing a node reassigns only a small fraction of keys. §28.4

**Context Propagation** — Passing trace/span identifiers across service boundaries to link a distributed trace. §48.4

**CQRS** — See Part V, §91.D

**CRDT** — See Part V, §91.C

**Cursor-Based (Keyset) Pagination** — Paginating via a reference to the last-seen item rather than a numeric offset. §29.7

**Data Lake / Data Warehouse / Lakehouse** — Three data platform architectures trading flexibility against structure. §75.2-75.4

**Deadlock** — Two or more transactions/threads each waiting on a resource the other holds. §26.3, §32.5

**Dead Letter Queue (DLQ)** — See Part V, §91.E

**Declarative Infrastructure** — Specifying desired state and letting a controller reconcile reality toward it. §14.4

**Defense in Depth** — Layering multiple, independent security controls. §17.4

**Drift (Configuration)** — Divergence between an IaC tool's believed state and actual live infrastructure. §47.3

**Edge Compute** — Running application logic at geographically distributed edge locations, close to users. §59.5

**Epoch** — See Part V, §91.C

**Error Budget** — The allowed quantity of unreliability implied by an SLO, used as a release-gating resource. §19.3, §52.3

**Event Sourcing** — Storing the full history of events instead of only current state. §41.6

**Eventual Consistency** — A guarantee that replicas converge given enough time, with no bound on how long. §37.5

**Fan-In / Fan-Out** — See Part V, §91.D

**False Sharing** — See Part V, §91.B

**FinOps** — The discipline of treating cloud cost as a continuous, cross-functional engineering concern. §68.5, §78.2

**Five Whys** — A root-cause-analysis technique of repeatedly asking why until reaching a systemic cause. §57.6

**Gray Failure** — See Part V, §91.A

**Head-of-Line Blocking** — See Part V, §91.B

**Hedged Request** — Sending a duplicate request to a second replica after a latency threshold, using whichever responds first. §73.3

**Hot Key / Hot Partition (Hot Shard)** — See Part V, §91.B

**HNSW** — A graph-based approximate nearest-neighbor search algorithm. §54.5

**Idempotency** — See Part V, §91.E

**Inbox Pattern** — See Part V, §91.D

**Inverted Index** — A structure mapping each term to the documents containing it. §21.2, §54.2

**Isolation Levels** — The spectrum of concurrency anomalies a database transaction permits (Read Uncommitted through Serializable). §32.3

**IVF (Inverted File Index)** — A vector search index partitioning the space into clusters searched selectively. §54.6

**KV Cache** — Cached intermediate attention computations avoiding redundant recomputation during LLM generation. §55.3

**Lamport Clock** — See Part V, §91.C

**Latency Budget** — An explicit time allowance allocated across a request's dependency tree. §73.4

**Leader Election** — See Part V, §91.C

**Lease** — See Part V, §91.C

**Least Privilege (Principle of)** — Every identity should hold the minimum permissions necessary for its function. §72.3

**Linearizability** — The strongest consistency model: operations appear to take effect instantaneously in real-time order. §37.5

**Little's Law** — L = λ × W; the relationship between concurrency, arrival rate, and time-in-system. §56.2

**Locality** — The property that a small fraction of data accounts for a large fraction of requests. §10.2

**LSM-Tree** — A write-optimized storage engine using in-memory memtables flushed to immutable sorted files. §31.3

**MVCC (Multi-Version Concurrency Control)** — A mechanism giving each transaction a consistent snapshot without blocking readers/writers against each other. §32.4

**Multi-Tenancy** — Many customers sharing the same underlying infrastructure. §60.3

**NUMA** — Non-Uniform Memory Access; memory latency that varies by which CPU socket accesses it. §58.2; see also Part V, §91.B

**Outbox Pattern** — See Part V, §91.D

**PACELC** — CAP extended to also cover the non-partitioned Latency-vs-Consistency tradeoff. §38.4

**Page Table / Paging** — The virtual-to-physical memory address translation mechanism. §25.3

**Partition Tolerance** — A distributed system's ability to continue operating despite dropped/delayed messages between nodes. §38.2

**Poison Message** — See Part V, §91.E

**Priority Inheritance** — Temporarily boosting a lock-holder's scheduling priority to resolve priority inversion. §25.2

**Priority Inversion** — See Part V, §91.B

**Progressive Delivery** — Automated, metric-gated staged rollout of a deployment (canary at fleet scale). §70.4

**Quorum** — See Part V, §91.C

**RAG (Retrieval-Augmented Generation)** — Retrieving relevant data and supplying it to a language model before generation. §22.5, §55.5

**Rate Limiting** — Restricting how many requests a client may make in a given time window. §60.2

**Read Amplification** — See Part V, §91.E

**Read-Your-Writes** — A consistency guarantee that a client's own subsequent reads reflect its own prior writes. §34.4

**Replica Lag** — How far a replica's data has fallen behind its leader/primary. §34.4

**RBAC / ABAC / ReBAC** — Role-, Attribute-, and Relationship-Based Access Control models. §30.6

**Runbook** — A pre-written, step-by-step incident response procedure for an anticipated failure type. §57.4

**Saga** — See Part V, §91.D

**Sampling (Observability)** — Deliberately capturing only a fraction of telemetry to control cost at scale. §71.3

**Scatter-Gather** — See Part V, §91.D

**Schema-on-Read / Schema-on-Write** — Deferring data structure interpretation to query time versus enforcing it at write time. §75.3

**Serializability** — The strongest isolation level: transactions behave as if executed strictly one at a time. §32.3

**Service Mesh** — Infrastructure (often sidecar-based) standardizing service-to-service networking concerns. §42.3

**Sharding / Partitioning** — Splitting data across multiple machines to exceed single-machine capacity. §8.4, §35

**SLI / SLO** — Service Level Indicator / Objective; a measured signal and its target. §19.2, §52.2

**Split Brain** — See Part V, §91.C

**Stateless / Statelessness** — Keeping no durable, request-relevant memory local to a single server instance. §18.5

**Sticky Sessions** — See Part V, §91.E

**Thread Pool Starvation** — See Part V, §91.B

**Thundering Herd** — See Part V, §91.A

**Trust Boundary** — A point in a system where the caller's identity/intent can no longer be assumed and must be verified. §5.5, §17.3

**TTL (Time-To-Live)** — A duration after which a cached or replicated item expires. §39.2

**Vector Clock** — See Part V, §91.C

**Watermark (Stream Processing)** — A stream processor's estimate of "all events up to this point have arrived," used to finalize windows. §53.4

**Write Amplification** — See Part V, §91.E

**Write-Ahead Log (WAL)** — A durable, sequential log of intended changes, written before they're applied, enabling crash recovery. §31.5

**Zero-Trust Architecture** — Authenticating and authorizing every request explicitly, regardless of network origin. §61.4

---
