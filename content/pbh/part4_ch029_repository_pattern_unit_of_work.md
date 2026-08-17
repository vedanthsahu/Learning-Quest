## 29. Repository Pattern & Unit of Work

### 29.1 The Problem: Business Logic Tangled Directly With SQL Is Hard to Test and Hard to Change

A route handler (or service function) that constructs SQL queries directly inline alongside its actual business logic (deciding whether a booking is allowed, computing a discount) makes both harder: testing the business logic requires a real database connection just to exercise code that has nothing conceptually to do with SQL, and changing the database access pattern (switching a query's structure, adding a cache layer in front of it) requires touching code that also contains unrelated business rules, risking breaking one while changing the other.

### 29.2 Engineering Constraint: Separating "What Data Access Looks Like" From "What the Business Rule Is"

The actual Seat Management backend already demonstrates this separation structurally: `repositories/*.py` contains only data-access code (the actual SQL), `services/*.py` contains business logic that calls into repositories but never constructs SQL itself, and `api/routes/*.py` contains only HTTP-level concerns, calling into services. This three-layer separation is not incidental style — it's a direct application of the **Repository pattern**, and understanding it explicitly (rather than just imitating its file layout) is what lets you extend it correctly as a codebase grows.

### 29.3 Decision Framework: A Repository's Interface Should Speak the Domain's Language, Not the Database's

A well-designed repository method is named and shaped around what the business logic actually needs (`get_active_bookings_for_seat(seat_id, tenant_id)`) rather than exposing raw query-building primitives to its callers — the repository owns the decision of exactly which columns, joins, and filters that need translates to, and callers never need to know or care whether it's raw SQL (§24), SQLAlchemy Core (§25.2), or the ORM (§25.4) underneath. This is precisely companion §4.5's Protocol/structural-typing principle applied at the architectural layer: a service function depending on "something with a `get_active_bookings_for_seat` method" doesn't need to know or care about the concrete repository implementation behind that interface.

### 29.4 Python Mechanism: The Repository as a Thin, Focused Class (or Module of Functions)

A repository can be implemented as a class (with a database session/connection injected via its constructor) or, as the actual Seat Management backend does, as a module of plain functions each taking a connection as their first parameter — both are legitimate; the actual discipline that matters is that every function/method in the repository is narrowly scoped to one entity's data access, and contains no business-rule branching (an `if` deciding *whether* an action should be allowed belongs in the service layer, not the repository, which should only concern itself with *how* to read or write data once a decision has already been made).

### 29.5 Tradeoff: Repository Abstraction Has a Real Cost When Overused for Trivial Access

Wrapping every single-table lookup in its own repository method, even ones used exactly once, adds a layer of indirection whose benefit (testability, swappability) may not be worth its cost for genuinely simple, one-off queries — the discipline worth maintaining is applying the repository pattern where it earns its keep (entities accessed from multiple services, complex queries worth isolating and unit-testing independently) rather than as a blanket rule applied uniformly regardless of actual reuse or complexity, mirroring companion §2.5's identical judgment about when a decorator earns its own indirection cost.

### 29.6 Python Mechanism: Unit of Work Coordinates Multiple Repositories Within One Transaction

The **Unit of Work** pattern (§25.4 introduced its ORM-Session-specific instance) generalizes to raw-SQL repository code as well: when a single business operation needs to write through *multiple* repositories (cancelling a guest visit might need both the `guest_visit_repository` and the `booking_repository` to write within the same transaction, exactly as the actual backend's `cancel_guest_visit_record` does), all of those writes must share the same connection/transaction so that §27's all-or-nothing guarantee actually holds across the *entire* operation, not just within one repository's own individual calls.

### 29.7 Implementation

```python
# repositories/booking_repository.py -- data access ONLY, no business rules
def get_active_booking_for_seat_date(conn, *, seat_id: str, booking_date, tenant_id: str):
    with conn.cursor() as cur:
        cur.execute(
            """SELECT id FROM bookings
               WHERE seat_id = %s AND booking_date = %s AND tenant_id = %s
                 AND booking_status = 'CONFIRMED' FOR UPDATE""",
            (seat_id, booking_date, tenant_id),
        )
        return cur.fetchone()

def insert_booking(conn, *, tenant_id, seat_id, booking_date, user_id):
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO bookings (tenant_id, seat_id, booking_date, booked_for_user_id, booking_status)
               VALUES (%s, %s, %s, %s, 'CONFIRMED') RETURNING id""",
            (tenant_id, seat_id, booking_date, user_id),
        )
        return cur.fetchone()[0]


# services/booking_service.py -- business rules, calls repositories, owns the transaction
from backend.repositories import booking_repository

def book_seat(conn, *, tenant_id, seat_id, booking_date, user_id):
    existing = booking_repository.get_active_booking_for_seat_date(
        conn, seat_id=seat_id, booking_date=booking_date, tenant_id=tenant_id
    )
    if existing is not None:
        raise SeatAlreadyBookedError(seat_id, booking_date)   # BUSINESS RULE
                                                                 # lives HERE,
                                                                 # not in the
                                                                 # repository
    booking_id = booking_repository.insert_booking(
        conn, tenant_id=tenant_id, seat_id=seat_id, booking_date=booking_date, user_id=user_id
    )
    conn.commit()                # ONE transaction covering BOTH repository
    return booking_id             # calls together (§29.6)
```

`get_active_booking_for_seat_date` and `insert_booking` are pure data-access functions — neither one decides *whether* a booking should be allowed, they simply perform their one specific read or write operation, given a connection. `book_seat` (the service layer) owns the actual business decision (raising `SeatAlreadyBookedError` if a conflict exists, directly reusing companion §7's domain exception hierarchy) and owns the transaction boundary — both repository calls happen on the *same* `conn`, and `commit()` is called once, at the service layer, after both have completed successfully (§29.6's Unit-of-Work coordination).

### 29.8 Production Considerations

Keeping the transaction boundary in the service layer (not scattered into individual repository functions each calling their own `commit()`) is what makes §29.6's multi-repository coordination possible at all — a repository function that commits its own transaction internally would make it structurally impossible for a service to later combine it with another repository call inside one atomic operation, a design mistake that's often only discovered once a genuine need for cross-repository atomicity arises and the existing repository code has to be refactored under time pressure to remove premature internal commits. This three-layer separation also directly enables companion §51's testing strategy: the service layer's business logic can be unit-tested against a fake/mock repository (implementing the same narrow interface, §29.3, without touching a real database at all), while the repository layer itself gets its own, separate integration tests against a real database.

### 29.9 Debugging

**Symptoms:** A multi-step operation (cancel a visit and its booking together) leaves the database in a partially-updated state after a failure — one write succeeded, a related one didn't. **Investigation:** Check whether every repository function involved in the operation is called with the *same* connection object, and whether any individual repository function calls its own `commit()` internally rather than leaving that decision to the calling service. **Root cause:** Repository-level commits breaking the atomicity a service-level, single-transaction Unit of Work was supposed to provide across multiple repository calls (§29.6-29.8). **Fix:** Remove any internal `commit()` calls from repository functions, moving transaction ownership (`commit()`/`rollback()`) entirely to the service layer that coordinates multiple repository calls within one logical operation.

### 29.10 Interview Thinking

"How would you structure the code for an operation that needs to update two different tables atomically?" tests whether you understand transaction-boundary ownership belongs at the layer coordinating multiple data-access calls (the service layer, §29.6, §29.8), not scattered into each individual repository function — a strong answer explicitly states that repository functions should never commit their own transactions internally, precisely because doing so makes cross-repository atomicity structurally impossible later.

### 29.11 Mini Lab

Following §29.7's pattern, write a `guest_visit_repository` module with a narrow `cancel_visit(conn, visit_id)` function and reuse `booking_repository`'s functions from §29.7, then write a `cancel_guest_visit_with_booking(conn, visit_id, seat_id, booking_date, tenant_id)` service function that calls both repositories' relevant functions on the same connection and commits once at the end. Deliberately introduce a failure partway through (raise an exception after the first repository call succeeds but before the second), confirm via `rollback()` that neither change persists, then remove the induced failure and confirm both changes commit together correctly.

---
