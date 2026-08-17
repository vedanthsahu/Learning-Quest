## Project 13: Enterprise Seat Booking Platform — Solution Guide

### Business Reasoning

The business need is coordinating limited physical resources (seats) across many people without double-allocation, while giving administrators genuine visibility and control over the whole organization's usage. The single most unforgiving requirement is double-booking prevention — unlike many correctness bugs, a double-booked seat is immediately, visibly wrong to two real people showing up to the same desk, making this the requirement every other design decision must be checked against first.

### Requirements Analysis

Correctness-under-concurrency and auditability are the two requirements that most shape this design. Concurrency correctness demands a database-enforced guarantee, not an application-level check, since multiple server instances can never be trusted to coordinate purely in their own memory (the same lesson this series' Project 11 already established generally). Auditability demands that a booking's history survive its own modification — ruling out any design that simply overwrites a booking record in place.

### Architecture

```
Book: BEGIN TRANSACTION -> SELECT seat FOR UPDATE (or rely on a unique constraint) -> INSERT booking -> COMMIT
Modify/Cancel: INSERT a new record representing the new state (never UPDATE in place) -> mark previous as superseded
Admin query: dynamically composed WHERE clause from whichever filters are actually supplied
```

### Tradeoff Discussion

**Row-level locking (`SELECT ... FOR UPDATE`) vs. a unique database constraint on (seat_id, date).** Row-level locking within an explicit transaction gives fine control and works even for more complex booking logic (e.g., checking multiple related conditions before committing), but requires careful transaction-boundary discipline throughout the codebase. A unique constraint on `(seat_id, date)` is simpler — the database itself rejects a second insert for an already-booked seat-date pair, with zero explicit locking code required — but is less flexible if booking logic ever needs to check more than simple existence (e.g., partial-day bookings with overlapping time ranges, which a simple uniqueness constraint can't express).

**In-place update vs. append-only versioned history.** In-place update is simpler and matches how many developers instinctively model "a thing that changes," but destroys history — an admin auditing "what did this booking look like before it was changed" has no data to answer that. Append-only versioning (each modification creates a new record, with the current state being the latest version) fully preserves history at the cost of slightly more complex querying (always needing to find "the latest version for this booking" rather than simply reading one row).

### Alternative Designs Considered and Rejected

**A simple SELECT-then-INSERT with no database-level constraint, relying on careful application code to check availability first.** Rejected outright — this is the challenge's first and second named traps combined: under concurrent requests from multiple application instances, two "is it free?" checks can both see "yes" before either INSERT happens, and application-level care alone cannot prevent this race since the two checks aren't coordinated at all. **Overwriting a booking row in place on every modification.** Rejected — this is the challenge's third named trap: it makes "what did this booking look like before the change" an unanswerable question, directly violating the auditability requirement.

### Chosen Design

A unique constraint on `(seat_id, booking_date)` as the primary double-booking defense (simple, database-enforced, sufficient for this project's stated scope of whole-day bookings), combined with `SELECT ... FOR UPDATE` for the seat-lookup step to avoid a confusing constraint-violation error reaching the user in the common case; append-only versioned booking records for full auditability; dynamically composed admin queries built from whichever filter parameters are actually present.

### Implementation Walkthrough

```python
class BookingModel(Base):
    __tablename__ = "bookings"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    seat_id: Mapped[UUID]
    booking_date: Mapped[date]
    user_id: Mapped[str]
    user_type: Mapped[str]                       # "employee" or "guest" -- differentiated rules
    status: Mapped[str]                          # "active", "cancelled", "modified"
    version: Mapped[int]
    superseded_by: Mapped[UUID | None]
    created_at: Mapped[datetime]

    __table_args__ = (
        UniqueConstraint("seat_id", "booking_date", "status",
                          name="uq_active_seat_per_date"),   # DB-enforced, closes the race (partial:
    )                                                          # only enforced where status='active' via
                                                                # a partial index in real PostgreSQL DDL

async def create_booking(seat_id: UUID, booking_date: date, user_id: str, user_type: str, session):
    if not within_booking_limit(user_type, user_id):    # differentiated rule per category (§ scope)
        raise HTTPException(403, "Booking limit exceeded for your user type")
    try:
        async with session.begin():
            booking = BookingModel(id=uuid4(), seat_id=seat_id, booking_date=booking_date,
                                    user_id=user_id, user_type=user_type, status="active", version=1)
            session.add(booking)
            await session.flush()                # constraint violation raises HERE if already booked
    except IntegrityError:
        raise HTTPException(409, "This seat is already booked for that date")
    return booking

async def modify_booking(booking_id: UUID, new_seat_id: UUID, session):
    old = await session.get(BookingModel, booking_id)
    new = BookingModel(id=uuid4(), seat_id=new_seat_id, booking_date=old.booking_date,
                        user_id=old.user_id, user_type=old.user_type,
                        status="active", version=old.version + 1)     # NEW row, old is preserved
    old.status, old.superseded_by = "modified", new.id                # old row NEVER overwritten
    session.add(new)
    await session.commit()
    return new

async def admin_search(session, floor: str | None = None, user_type: str | None = None,
                        date_from: date | None = None, date_to: date | None = None,
                        status: str | None = None) -> list[BookingModel]:
    stmt = select(BookingModel)
    if floor:
        stmt = stmt.join(SeatModel).where(SeatModel.floor == floor)
    if user_type:
        stmt = stmt.where(BookingModel.user_type == user_type)
    if date_from:
        stmt = stmt.where(BookingModel.booking_date >= date_from)
    if date_to:
        stmt = stmt.where(BookingModel.booking_date <= date_to)
    if status:
        stmt = stmt.where(BookingModel.status == status)
    result = await session.execute(stmt)
    return list(result.scalars())
```

The unique constraint (enforced by the database itself, ideally as a partial index on `status = 'active'` in real PostgreSQL DDL) means a second concurrent booking attempt for the same seat-date fails with an `IntegrityError` the database itself guarantees, not an application-level check that could race — directly closing the challenge's first and second named traps. `modify_booking` never updates `old` in place beyond marking its status and linking to its successor — the original row, with its original values, remains permanently queryable, directly satisfying the auditability requirement and closing the third named trap. `admin_search` conditionally appends WHERE clauses only for filters actually supplied, avoiding the fourth named trap of one hardcoded query per filter combination — this scales to any number of optional filters without additional query-writing effort.

### Production Improvements

Add a scheduled job releasing bookings that were never checked in by some cutoff time (a common real-world seat-booking feature, explicitly out of this project's stated scope but worth flagging), following the same background-job pattern as this series' Project 06. Add rate limiting (Project 02) on booking creation specifically during known high-traffic windows (Friday afternoon, before a Monday rush) to prevent the platform's own load from becoming the bottleneck exactly when it matters most.

### Scaling Path

The booking-creation write path is inherently limited by the unique-constraint-enforced serialization for any single seat-date pair — but since different seats are entirely independent of each other, this doesn't limit overall system throughput; the database scales for this workload primarily via adequate indexing (on `seat_id, booking_date` and on the admin-filter columns) rather than requiring sharding at any realistic single-organization scale.

### Interview Discussion

This project closely mirrors real-world "prevent double-booking under concurrency" interview questions common in scheduling and reservation-system design discussions — a strong answer names the database-constraint-based solution unprompted rather than describing an application-level check-then-insert pattern, exactly the distinction the challenge's engineering questions probe.

### Lessons Learned

The core lesson is that correctness-critical invariants (never double-book a seat) belong at the database layer, enforced structurally, rather than in application code that can be raced by concurrent requests across multiple server instances — the same lesson Python Backend Engineering Handbook §27.7's row-locking chapter and §101.5's code-review exercise both teach directly. The append-only versioning pattern used here for auditability recurs in Project 14's document version history.

---
