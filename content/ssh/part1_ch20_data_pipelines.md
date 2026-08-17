## 20. Mental Model: Data Pipelines and Streaming

### 20.1 The Problem: Data Needs to Move, Transform, and Arrive Somewhere Useful

Data rarely stays where it is first written. A row inserted into an application's database needs to eventually inform a nightly business report, feed a machine learning model, populate a search index (§21), or trigger a downstream action in another system entirely. A **data pipeline** is the mechanism that moves data from where it's produced to where it's consumed, transforming it along the way. The central question every pipeline design must answer is one of timing: does the data need to arrive at its destination immediately, or is it acceptable — even preferable — for it to arrive later, in a batch? Specific frameworks (batch processing engines, Kafka Streams, Flink, exactly-once semantics) are deferred to Pass 2, §53.

### 20.2 Batch Processing: Correctness and Efficiency Over Immediacy

**Batch processing** collects data over a period of time (an hour, a day) and processes it all together in one pass. Its core advantage is efficiency and simplicity: processing a large, complete, unchanging set of data at once allows for optimizations (better resource utilization, simpler correctness reasoning, easier retries of a failed batch) that are much harder to achieve when data must be processed the instant it arrives. Its core disadvantage is exactly what its efficiency is traded against: the result is only ever as fresh as the last completed batch, and if a batch runs nightly, an analysis based on it is, by construction, up to 24 hours stale.

### 20.3 Stream Processing: Immediacy Over Simplicity

**Stream processing** processes each piece of data as it arrives, continuously, rather than waiting to accumulate a batch. Its core advantage is freshness — insights or downstream actions can happen within seconds of an event occurring, which matters enormously for use cases like fraud detection, real-time dashboards, or live recommendations. Its core disadvantage is that continuous, per-event processing is a fundamentally harder engineering problem than batch processing: because you can't rely on the tidy property of a complete, unchanging batch to work against, you must contend directly with the distributed-systems concerns from §9 — data may arrive out of order, a processing node may fail mid-stream, and defining "correct" output (particularly around not double-counting or missing events) requires deliberate mechanisms, not something a batch job gets closer to for free.

### 20.4 Choosing Between Them Is a Latency Requirement, Not a Technology Preference

Per the discipline established throughout this handbook, the batch-versus-stream decision should be driven by one specific question: **how stale can this data be before it stops being useful for its purpose?** A quarterly financial report tolerates being computed once a day or even once a week — batch processing is not merely acceptable here, it is the simpler and more robust choice. A fraud-detection system that needs to block a fraudulent transaction before it completes cannot tolerate even a few minutes of staleness — only streaming will do. Choosing streaming for data that doesn't actually need it imports all of §20.3's added complexity for no real benefit; choosing batch for data that genuinely needs freshness fails the use case outright.

### 20.5 The Lambda/Kappa Tension, Previewed

A frequent real-world complication: some systems need both a fast, approximate, real-time view of data (via streaming) and a slower, fully-correct, complete view of the same data (via batch) — for example, a live dashboard that shows an approximate number instantly, later corrected by an overnight, fully-accurate batch recomputation. Reconciling these two views of the same underlying data, and deciding whether to maintain two separate processing paths or unify around one, is a genuinely nontrivial architectural question, developed with specific patterns and named approaches in §53.

### 20.6 Engineering Intuition

> **How do I know whether a use case needs streaming or batch?** State, in concrete units (seconds, minutes, hours), the maximum staleness this data can tolerate before it fails to serve its purpose — that number, compared against how quickly a batch pipeline can realistically run, answers the question directly.
>
> **What symptoms indicate a mismatch?** A batch pipeline being run more and more frequently to chase a freshness requirement it wasn't designed for (a sign streaming may genuinely be needed); or a complex streaming pipeline built for data that is, in practice, only ever consumed in a daily report (a sign batch would have been far simpler).
>
> **What metrics indicate it?** End-to-end data latency (time from an event occurring to it being reflected wherever it's consumed), compared explicitly against the consuming use case's actual tolerance for staleness.
>
> **What breaks first if the wrong choice is made?** Choosing batch when streaming is needed means the use case simply doesn't work (fraud is detected after the transaction already completed). Choosing streaming when batch would do means ongoing, unnecessary operational complexity and cost, with no user-facing benefit to show for it.
>
> **When should you *not* build a streaming pipeline?** Whenever the consuming use case can tolerate the staleness a much simpler batch job would introduce — which describes the majority of internal reporting and analytics use cases, even at fairly large scale.
>
> **What would a hyperscale company do?** Run both batch and streaming pipelines for different datasets according to each one's actual freshness requirement (§20.4), and invest in reconciling the two where both fast-approximate and slow-correct views of the same data are genuinely needed (§20.5, §75).
>
> **What would a two-person startup do?** Run simple, infrequent batch jobs (even a nightly cron job) for their reporting needs, and introduce streaming only once a specific feature genuinely requires near-real-time data.
>
> **What changes with scale?** At small scale, a nightly batch script is often entirely sufficient. As both data volume and the number of genuinely real-time use cases (fraud detection, live personalization, operational alerting) grow, streaming infrastructure becomes justified — typically well into Part IV's middle-to-later stages (§86–87), and at the largest scale, petabyte-scale streaming and batch systems run side by side as core infrastructure (§75).

### 20.7 Exercises

1. For a reporting or analytics feature you know, state its actual tolerable staleness in concrete time units, and argue whether its current implementation (or a hypothetical one) is over- or under-engineered relative to that requirement.
2. Explain, using §20.3, why "process each event as it arrives" is a harder correctness problem than "process this complete, fixed batch of events," specifically in terms of ordering and failure handling.

### 20.8 Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapters 10–11 (Batch and Stream Processing) — the direct mechanism-level continuation of this chapter, previewing §53.
- Tyler Akidau et al., "The Dataflow Model" (Google, 2015) — the influential paper unifying batch and streaming semantics, foundational to §20.5's tension and its resolution.

---
