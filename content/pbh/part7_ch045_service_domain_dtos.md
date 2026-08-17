## 45. Service Layer, Domain Layer & DTOs

### 45.1 The Problem: §43's Two Layers Aren't Always Enough — Complex Business Rules Need Their Own Home, Separate From Orchestration

§43 established service-layer code that both implements business rules *and* orchestrates calls to repositories, in one function. For a backend with genuinely complex business logic (multi-step booking-eligibility rules, companion-actual-backend's `check_booking_eligibility`, involving several distinct conditions), conflating "what is the rule" with "how do I fetch the data needed to evaluate it" inside one function makes the rule itself harder to isolate, read, and test independently of the data-fetching orchestration surrounding it.

### 45.2 Decision Framework: Separate the Domain Layer (Pure Rules) From the Service Layer (Orchestration) When Business Logic Genuinely Warrants It

A **domain layer** contains pure business logic — functions or classes operating only on already-in-memory domain objects, with *zero* dependency on a database, an HTTP framework, or any I/O at all (a `is_booking_eligible(booking_history: list[Booking], requested_date: date) -> bool` function taking already-loaded data and returning a pure decision). The **service layer** (§43's original scope) becomes purely an orchestrator: fetch the data the domain logic needs (via repositories), hand it to the domain layer for the actual decision, then act on that decision (via repositories again, to persist a result). This further split is genuinely worth its added indirection specifically when domain rules are complex enough to want independent, I/O-free testing (companion §50) and reuse across multiple different service-layer orchestrations — for simpler rules, §43's two-layer split (service layer containing both the rule and the orchestration together) remains entirely sufficient, and this three-layer split shouldn't be applied by default regardless of actual complexity (companion §108.10's proportionality principle, again).

### 45.3 Python Mechanism: A DTO Carries Data Across a Layer Boundary Without Leaking Internal Representation

A **DTO (Data Transfer Object)** is a simple, structured object (often a dataclass, companion §4.2) whose sole purpose is carrying data across a layer boundary — from a repository's raw database row shape into the service/domain layer's own preferred shape, or from the domain layer's internal representation out to whatever the API layer needs to serialize as a response. This is distinct from, though related to, §21's Pydantic request/response models: those specifically validate and serialize data at the *API* boundary; a DTO can exist at *any* internal layer boundary, and doesn't need Pydantic's validation machinery at all if the data crossing that specific boundary is already trusted, internally-generated data rather than external, unvalidated input.

### 45.4 Tradeoff: DTOs Prevent Leaking a Repository's Row Shape Directly Into Business Logic, at the Cost of a Translation Step

Passing a raw database row (a `dict` or an ORM row object, companion §25) directly into domain-layer logic couples that logic to the database's specific column names and types — a column rename in the database now requires hunting down every place in the domain layer that happened to reference `row["seat_id"]` directly, exactly the coupling companion §43.2's inward-dependency-direction rule warns against. A DTO explicitly translated at the repository boundary (the repository returns a `BookingRecord` dataclass, not a raw dict) means the domain layer only ever depends on the DTO's stable, deliberately-designed shape — a database schema change requires updating the translation step in one place (where the DTO is constructed from the raw row), not hunting through every domain-layer function that happens to consume that data.

### 45.5 Implementation

```python
from dataclasses import dataclass
from datetime import date

# The DTO -- the STABLE shape the domain layer depends on, decoupled
# from whatever the actual database row/ORM object looks like (§45.3-45.4)
@dataclass(frozen=True)
class BookingRecord:
    seat_id: str
    booking_date: date
    status: str


# DOMAIN LAYER -- pure business rule, zero I/O, zero framework dependency
def is_booking_eligible(
    existing_bookings: list[BookingRecord],
    requested_date: date,
    max_bookings_per_week: int = 3,
) -> tuple[bool, str | None]:
    same_week_count = sum(
        1 for b in existing_bookings
        if b.status == "CONFIRMED" and _same_iso_week(b.booking_date, requested_date)
    )
    if same_week_count >= max_bookings_per_week:
        return False, f"Maximum {max_bookings_per_week} bookings per week exceeded"
    return True, None

def _same_iso_week(d1: date, d2: date) -> bool:
    return d1.isocalendar()[:2] == d2.isocalendar()[:2]


# SERVICE LAYER -- orchestrates: fetch (repository) -> decide (domain) -> act
def check_and_book(conn, *, user_id: str, seat_id: str, requested_date: date) -> dict:
    raw_bookings = booking_repository.get_bookings_for_user(conn, user_id)   # raw
                                                                                # rows
    bookings = [                                                                # DTO
        BookingRecord(seat_id=r["seat_id"], booking_date=r["booking_date"], status=r["status"])  # translation
        for r in raw_bookings                                                    # (§45.4)
    ]

    eligible, reason = is_booking_eligible(bookings, requested_date)   # PURE
                                                                          # domain
                                                                          # decision
    if not eligible:
        raise BookingNotEligibleError(reason)

    return booking_repository.insert_booking(conn, seat_id=seat_id, booking_date=requested_date, user_id=user_id)

class BookingNotEligibleError(Exception): ...
def booking_repository(): ...
```

`is_booking_eligible` takes only a list of `BookingRecord` DTOs and a date — it has no idea a database exists, cannot be affected by a database being unavailable, and can be tested with a hand-constructed list of three or four `BookingRecord` instances in milliseconds, with zero setup (§45.2's testability benefit, concretely realized). `check_and_book` (the service layer) does the actual translation from raw repository rows into `BookingRecord` DTOs (§45.4) before ever calling into the domain function — the domain layer's stability against a future database schema change is a direct, structural consequence of this explicit translation step existing at all.

### 45.6 Production Considerations

The domain layer's pure, I/O-free nature makes it an excellent target for extensive property-based or table-driven testing (companion §50) covering many edge cases cheaply, since each test runs in microseconds with no database setup — investing disproportionately in domain-layer test coverage, relative to the service/repository layers' comparatively thinner integration-test coverage, is a reasonable and common allocation of testing effort precisely because it's so cheap to achieve here. A common anti-pattern worth actively avoiding: a "domain" function that looks pure (takes DTOs, returns a decision) but secretly calls out to an external service or the database from deep inside its own logic — this silently breaks every one of §45.2's stated benefits (testability, decoupling) while still looking, at a glance, like it follows the pattern; genuine domain-layer purity should be enforceable and verifiable (no imports of database or HTTP libraries anywhere in that module), not just aspirational.

### 45.7 Debugging

**Symptoms:** A "pure" domain-layer test unexpectedly requires a database connection to run, or fails when run offline/in isolation. **Investigation:** Search the domain module for any import of a database driver, HTTP client, or other I/O-capable library, and for any function call reaching outside the module's own pure logic into a repository or external service call. **Root cause:** A domain-layer function that isn't actually pure — it has an I/O dependency smuggled in somewhere inside its call chain, silently violating the isolation §45.2 was meant to guarantee. **Fix:** Extract the I/O-dependent portion out to the service layer, passing its result into the domain function as a plain argument (or DTO) instead, restoring genuine purity to the domain layer.

### 45.8 Interview Thinking

"How would you make a complex business rule easy to unit test without needing a database?" is testing whether extracting pure domain logic (§45.2) taking plain DTOs (§45.3) as input, with all I/O pushed to a surrounding orchestration layer, is your default answer — a strong answer explicitly names the specific benefit (millisecond, dependency-free tests covering many edge cases) rather than only describing the pattern's structure abstractly.

### 45.9 Mini Lab

Implement `is_booking_eligible` and `BookingRecord` as in §45.5, then write at least four unit tests directly against `is_booking_eligible` alone — no database, no repository, no service layer involved — covering: zero prior bookings (eligible), exactly at the weekly limit (eligible for one more), over the weekly limit (ineligible with the correct reason message), and bookings in a *different* week than the requested date (correctly not counted toward the current week's limit). Confirm every test runs in well under a millisecond, directly demonstrating the domain layer's I/O-free testability.

---
