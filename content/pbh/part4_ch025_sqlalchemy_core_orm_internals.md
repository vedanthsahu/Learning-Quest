## 25. SQLAlchemy Core & ORM Internals

### 25.1 The Problem: Hand-Written SQL Scales Poorly Across a Large, Evolving Codebase

§24's raw `psycopg2` approach works, and the actual Seat Management backend uses it deliberately — but for many teams, especially larger ones with many contributors, hand-written SQL strings scattered across dozens of repository files become hard to keep consistent (subtly different query styles per author), hard to refactor safely (renaming a column means grep-and-replace across many string literals, easy to miss one), and hard to compose (building a query with an optional filter conditionally requires manually assembling SQL strings, error-prone at scale).

### 25.2 Python Mechanism: SQLAlchemy Core — Building Queries as Python Objects, Not Strings

**SQLAlchemy Core** represents a query as a composable Python object graph rather than a string — `select(bookings_table).where(bookings_table.c.seat_id == seat_id)` builds an actual query object that SQLAlchemy compiles to the correct SQL for whichever database backend is configured, and because it's a real object (not text), it can be built up conditionally and incrementally (appending a `.where(...)` clause only if a filter was actually provided) far more safely than string-concatenating optional SQL fragments.

### 25.3 Decision Framework: ORM vs. Raw SQL — A Real, Legitimate Architectural Choice, Not a Maturity Ladder

The **SQLAlchemy ORM**, layered on top of Core, maps Python classes to database tables and lets code work with objects (`booking.status = "CANCELLED"`) rather than explicit SQL statements at all — genuinely valuable when a codebase's data-access patterns are dominated by straightforward CRUD operations on well-defined entities. Raw SQL (§24, or SQLAlchemy Core without the ORM layer) remains the better choice when queries are complex, highly optimized, or need precise control over exactly what SQL executes (companion §30's query-optimization concerns) — the actual Seat Management backend's deliberate choice of raw SQL throughout is not a shortcut or a sign of incompleteness, it's a legitimate response to needing tight, hand-tuned control over complex, performance-sensitive queries (the seat-availability-by-date-range query being the clearest example). Neither is universally "more professional" than the other; the decision should be driven by the actual query complexity and team-scale tradeoffs at hand.

### 25.4 Python Mechanism: The Unit of Work Pattern — the ORM Session Tracks Changes for You

An SQLAlchemy **Session** implements the **Unit of Work** pattern (companion §29's repository/service-layer discussion develops this architecturally): as code mutates ORM-mapped objects (`booking.status = "CANCELLED"`), the Session tracks which objects have changed without immediately issuing SQL, and a single `session.commit()` at the end computes and executes all the necessary `INSERT`/`UPDATE`/`DELETE` statements together, in one transaction. This is a fundamentally different mental model from §24's raw-SQL approach (where every statement is explicit and immediate) — genuinely convenient for typical CRUD flows, but it means understanding *when* SQL actually executes requires understanding the Session's own tracking and flushing behavior, not just reading the Python code's line order.

### 25.5 Tradeoff: ORM Convenience Can Hide the Actual SQL Cost of Innocent-Looking Code

Because the ORM lets code read and write related objects as ordinary Python attribute access (`booking.seat.floor.building.site.site_name`), it's easy to write code that looks like simple attribute traversal but silently triggers a separate SQL query for each relationship hop, unless those relationships were explicitly loaded together upfront — directly the **N+1 query problem** companion §30 develops as its own dedicated failure mode. The ORM's convenience is real, but it specifically trades away *visibility* into when SQL is actually being issued, which is exactly the tradeoff raw SQL (§24) avoids by making every query explicit and visible at the call site.

### 25.6 Implementation

```python
from sqlalchemy import select, Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, Session

Base = declarative_base()

class Seat(Base):
    __tablename__ = "seats"
    id = Column(Integer, primary_key=True)
    seat_code = Column(String)
    floor_id = Column(Integer, ForeignKey("floors.id"))

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True)
    seat_id = Column(Integer, ForeignKey("seats.id"))
    booking_status = Column(String)
    seat = relationship("Seat")             # ORM relationship -- enables
                                              # booking.seat.seat_code access


def cancel_booking(session: Session, booking_id: int) -> None:
    booking = session.get(Booking, booking_id)   # SELECT issued here
    booking.booking_status = "CANCELLED"          # NO SQL yet -- Session
                                                    # just tracks the change
    session.commit()                               # UPDATE issued NOW,
                                                     # as part of Unit of Work
                                                     # (§25.4)


# SQLAlchemy Core-style query (no ORM object mapping needed, §25.2):
def count_confirmed_bookings_per_seat(session: Session, floor_id: int):
    stmt = (
        select(Booking.seat_id, Booking.booking_status)
        .join(Seat, Seat.id == Booking.seat_id)
        .where(Seat.floor_id == floor_id, Booking.booking_status == "CONFIRMED")
    )
    return session.execute(stmt).all()
```

`session.get(Booking, booking_id)` issues one `SELECT`; the subsequent attribute assignment `booking.booking_status = "CANCELLED"` issues *no* SQL at all — it only updates the in-memory object and marks it as "dirty" within the Session's Unit of Work tracking (§25.4); the actual `UPDATE` statement is generated and sent only when `session.commit()` is called. The `count_confirmed_bookings_per_seat` function demonstrates Core-style query building (§25.2): `select(...).join(...).where(...)` composes a query object incrementally, compiled to SQL only when `session.execute(stmt)` actually runs it.

### 25.7 Production Considerations

The N+1 problem (§25.5) is the single most common SQLAlchemy ORM production performance issue — a loop iterating over a list of `Booking` objects and accessing `booking.seat.seat_code` for each one issues one additional `SELECT` *per booking* unless the relationship was eagerly loaded upfront (`select(Booking).options(joinedload(Booking.seat))`), turning what looks like simple attribute access into a query count that scales linearly with result-set size — companion §30 develops the full diagnostic and fix in depth. A related, easy-to-miss cost: the Session itself is not thread-safe and is meant to be scoped to one unit of work (typically one request) — sharing a single Session object across concurrent requests (rather than getting a fresh one per request via a dependency, §20.4's pattern) risks exactly the shared-mutable-state races companion §14 warned about generally.

### 25.8 Debugging

**Symptoms:** An endpoint using the ORM to list a collection of objects and access one related field per object is far slower than expected, with query counts scaling with result size. **Investigation:** Enable SQLAlchemy's query logging (`echo=True` on the engine, or a request-scoped query counter) and count actual SQL statements issued for a single request — a query count proportional to the number of returned rows, rather than a small constant number, is the direct N+1 signature. **Root cause:** A relationship accessed via attribute traversal without being explicitly eager-loaded, triggering one lazy-load query per object per access (§25.5). **Fix:** Add explicit eager loading (`joinedload`, `selectinload`) for any relationship accessed across every item in a collection, converting N+1 queries into 1 or 2.

### 25.9 Interview Thinking

"What's the N+1 query problem, and how does an ORM cause it?" is testing whether you understand the ORM's lazy-loading default behavior (§25.5) specifically, not just that "N+1 is bad" — a strong answer explains *why* it happens (each relationship access is, by default, its own separate query, invisible at the Python call-site level) and names the specific fix (eager loading) rather than a vague "optimize the query" non-answer.

### 25.10 Mini Lab

Set up a minimal SQLAlchemy ORM model pair (`Seat` and `Booking`, as in §25.6) against an in-memory SQLite database for the exercise. Insert several seats and bookings, then write a loop that fetches all bookings and accesses `.seat.seat_code` for each one, with SQLAlchemy's echo logging enabled — count the actual SQL statements issued and confirm it scales with the number of bookings (the N+1 pattern). Then rewrite the fetch using `joinedload` (or `selectinload`) and re-run, confirming the query count drops to a small constant regardless of how many bookings exist.

---
