## 41. Event-Driven Architecture Patterns: Outbox/Inbox, CQRS, Saga, Event Sourcing

### 41.1 What This Chapter Adds to §11.5

§11.5 introduced event-driven architecture at the mental-model level. This chapter covers four concrete, named patterns that solve specific, recurring problems within that architecture: keeping a database write and an event publication consistent, avoiding duplicate processing of the same event, coordinating a multi-step operation across services without a single distributed transaction, and modeling state as a sequence of events rather than a current snapshot.

### 41.2 The Outbox Pattern: Solving "Write to the Database AND Publish an Event, Atomically"

A common, dangerous-looking-simple requirement: when something happens (an order is placed), both write it to the database *and* publish an event announcing it, so other services can react (§11.5). Doing these as two separate operations — write to the database, then publish to the queue — creates exactly the coordination problem from §6.4: if the process crashes between the two steps, or the message broker is briefly unreachable, the database write succeeds but the event is never published, and every downstream consumer relying on that event silently never learns the order was placed.

The **outbox pattern** solves this by writing the event, as data, into an "outbox" table within the *same* database transaction as the actual business write — since both are now part of one atomic transaction (§32.2), they either both happen or neither does, with no possibility of one succeeding without the other. A separate process then reads new rows from the outbox table and publishes them as actual events to the message queue, retrying as needed until publication succeeds, then marking them as published.

```
Single database transaction:
    INSERT INTO orders (...) VALUES (...);
    INSERT INTO outbox (event_type, payload) VALUES ('order_placed', ...);
    COMMIT;  -- both rows exist, or neither does

Separate background process:
    poll outbox table for unpublished rows
    -> publish each to the message queue
    -> mark as published (or delete) once confirmed
```

This converts an unreliable "two separate operations that must both happen" problem into a reliable "one atomic database transaction, plus an independently-retriable publishing step" — the publishing step can fail and retry freely, because the event's existence is already safely durable in the outbox table regardless of whether publishing has succeeded yet.

### 41.3 The Inbox Pattern: The Consumer-Side Mirror of the Same Problem

Symmetrically, a consumer processing an incoming event and also needing to update its own database faces the same atomicity question in reverse: process the event's side effect and record "I've handled this event ID" as one atomic unit, so that if the process crashes partway, it doesn't either lose the side effect or lose track of having already processed that event (which would cause a duplicate-processing bug on redelivery, given §40.2's at-least-once guarantee). The **inbox pattern** mirrors the outbox: record the incoming event's ID in an "inbox" table within the same transaction as the side effect it triggers, and check that table before processing any event, skipping it if its ID is already present — directly implementing the idempotent-consumer requirement flagged in §40.2.1 as a concrete, reusable mechanism rather than an ad hoc, per-consumer solution.

### 41.4 CQRS: Separating How You Write Data From How You Read It

**Command Query Responsibility Segregation (CQRS)** is the practice of using different models — sometimes even entirely different databases — for writing data (**commands**) versus reading it (**queries**), rather than forcing one shared model to serve both well. This directly addresses a tension from §7: the data shape that's efficient and correct for writing (normalized, minimizing duplication, per §7.3) is often not the shape that's efficient for reading (denormalized, pre-joined, per §7.2's tradeoff), and CQRS resolves this by maintaining both simultaneously — writes go through a write-optimized model, and a separate process (often event-driven, per §41.2's outbox mechanism publishing every write as an event) propagates those changes into one or more read-optimized views, tailored to specific query needs. The direct cost, connecting back to §8.3 and §10.3: the read side is now, structurally, a form of cache or replica, and is therefore subject to the same staleness/lag considerations — a CQRS read model is very often eventually consistent with the write model, and application design must account for that lag explicitly rather than assuming reads always reflect the most recent write.

### 41.5 The Saga Pattern: Multi-Step Transactions Without a Distributed Transaction

§6.4 established why a transaction ensures multiple operations succeed or fail together. Once those operations span multiple independent services, each with its own database (per §12's microservices split), a single ACID transaction across all of them is generally not available (or, when technically possible via distributed transaction protocols, usually not worth the availability and performance cost). The **saga pattern** achieves the same practical goal — a multi-step business operation that doesn't end up in a partially-completed, inconsistent state — differently: break the operation into a sequence of local transactions, each in its own service, with each step publishing an event that triggers the next step; and for every step, define an explicit **compensating action** that undoes its effect if a later step in the sequence fails.

```
Saga for "place an order":

  Step 1: Payment service charges the card.       (local transaction)
  Step 2: Inventory service reserves stock.        (local transaction)
  Step 3: Shipping service schedules delivery.     (local transaction)

  If Step 3 fails:
     -> run Inventory's compensating action: release the reserved stock
     -> run Payment's compensating action: refund the charge
     (each service undoes its OWN prior step; there is no single
      cross-service rollback command)
```

The saga pattern trades the clean, automatic rollback of a single ACID transaction (§32.2) for explicit, manually-designed compensating actions — a real engineering cost, since every step needs its own carefully-considered undo logic, and those compensations must themselves be idempotent and safe to run even if invoked more than once (again directly connecting to §29.8 and §40.2.1's idempotency requirements).

### 41.6 Event Sourcing: Storing the History Instead of the Snapshot

**Event sourcing** takes the event-driven idea to its logical extreme for how state itself is stored: instead of persisting only the current state of an entity (an order's current status), persist the full, ordered sequence of events that led to that state (order created, item added, payment confirmed, order shipped), and derive the current state, whenever needed, by replaying those events from the beginning (or from a periodically-saved snapshot, to avoid replaying an unbounded history every time). This provides a complete, naturally-auditable history of exactly how an entity reached its current state — valuable for debugging, compliance, and rebuilding entirely new read models (§41.4) retroactively from the same historical event log — at the real cost of added complexity: querying "what is the current state" is no longer a simple row lookup but a replay (or a maintained projection) of the required subset of the retained event log, and the event log itself, since it's the sole source of truth, must be treated with the same durability rigor as any primary data store.

### 41.7 Common Mistakes and Production Debugging Signals

- Writing to a database and publishing an event as two separate, non-atomic operations, producing intermittent "the event never fired" bugs specifically correlated with crashes or transient broker unavailability at the exact moment between the two steps — the precise problem the outbox pattern (§41.2) exists to eliminate.
- Implementing a saga's individual steps without idempotent, safe-to-retry compensating actions, producing incorrect results (a double refund, an over-released inventory reservation) when a compensation is retried after a partial failure.
- Adopting event sourcing for an entity whose full history has no genuine business or auditability value, paying the real complexity cost of §41.6 for a benefit the use case never actually needed.

### 41.8 Engineering Intuition

> **How do I know I need the outbox/inbox pattern specifically?** Whenever a single logical operation must both update your own database and reliably notify other systems, and "the notification is occasionally silently missed" is not acceptable.
>
> **What symptoms indicate a missing outbox pattern?** Downstream systems occasionally and unpredictably missing events for operations that definitely, verifiably happened in the source system's database — with no correlated broker outage to explain the gap.
>
> **What metrics indicate a saga is under strain?** Frequency of compensating actions actually being triggered, and — critically — failures occurring *within* a compensating action itself, which leaves the overall operation in a state worse than either fully succeeded or fully rolled back.
>
> **What breaks first if these patterns are skipped?** Silent, intermittent data inconsistency (missed events, orphaned partial operations) that is extremely difficult to reproduce on demand, because it depends on a crash or failure occurring at one specific, narrow point in a multi-step sequence.
>
> **When is a simple, single-database transaction still the right choice over these patterns?** Whenever the entire operation genuinely fits within one service and one database — sagas, outboxes, and event sourcing all exist specifically to solve problems that arise from crossing service or database boundaries (§12.4), and are unnecessary complexity when no such boundary is actually being crossed.
>
> **What would a hyperscale company do?** Use outbox/inbox as standard, shared infrastructure for any cross-service event publication, adopt sagas deliberately for genuinely cross-service multi-step operations, and reserve event sourcing for entities where its audit/history value is clearly worth the added complexity (§67).
>
> **What would a two-person startup do?** Avoid sagas and event sourcing almost entirely by keeping operations within a single database/monolith (§12.2) as long as possible, adopting the outbox pattern only once they have a genuine, separate downstream consumer that must never miss an event.
>
> **What changes with scale?** These patterns become necessary specifically as a system crosses the monolith-to-microservices threshold discussed in §12.3 — at small scale, within one service and one database, ordinary ACID transactions solve all of these problems for free, and adopting these patterns earlier than that threshold is a clear case of the "sophistication before the constraint exists" anti-pattern from §1.5.

### 41.9 Exercises

1. A service writes an order to its database and then calls `publish_event()` in a separate step; occasionally, downstream services never receive the event even though the order clearly exists. Using §41.2, explain the likely cause and how the outbox pattern would fix it.
2. Design a saga (per §41.5) for a three-step operation of your choosing, explicitly specifying each step's compensating action, and identify one failure scenario where a compensating action itself might need to be retried.

### 41.10 Further Reading

- Chris Richardson, *Microservices Patterns* — the definitive, practitioner-oriented treatment of sagas, outbox/inbox, and CQRS as applied specifically to microservices architectures.
- Martin Fowler, "Event Sourcing" (martinfowler.com) — the widely-cited introduction to the pattern in §41.6, including its tradeoffs and when it is and isn't appropriate.

---
