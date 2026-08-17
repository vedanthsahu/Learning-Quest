## 27. Transactions & Isolation Levels

### 27.1 The Problem: Multiple Writes That Must Succeed or Fail Together

Cancelling a booking might require both updating the booking's status *and* releasing the seat's availability record — if the first write succeeds and the process crashes (or an exception occurs) before the second, the database is left in an inconsistent state: a cancelled booking still holding a seat as unavailable, or worse depending on the exact operations involved. A **transaction** is the mechanism guaranteeing that a group of writes either all succeed together or all fail together, with no partial, inconsistent outcome ever visible to any other query.

### 27.2 Python Mechanism: `BEGIN`, `COMMIT`, and `ROLLBACK`

A transaction implicitly begins with the first statement executed on a connection (in `psycopg2`'s default mode) and ends with an explicit `commit()` (making every change permanent and visible to other connections) or `rollback()` (discarding every change made since the transaction began, as if none of them happened). This directly connects to companion §3.6's transaction context-manager pattern: the `try`/`except`/`finally` structure that commits on success and rolls back on any exception is precisely how this all-or-nothing guarantee gets applied consistently in real code, rather than depending on every call site remembering to call `commit()` or `rollback()` correctly by hand.

### 27.3 Engineering Constraint: Concurrent Transactions Can Interact in Specific, Named Ways

When two transactions run concurrently against overlapping data, several distinct anomalies are possible: a **dirty read** (seeing another transaction's uncommitted, possibly-about-to-be-rolled-back changes), a **non-repeatable read** (reading the same row twice within one transaction and getting different values because another transaction committed a change in between), and a **phantom read** (a query returning a different *set* of rows on a second execution because another transaction inserted or deleted matching rows in between). Each of these is a genuine, named correctness risk, not a hypothetical edge case — a booking system checking seat availability and then creating a booking is directly exposed to exactly this class of race if not protected against it.

### 27.4 Decision Framework: Isolation Levels Trade Correctness Guarantees Against Concurrency and Performance

PostgreSQL's isolation levels — **Read Committed** (the default; prevents dirty reads, allows non-repeatable and phantom reads), **Repeatable Read** (additionally prevents non-repeatable reads), and **Serializable** (prevents all three anomalies, behaving as if transactions ran one at a time) — form a spectrum from more concurrency/less protection to less concurrency/more protection. Read Committed is sufficient for the large majority of ordinary CRUD operations; Serializable (or an explicit locking strategy, §27.5) is warranted specifically when a genuine business-correctness risk exists from concurrent access to the *same* data, such as two users racing to book the last available seat for the same date.

### 27.5 Python Mechanism: `SELECT ... FOR UPDATE` — Explicit Row-Level Locking

`SELECT ... FOR UPDATE` locks the selected rows for the duration of the current transaction, blocking any other transaction attempting to also select those same rows `FOR UPDATE` (or update them directly) until the first transaction commits or rolls back — a more targeted, often more practical tool than raising the entire transaction's isolation level, specifically for the common "check availability, then act on it" pattern: locking the specific seat/date row being checked ensures no other concurrent transaction can also pass the same availability check before the first transaction commits its booking.

### 27.6 Implementation

```python
def book_seat_safely(conn, *, tenant_id: str, seat_id: str, booking_date, user_id: str) -> dict:
    with conn.cursor() as cur:
        try:
            # Lock this specific seat+date combination for the duration of
            # this transaction -- any OTHER transaction trying to book the
            # same seat/date will block here until this one commits or
            # rolls back (§27.5), preventing the double-booking race.
            cur.execute(
                """
                SELECT id FROM bookings
                WHERE seat_id = %s AND booking_date = %s
                  AND tenant_id = %s AND booking_status = 'CONFIRMED'
                FOR UPDATE
                """,
                (seat_id, booking_date, tenant_id),
            )
            if cur.fetchone() is not None:
                raise ValueError("Seat already booked for this date")

            cur.execute(
                """
                INSERT INTO bookings (tenant_id, seat_id, booking_date, booked_for_user_id, booking_status)
                VALUES (%s, %s, %s, %s, 'CONFIRMED')
                RETURNING id, booking_date, booking_status
                """,
                (tenant_id, seat_id, booking_date, user_id),
            )
            result = dict(zip(("id", "booking_date", "booking_status"), cur.fetchone()))
            conn.commit()                   # releases the row lock (§27.2)
            return result
        except Exception:
            conn.rollback()                  # ALSO releases the row lock --
            raise                             # locks never outlive the
                                                # transaction that took them
```

The `FOR UPDATE` clause on the availability-check `SELECT` means that if two requests race to book the exact same seat and date simultaneously, the second transaction's `SELECT ... FOR UPDATE` blocks until the first transaction either commits (in which case the second transaction's own subsequent check will now correctly see the just-created booking and correctly raise `ValueError`) or rolls back (in which case the second transaction proceeds as if the first never happened) — the double-booking race is closed at the database level, not merely hoped-away by application-level timing assumptions.

### 27.7 Production Considerations

A transaction holding a `FOR UPDATE` lock for an extended duration (because it also does slow, unrelated work — an external API call, a slow computation — before committing) directly blocks every other transaction competing for the same locked rows for that entire duration, a real throughput risk if locking is combined carelessly with slow operations inside the same transaction — the discipline (mirroring companion §14.8's "keep critical sections short" principle exactly, now at the database-transaction level) is keeping a transaction's lifetime as short as possible, doing only the strictly necessary database work inside it and nothing slower. A transaction that's never explicitly committed or rolled back (a connection returned to the pool mid-transaction due to a code path that forgot the cleanup) can leave locks held far longer than intended — precisely why companion §3.6's guaranteed-cleanup context-manager pattern matters as much here as for any other resource.

### 27.8 Debugging

**Symptoms:** Under concurrent load, two requests both succeed in booking what should be a single, exclusive resource (a double-booking); alternatively, requests intermittently hang for an unexpectedly long time under moderate concurrent load, with no error, eventually completing. **Investigation:** For double-booking, check whether the availability check and the subsequent write happen inside one transaction with appropriate locking (`FOR UPDATE`) or as two separate, unprotected statements. For hanging requests, check for a long-held lock — a transaction doing slow, unrelated work while still holding a row lock from an earlier `FOR UPDATE`. **Root cause:** A missing lock allowing a genuine race condition to reach the database layer unprotected, or an overly long transaction holding a necessary lock far longer than the actual locked operation requires. **Fix:** Add `SELECT ... FOR UPDATE` (or an equivalent explicit locking/constraint strategy) around the specific check-then-act sequence; shorten transaction lifetimes by moving any slow, non-database work outside the transaction boundary entirely.

### 27.9 Interview Thinking

"How would you prevent two users from booking the same seat simultaneously?" is a canonical prompt testing whether you reach for transactional row-locking (`FOR UPDATE`, §27.5) as the correct database-level fix, rather than an application-level check that looks correct in isolated testing but has an unprotected race under real concurrency (companion §14.1's exact race-condition shape, now at the database layer) — a strong answer also mentions a unique database constraint (companion §31) as a complementary, defense-in-depth safety net beneath the application-level lock.

### 27.10 Mini Lab

Using a local PostgreSQL instance, create a minimal `bookings` table and implement §27.6's `book_seat_safely` function. Using two separate connections (simulating two concurrent requests), attempt to book the same seat and date from both at nearly the same time (e.g., using threads or separate async tasks) and confirm exactly one succeeds while the other correctly raises the "already booked" error — then remove the `FOR UPDATE` clause, re-run the same concurrent test several times, and observe that a double-booking can now occasionally occur, directly demonstrating the race the lock exists to prevent.

---
