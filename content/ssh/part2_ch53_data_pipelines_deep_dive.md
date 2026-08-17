## 53. Data Pipelines Deep Dive: ETL/ELT, Batch Frameworks, Streaming Frameworks, Exactly-Once Semantics

### 53.1 What This Chapter Adds to §20

§20 established the batch-versus-stream decision at the mental-model level. This chapter covers the concrete ETL/ELT distinction, real batch and streaming framework mechanics, and how "exactly-once" processing is actually achieved (or approximated) at the mechanism level.

### 53.2 ETL vs. ELT: Where the Transformation Happens

**ETL (Extract, Transform, Load)** extracts data from a source, transforms it (cleaning, reshaping, aggregating) in a separate processing step, and only then loads the finished result into the destination system. **ELT (Extract, Load, Transform)** instead loads raw, untransformed data into the destination first, and performs the transformation afterward, using the destination system's own processing power (commonly a data warehouse capable of large-scale SQL-based transformation). The historical shift from ETL toward ELT tracks directly with the growing power and affordability of destination systems (modern cloud data warehouses can transform enormous volumes of data efficiently) — when the destination itself is powerful enough to do the transformation work well, loading raw data first and transforming afterward avoids needing separate, dedicated transformation infrastructure, and it preserves the original raw data for reprocessing if the transformation logic itself later needs to change (an advantage ETL doesn't have, since it typically loads only the already-transformed result).

### 53.3 Batch Framework Mechanics: Distributing Work Across a Cluster

A batch processing framework (following in the lineage of MapReduce, still visible conceptually in modern frameworks like Apache Spark) distributes a large data-processing job across many machines by splitting the input data into partitions, applying a transformation function to each partition independently and in parallel (the **map** phase), and then combining or aggregating the partial results (the **reduce** phase). This structure directly mirrors the sharding and partitioning concepts from §35 — a batch framework parallelizes computation the same way sharding parallelizes storage, by dividing the total work into independent pieces that can be processed concurrently across many machines, then combining the results. The engineering-relevant detail: a batch framework's fault tolerance typically relies on the fact that each partition's processing is independently re-runnable — if one machine handling one partition fails, that specific partition's work is simply retried on another machine, without needing to redo the entire job, precisely because the map phase's partitions have no dependency on each other's intermediate state.

### 53.4 Streaming Framework Mechanics: Windowing and State

A stream processing framework (such as Apache Flink or Kafka Streams) faces a problem batch processing doesn't: an unbounded, continuously-arriving stream has no natural "end" to wait for before computing an aggregate (like a count or an average). The solution is **windowing** — grouping events into bounded time-based chunks (e.g., "the last 5 minutes," or "5-minute chunks aligned to the clock") over which an aggregate can be meaningfully computed, even though the overall stream itself never ends. Windowing introduces a genuinely hard, specific problem: events don't always arrive in the order they occurred (network delays, retries, out-of-order delivery per §9.2's undecidable timing), so a framework must decide how long to wait for **late-arriving events** before finalizing a given window's result — a direct, concrete tradeoff between result completeness (waiting longer captures more late data) and latency (finalizing sooner produces a timelier, but potentially less complete, answer), addressed by mechanisms like **watermarks**, which represent the stream processor's best estimate of "we believe all events up to this point in time have now arrived," used to decide when a given window can be safely finalized.

### 53.5 Exactly-Once Semantics in Stream Processing: A Concrete Mechanism, Not Just a Claim

§40.2.1 explained that "exactly-once" in message delivery is usually at-least-once delivery plus idempotent consumption. Stream processing frameworks that claim exactly-once **processing** (a related but distinct guarantee, about a computation's effect, not just message delivery) typically achieve it via a specific mechanism: **checkpointing** the processing state (what's been consumed, what intermediate aggregation state exists) atomically alongside committing the corresponding output, such that if a failure occurs, the system can roll back to the last consistent checkpoint and reprocess from there — and because the checkpoint and the output commit are atomic with each other, reprocessing after a failure produces the same final result rather than double-counting anything, even though the underlying event delivery itself may still redeliver some events during recovery. This is conceptually the stream-processing analogue of the write-ahead log mechanism from §31.5: a durable, atomic record of "exactly what has been processed and committed so far" is what allows safe, consistent recovery after a failure, rather than any claim that failures simply don't happen.

### 53.6 Common Mistakes and Production Debugging Signals

- Choosing ETL when the destination system is fully capable of efficient large-scale transformation, adding unnecessary dedicated transformation infrastructure and losing the ability to easily reprocess raw data when transformation logic changes (§53.2).
- Setting a stream processing window's late-data tolerance too short for the actual, real-world event-arrival delay distribution, silently producing incomplete or inaccurate aggregates for a nontrivial fraction of windows (§53.4).
- Assuming a stream processing framework's "exactly-once" marketing claim eliminates the need to think about idempotency entirely, when in practice it typically guarantees exactly-once processing *within* the framework's own state, while external side effects (e.g., calling a separate downstream API from within the stream job) still require the consumer-side idempotency discipline from §29.8 and §40.2.1.

### 53.7 Engineering Intuition

> **How do I know whether ETL or ELT fits better?** If the destination system has ample, cost-effective processing power and preserving raw data for future reprocessing has real value, ELT is usually preferable; if the destination is comparatively limited or the transformation is complex enough to need dedicated tooling, ETL remains a reasonable choice.
>
> **What symptoms indicate a windowing/late-data problem?** Aggregated results that are quietly, slightly wrong or incomplete in a way that correlates with known sources of event delay (a slow upstream service, a network path with variable latency) rather than any bug in the aggregation logic itself.
>
> **What metrics indicate it?** The distribution of event lateness (arrival time minus event time) compared against the window's configured late-data tolerance; the rate of events arriving after their window has already been finalized (necessarily dropped or handled specially).
>
> **What breaks first if exactly-once processing is assumed to cover everything?** External side effects triggered from within a stream processing job (an API call, a write to an external system not participating in the framework's own checkpointing) can still be duplicated on reprocessing after a failure, even though the framework's internal state and aggregates remain exactly-once correct.
>
> **When is at-least-once processing (accepting some duplicate handling downstream) an acceptable simplification over full exactly-once machinery?** When downstream consumers can cheaply and correctly deduplicate or are naturally idempotent — paying for exactly-once processing guarantees is a real infrastructure cost that isn't always justified if the consequence of occasional duplicates is already well-handled elsewhere.
>
> **What would a hyperscale company do?** Run large-scale ELT pipelines against powerful data warehouses for most analytical workloads, use sophisticated watermarking and late-data handling for their most latency- and accuracy-sensitive streaming use cases, and design external side effects triggered from stream processing to be explicitly idempotent rather than relying solely on the framework's internal guarantees (§75).
>
> **What would a two-person startup do?** Use simple, managed ETL/ELT tooling for infrequent batch reporting needs, and adopt a managed streaming service with reasonable default windowing behavior only once a specific feature genuinely requires near-real-time processing.
>
> **What changes with scale?** At small data volumes, simple batch jobs with generous, unoptimized windowing tolerances work fine. At large scale, with tighter latency requirements and higher event volumes, careful watermark tuning, checkpointing configuration, and explicit handling of external side-effect idempotency become necessary, operationally significant concerns (§75).

### 53.8 Exercises

1. A daily batch ETL job transforms data before loading it into a reporting warehouse, and the team frequently needs to re-run transformations with updated business logic against historical data, requiring painful re-extraction from the original source each time. Using §53.2, propose an ELT-based alternative that would avoid this problem.
2. A real-time dashboard's 5-minute windowed aggregates are occasionally slightly wrong, and investigation shows a small fraction of events consistently arrive 6-10 minutes after their event time. Using §53.4, explain the likely cause and propose a specific configuration change to address it.

### 53.9 Further Reading

- Tyler Akidau, Slava Chernyak, Reuven Lax, *Streaming Systems* — the definitive, implementation-level treatment of windowing, watermarks, and exactly-once processing underlying §53.4-53.5.
- Apache Flink documentation, "Stateful Stream Processing" — a concrete, widely-used real-world implementation of the checkpointing mechanism described in §53.5.

---
