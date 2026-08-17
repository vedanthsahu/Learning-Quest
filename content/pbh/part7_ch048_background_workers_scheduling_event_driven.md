## 48. Background Workers, Scheduling & Event-Driven Backends

### 48.1 The Problem: §36-37 Gave You the Mechanisms; This Chapter Gives You the Architectural Decision of When and How to Use Them System-Wide

§36-37 covered message brokers and Celery mechanically. This closing Part VII chapter addresses the higher-level architectural question: when should a backend's overall design be event-driven rather than purely request-response, how do you reliably publish an event *and* persist the change that triggered it without one succeeding while the other silently fails, and how should the worker processes consuming these events actually be architected and scaled as their own distinct system component.

### 48.2 Decision Framework: Request-Response vs. Event-Driven — Which Parts of a Backend Actually Need Which

Not every operation benefits from becoming event-driven — a synchronous request-response model remains simpler to reason about, easier to debug (a linear call stack versus a distributed trail of published-and-consumed events), and entirely appropriate whenever a caller genuinely needs an immediate result before proceeding. Event-driven architecture earns its complexity specifically where genuine decoupling is valuable: multiple independent downstream systems needing to react to the same occurrence (a booking created, triggering both a notification and an analytics update, neither of which needs to block the booking response itself) or where the triggering action's caller genuinely doesn't need to wait for every downstream consequence to complete before receiving their own response.

### 48.3 Engineering Constraint: A Single Business Action That Needs to Both Persist State and Publish an Event Has Two Operations That Must Not Silently Diverge

Creating a booking (a database write, companion §27's transaction) and publishing a "booking created" event (a message-broker write, §36) are two genuinely separate operations against two separate systems — if the database write succeeds but the event-publish fails (or vice versa), the system ends up in a subtly broken state: a real booking exists with no downstream consumer ever notified, or an event was published claiming a booking exists that was actually rolled back. This is precisely the **dual-write problem**, and it cannot be solved by simply wrapping both operations in a `try`/`except` and hoping — the two systems (the database, the broker) don't share a transaction, so there's no way to guarantee both succeed or both fail together using ordinary means alone.

### 48.4 Python Mechanism: The Outbox Pattern — Publishing Events Reliably From Within a Database Transaction

The **Outbox pattern** solves §48.3's dual-write problem by never actually publishing the event directly at write time at all: instead, the event is written as a row into an `outbox` table, in the *same* database transaction as the actual business write (companion §27's atomicity guarantee now covers both — either both the booking and its outbox event are persisted together, or neither is, since they're the same transaction). A separate, independent process (a background poller, or a database change-data-capture mechanism) then reads unpublished rows from the outbox table and genuinely publishes them to the message broker, marking them published once confirmed — moving the actual cross-system publish step outside the original transaction entirely, where its own failure and retry can be handled independently without ever risking the original business write's atomicity.

### 48.5 Decision Framework: Worker Process Architecture — Sizing and Isolating Consumer Capacity From Web-Request Capacity

Background/event-consuming worker processes (Celery workers, §37.2, or a custom outbox-poller/consumer process) should be deployed, scaled, and monitored as their own distinct capacity pool, entirely separate from the web-request-serving application instances — a spike in booking-event volume shouldn't compete for the same process/resource pool serving live user-facing HTTP requests, and a slow or backed-up worker fleet shouldn't be able to degrade unrelated API latency the way a shared, undifferentiated pool of processes handling both concerns could. This is directly the same isolation-of-concerns principle companion §42.5's bulkhead pattern establishes generally, applied here at the level of entire process pools rather than within a single request's dependency calls.

### 48.6 Implementation

```python
import json
import uuid

def create_booking_with_outbox_event(conn, *, tenant_id, seat_id, booking_date, user_id) -> dict:
    with conn.cursor() as cur:
        # Step 1: the actual business write
        cur.execute(
            """INSERT INTO bookings (tenant_id, seat_id, booking_date, booked_for_user_id, booking_status)
               VALUES (%s, %s, %s, %s, 'CONFIRMED') RETURNING id""",
            (tenant_id, seat_id, booking_date, user_id),
        )
        booking_id = cur.fetchone()[0]

        # Step 2: the event, written to the OUTBOX table -- SAME transaction
        # as Step 1 (§48.4) -- both succeed together or neither does at all
        cur.execute(
            """INSERT INTO outbox (id, event_type, payload, published)
               VALUES (%s, %s, %s, FALSE)""",
            (
                str(uuid.uuid4()),
                "booking.created",
                json.dumps({"booking_id": str(booking_id), "seat_id": seat_id, "tenant_id": tenant_id}),
            ),
        )

        conn.commit()   # atomic: booking AND outbox event committed together
        return {"booking_id": booking_id}


def poll_and_publish_outbox(conn, publish_fn, batch_size: int = 50) -> int:
    """Runs as its OWN separate process/loop -- reads unpublished outbox rows
    and genuinely publishes them, outside the original write's transaction."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, event_type, payload FROM outbox WHERE published = FALSE LIMIT %s",
            (batch_size,),
        )
        rows = cur.fetchall()

        for row_id, event_type, payload in rows:
            publish_fn(event_type, payload)   # actual broker publish (§36),
                                                 # can fail/retry INDEPENDENTLY
                                                 # of the original write
            cur.execute("UPDATE outbox SET published = TRUE WHERE id = %s", (row_id,))
        conn.commit()

    return len(rows)
```

`create_booking_with_outbox_event` writes both the `bookings` row and the `outbox` row within one transaction — `conn.commit()` either persists both together or, on any failure before it, rolls back both together, structurally eliminating §48.3's dual-write risk. `poll_and_publish_outbox` runs as an entirely separate process (or scheduled loop, §37.4), reading not-yet-published outbox rows and genuinely publishing each one — if `publish_fn` fails for a specific row, that row simply remains `published = FALSE` and gets retried on the next poll, with no risk to the original booking's own durability, since that write already committed successfully and independently.

### 48.7 Production Considerations

The outbox table itself needs its own retention/cleanup discipline (companion §31's soft-delete-adjacent pattern) — rows marked `published = TRUE` should eventually be purged or archived, since an unbounded, ever-growing outbox table is its own resource-accumulation problem otherwise. The outbox-polling process (or its equivalent) is itself a critical piece of infrastructure whose own health must be monitored (companion §65) — a poller that silently stops running (a crashed process with no restart, no alert) means the outbox table quietly accumulates unpublished events indefinitely, with the underlying business writes still succeeding normally, making this specific failure mode dangerously invisible from the perspective of ordinary application-level error monitoring, which would show nothing wrong at all.

### 48.8 Debugging

**Symptoms:** A downstream consumer (analytics, notifications) is missing events for some, but not all, business actions that should have triggered them, with the underlying actions themselves having succeeded correctly; the same missing-events symptom, but affecting *all* events since a certain point in time. **Investigation:** For sporadic missing events, check whether the specific affected actions' code path actually writes to the outbox table within the same transaction as the business write, or whether some code path publishes directly (bypassing the outbox, and therefore vulnerable to §48.3's dual-write risk) rather than consistently. For a total, since-some-point outage, check whether the outbox-polling process itself is still running at all (§48.7's exact invisible-failure scenario). **Root cause:** Inconsistent adoption of the outbox pattern across different code paths that should all use it uniformly; or the polling/publishing process having silently stopped, with the outbox table itself still correctly accumulating events but nothing consuming them. **Fix:** Audit every business-write code path that should publish an event and ensure all of them go through the outbox pattern consistently, not just some; add explicit health monitoring and alerting for the outbox-poller process's own liveness, treating it as critical infrastructure rather than an assumed-reliable background detail.

### 48.9 Interview Thinking

"How do you reliably publish an event when a database write succeeds?" is a direct test of the dual-write problem and the Outbox pattern (§48.3-48.4) — a strong answer explains precisely *why* a naive "write to the database, then publish to the broker" sequence is unreliable (the two operations aren't atomic together) before proposing the outbox table as the specific fix, rather than jumping straight to naming "outbox pattern" without being able to explain the actual problem it solves.

### 48.10 Mini Lab

Implement `create_booking_with_outbox_event` and `poll_and_publish_outbox` against a local database with a minimal `outbox` table (`id`, `event_type`, `payload`, `published`). Create a few bookings, confirm each produces exactly one unpublished outbox row within the same transaction, then run the poller with a `publish_fn` that simply prints each event, confirming all unpublished rows are correctly picked up, "published," and marked accordingly. Then simulate a `publish_fn` failure for one specific event (raise an exception inside it) and confirm that event's row remains `published = FALSE` for a subsequent poll to retry, without affecting the other, successfully-published rows.

---
