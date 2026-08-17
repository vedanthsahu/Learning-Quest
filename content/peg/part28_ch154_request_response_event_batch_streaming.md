## §154. Request/Response vs Event-Driven vs Batch vs Streaming

### 1. The Vocabulary

- **Request/response** — a caller sends a request and waits (synchronously or via polling) for a
  direct answer — the shape of most REST APIs.
- **Event-driven** — a producer emits an event describing something that happened; consumers react
  independently and asynchronously, with no direct answer returned to the producer (§112).
- **Batch processing** — work is collected and processed together on a schedule or once a
  threshold is reached, optimizing for throughput over per-item latency (a nightly ETL job, §82).
- **Streaming** — data is processed continuously, record by record or in small micro-batches, as it
  arrives, optimizing for low end-to-end latency on an ongoing, unbounded flow of data.

### 2. Where It Sits, and Why Teams Use It

This is the single most useful "which shape is this system" question to ask before naming any
specific technology, because it's the decision that determines nearly everything downstream — a
system described as "event-driven" implies queues/brokers and eventual consistency; "batch"
implies scheduled jobs and acceptable staleness; "streaming" implies a fundamentally different
processing model (windowing, backpressure) than any of the others. Most real systems are a mix:
a user-facing API is request/response, background processing off that API is event-driven, nightly
reporting is batch, and a fraud-detection pipeline reacting to transactions in real time is
streaming.

### 3. What Actually Breaks

- **Using request/response for work that should be async** — a user-facing request that
  synchronously waits on slow, unreliable downstream work (sending an email, calling a third-party
  API) ties up a request thread and makes the user's experience only as reliable as the slowest
  dependency (§26).
- **Choosing streaming when batch would be simpler and sufficient** — streaming infrastructure
  (state management, windowing, backpressure) is real, ongoing operational complexity; a nightly
  batch job is often the right, simpler answer when near-real-time freshness genuinely isn't
  required.
- **Batch jobs with no idempotency or replay strategy** — a batch job that partially fails halfway
  through, with no clear way to safely re-run it without double-processing, turns a routine
  failure into a manual cleanup incident.
- **Event-driven systems with no way to answer "what's the current state right now"** — pure
  event-driven design without a queryable read model can make it surprisingly hard to answer
  simple synchronous questions a request/response API would answer trivially.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I identify which of these four shapes a piece of work actually needs before picking a specific
  technology — it changes the whole design, not just an implementation detail."
- "I move slow or unreliable work out of the request/response path into an event-driven or queued
  flow, rather than making a user's request wait on it."
- "I don't reach for streaming infrastructure unless near-real-time freshness is an actual,
  stated requirement — batch is simpler and often sufficient."

### 5. Interview-Ready Answer

> "Before naming a specific technology, I identify which of these shapes the work actually needs.
> User-facing reads and writes are usually request/response. Anything slow, unreliable, or that
> other parts of the system should react to independently, I move to event-driven. Reporting or
> aggregation that can tolerate some staleness is batch. And I only reach for streaming when
> near-real-time processing of an ongoing, unbounded flow is an actual stated requirement, since
> streaming infrastructure brings real operational complexity that isn't worth it otherwise."

### 6. Go Deeper

companion Software Systems Handbook's §11 (Mental Model: Queues & Event-Driven Systems) chapter
and companion Software Systems Handbook's §20 (Mental Model: Data Pipelines & Streaming) chapter
for the full tradeoff analysis across all four (neither book has one single "architectural styles"
chapter covering all of them together); this book's §42 (why queues exist), §82 (ETL/ELT), and
§112 (serverless/event-driven) for each individual shape's mechanics.

---
