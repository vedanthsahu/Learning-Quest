## 91.D Architecture Pattern Terms

### Fan-Out

**Definition**: One incoming request or event triggers multiple outgoing requests or downstream effects, often in parallel. See §50.4 and §73.2 for its central role in the tail-at-scale problem, since overall latency is bound by the slowest of the fanned-out calls.

**Real example**: A single user-facing request that queries several backend services in parallel to assemble a composite response (a product page pulling pricing, inventory, and recommendations simultaneously).

**Misconception**: Fan-out itself is not a mistake — it's a normal, often necessary architectural pattern; the mistake is failing to account for how it compounds tail latency (§73.2) and failure probability across the fanned-out calls.

### Fan-In

**Definition**: Multiple upstream sources send requests, events, or data to a single downstream consumer or aggregation point — the inverse of fan-out, carrying its own distinct risk: the fan-in point can become a bottleneck or single point of failure precisely because it aggregates load from many sources.

**Real example**: Many producer services all publishing events to a single, shared downstream analytics pipeline or aggregation service.

**Mitigation**: Ensuring the fan-in point is horizontally scalable (§18.4) and doesn't become an unplanned single point of contention as the number of upstream sources grows.

### Scatter-Gather

**Definition**: A specific fan-out pattern where a request is sent ("scattered") to multiple nodes or shards simultaneously, and their partial responses are collected and merged ("gathered") into one final result. See §76.2-76.3 for its application in distributed search and vector index querying.

**Real example**: A distributed search query sent to every shard of a sharded inverted index, with each shard's matching results merged and re-ranked centrally before being returned.

**Misconception**: Scatter-gather's overall latency is determined by its slowest-responding participant, not an average — directly the tail-at-scale problem (§73.2) applied to this specific pattern.

### Saga

**Definition**: A pattern for coordinating a multi-step business operation across multiple services (each with its own local transaction) without a single, cross-service distributed transaction — instead using a sequence of local transactions, each with an explicit compensating action to undo it if a later step fails. See §41.5 for full mechanism and a worked example.

**Real example**: An order-placement flow spanning payment, inventory, and shipping services, where a shipping failure triggers compensating actions (refund the payment, release the reserved inventory) rather than a single, atomic rollback.

**Misconception**: A saga is not "as good as" a real ACID transaction — compensating actions must be deliberately designed, are not automatic, and must themselves be idempotent and safe to retry (§29.8, §41.5).

### CQRS (Command Query Responsibility Segregation)

**Definition**: Using separate models (and often separate underlying data stores) for writing data (commands) versus reading it (queries), rather than forcing one shared model to serve both efficiently. See §41.4 for full mechanism and its connection to read-model staleness.

**Real example**: An e-commerce system using a normalized, write-optimized model for order processing while maintaining a separate, denormalized, pre-joined read model specifically optimized for displaying order history quickly.

**Misconception**: CQRS's read model is very often eventually consistent with the write model (§41.4) — assuming reads always reflect the most recent write in a CQRS system is a common, consequential mistake.

### Outbox Pattern

**Definition**: A technique for atomically combining a database write with the reliable publication of a corresponding event, by writing the event as a row in an "outbox" table within the same transaction as the business write, then having a separate process publish outbox rows asynchronously. See §41.2 for full mechanism and worked example.

**Real example**: An order-placement write and its corresponding "order_placed" event both committed atomically to the database, with a background process reliably publishing the event afterward, even across a process crash between the two steps.

**Misconception**: This is not the same as "just publish the event right after the database write" — that naive approach is exactly the unreliable, non-atomic sequence the outbox pattern exists to fix.

### Inbox Pattern

**Definition**: The consumer-side mirror of the outbox pattern — recording a received event's ID in an "inbox" table within the same transaction as the side effect it triggers, and checking that table before processing any event, to make event processing safely idempotent under at-least-once delivery. See §41.3 for full mechanism.

**Misconception**: The inbox pattern is not merely a deduplication cache — its value specifically comes from recording the processed-event marker atomically with the side effect it caused, closing the same kind of gap the outbox pattern closes on the producer side.

### Bulkhead

**Definition**: A resilience pattern that isolates the resources (thread pools, connection pools) used for different downstream dependencies, so that one dependency's slowdown or failure cannot exhaust resources needed to call other, unrelated, healthy dependencies. See §42.4 for full mechanism and diagram.

**History**: Named after a ship's bulkheads — physical compartments that keep a hull breach in one section from flooding the entire vessel.

**Real example / production story**: The recurring incident pattern (§64.4) where an underestimated "non-critical" dependency's outage cascades into a major incident specifically because no bulkhead isolated its resource consumption from critical calling paths.

**Misconception**: Bulkheads don't prevent a dependency from failing — they prevent that failure's *consequences* from spreading beyond the dependency itself, a blast-radius (§91.A) reduction technique, not a failure-prevention one.

### Circuit Breaker

**Definition**: A pattern that tracks a downstream dependency's failure rate and, once a threshold is crossed, immediately fails further calls without attempting them for a cooldown period, rather than letting every caller independently wait out a doomed timeout. See §42.5 for full mechanism, including the half-open trial-request phase.

**Real example**: Netflix's Hystrix library (an early, widely-cited, production-proven implementation) popularized this pattern for large-scale microservices resilience.

**Misconception**: A circuit breaker is not the same as a simple timeout — a timeout limits how long one individual call waits; a circuit breaker prevents an entire class of doomed calls from being attempted at all once a dependency is known to be unhealthy.

### Backpressure

**Definition**: A mechanism by which a system experiencing more work than it can currently process communicates that fact back to whatever is producing the work — via explicit rejection, a bounded queue, or a pull-based consumption model — rather than silently accumulating an unbounded backlog or dropping work unpredictably. See §51.5 for full mechanism and diagram.

**Real example**: The Reactive Streams specification (§51.9), a widely-adopted standard for asynchronous stream processing with built-in, explicit backpressure signaling between producer and consumer.

**Misconception**: Backpressure does not make an overload problem disappear — it converts an unbounded, silent failure mode into a bounded, visible, and more gracefully handleable one (§51.5).

---
