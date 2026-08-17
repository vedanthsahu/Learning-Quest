## §156. Saga Pattern: Orchestration, Choreography, and Compensation

### 1. The Vocabulary

- **Saga** — a way to manage a business transaction that spans multiple services (each with its
  own database) as a sequence of local transactions, since a single distributed ACID transaction
  across services isn't practical at scale.
- **Compensating action** — an explicit "undo" operation for a step that already succeeded, run
  when a later step in the saga fails — since you can't roll back a committed local transaction in
  another service the way a database rolls back an uncommitted one.
- **Orchestration (saga variant)** — a central coordinator explicitly calls each step in order and
  triggers compensations on failure — easier to understand and debug, at the cost of a central
  coordinating component.
- **Choreography (saga variant)** — each service reacts to events from the previous step and emits
  its own event when done, with no central coordinator — more decoupled, harder to see the overall
  flow in one place (§112's choreography-sprawl problem, specifically in a transactional context).

### 2. Where It Sits, and Why Teams Use It

The problem sagas solve: "place an order" might need to reserve inventory, charge a payment, and
schedule shipping — three separate services, three separate databases, no single transaction that
can atomically commit or roll back all three. A saga accepts that and instead defines what to do
if a later step fails: if payment fails after inventory was reserved, a compensating action
releases the inventory reservation. This is why distributed transactions across services are
generally avoided in practice — the saga pattern with explicit compensation is the accepted
alternative.

### 3. What Actually Breaks

- **No compensating action defined for a step** — a failure partway through a multi-step business
  operation with no way to undo the steps that already succeeded leaves the system in a genuinely
  inconsistent state (inventory reserved but payment never charged, and nobody's watching).
- **Compensations that aren't idempotent** — a compensating action retried after a partial failure
  needs to be safe to run more than once, the same idempotency requirement as any other operation
  in a distributed system (§44).
- **Choreography with no visibility into overall saga state** — when each service only knows its
  own step, answering "what's the current status of this order" requires piecing together events
  from multiple services, which is exactly why orchestration is often chosen for critical,
  must-complete-in-order flows despite the added coupling.
- **Assuming eventual consistency means "eventually correct no matter what"** — a saga's
  in-between states are real and visible (an order can be "payment pending" for a real, observable
  window) — features and support processes need to account for that window explicitly, not assume
  it doesn't exist.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "For a business operation spanning multiple services, I design an explicit compensating action
  for each step, rather than assuming a distributed transaction will handle rollback."
- "I choose orchestration when I need clear visibility and control over a critical flow, and
  choreography when steps are more independent and a central coordinator would just be unnecessary
  coupling."
- "I make sure compensating actions are idempotent, since they can be retried under the same
  failure conditions as the original steps."

### 5. Interview-Ready Answer

> "For a multi-service business transaction like placing an order, I wouldn't reach for a
> distributed transaction — I'd design it as a saga, with an explicit compensating action for each
> step, like releasing an inventory reservation if payment fails afterward. For a critical,
> must-complete-in-order flow I'd lean toward orchestration so there's one place to see and control
> the overall status; for more independent steps, choreography avoids unnecessary central coupling.
> Either way, I design compensating actions to be idempotent, since they're subject to the same
> retry and duplicate-delivery risk as any other step in a distributed system."

### 6. Go Deeper

companion Software Systems Handbook's §41 (Event-Driven Architecture: outbox/inbox, CQRS, Saga,
event sourcing) chapter for full worked examples with both orchestration and choreography
implementations; this book's §22 (idempotency) and §44 (idempotent consumers) for the underlying
reliability requirement this pattern depends on.

---
