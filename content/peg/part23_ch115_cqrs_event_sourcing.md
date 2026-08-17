## §115. CQRS and Event Sourcing at a Glance

### 1. The Vocabulary

- **CQRS (Command Query Responsibility Segregation)** — separating the model used to write data
  (commands) from the model used to read it (queries), which can even mean separate databases
  optimized for each side.
- **Event sourcing** — instead of storing the current state of an entity, you store the full
  sequence of events that led to it, and derive current state by replaying them; the event log
  *is* the source of truth, not a snapshot table.
- **Projection** — a read-optimized view built by replaying (or incrementally applying) events —
  the "query" side of CQRS when paired with event sourcing.
- **Eventual consistency (in this context)** — the read model built from events may lag slightly
  behind the latest write, which is an accepted tradeoff, not a bug, in these architectures.

### 2. Where It Sits, and Why Teams Use It

These two patterns are often mentioned together but are independent: you can do CQRS with a normal
database on both sides, and you can do event sourcing without formally separating reads and
writes. Teams reach for CQRS when read and write workloads have very different shapes or scaling
needs (e.g., writes are simple but reads need complex joins across many services). Teams reach for
event sourcing when the audit trail itself is valuable — being able to answer "what was this
order's state at every point in time," not just "what is it now" — which matters a lot for
finance, inventory, and anything with compliance requirements.

### 3. What Actually Breaks

- **Adopting event sourcing for a simple CRUD entity** — replaying an event log to answer "what is
  this user's email address" is enormous, unjustified complexity for a fact that never needed
  history; this pattern earns its cost specifically where history matters.
- **Forgetting the read side lags** — a user submits a command, immediately queries the read model,
  and doesn't see their own change yet, because the projection hasn't caught up — a real UX trap if
  not designed around explicitly (e.g., optimistic UI updates).
- **Event schema changes breaking replay** — since old events must still be replayable to
  reconstruct state, changing an event's shape without a versioning/migration strategy can corrupt
  every entity whose history includes the old shape.
- **No snapshotting on long event streams** — replaying tens of thousands of events to rebuild one
  entity's current state on every read is a real, measurable performance problem without periodic
  snapshots.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "CQRS and event sourcing are separate decisions — I'd consider CQRS alone when read and write
  loads genuinely differ in shape, without necessarily adopting event sourcing too."
- "Event sourcing earns its complexity specifically when the history itself is valuable — audit,
  compliance, 'what did this look like at time T' — not as a default persistence style."
- "If I did adopt CQRS, I'd design the UI around the read side lagging slightly behind the write
  side, rather than assuming immediate consistency."

### 5. Interview-Ready Answer

> "I treat CQRS and event sourcing as two separate tools, not a package deal. CQRS makes sense when
> reads and writes have genuinely different shapes or scaling needs. Event sourcing makes sense
> when the history of how an entity got to its current state is itself valuable — audit trails,
> compliance, point-in-time reconstruction — and I'd expect to need snapshotting once event streams
> get long, plus a real plan for evolving event schemas without breaking old history."

### 6. Go Deeper

companion Software Systems Handbook's §41 (Event-Driven Architecture: outbox/inbox, CQRS, Saga,
event sourcing) chapter for the full mechanism and worked examples; this book's §42 (why queues
exist) for the adjacent messaging concepts.

---
