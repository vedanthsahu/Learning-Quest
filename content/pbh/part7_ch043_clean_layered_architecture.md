## 43. Clean & Layered Architecture for Python Backends

### 43.1 The Problem: A Codebase Without Structure Becomes Unchangeable, Not Just Unpleasant

§29's Repository pattern demonstrated one specific instance of a general problem: a codebase where every concern (HTTP handling, business rules, database queries) is tangled together in the same functions becomes progressively harder to change safely as it grows — a change intended to affect only how data is validated risks breaking business logic it was never meant to touch, simply because the two were never actually separated. This chapter generalizes that specific lesson into a complete architectural discipline for structuring an entire backend.

### 43.2 Engineering Constraint: Dependencies Should Point Inward, Toward Business Logic, Not Outward Toward Infrastructure

**Clean Architecture** (and the closely related **Layered Architecture**) organizes code into concentric layers — domain/business logic at the center, application/service logic around it, infrastructure (databases, external APIs, web frameworks) at the outer edge — with a strict rule: outer layers may depend on inner layers, but inner layers must never depend on outer ones. The actual Seat Management backend's three-layer split (`repositories` → `services` → `api/routes`, §29.2) is a direct, if simplified, instance of exactly this principle: `services/booking_service.py` depends on `repositories/booking_repository.py`'s interface, but the repository module has no knowledge of, and no dependency on, the service layer or FastAPI at all.

### 43.3 Decision Framework: Why This Direction of Dependency, Specifically, Matters

If business logic (a service function like `book_seat`) depended directly on FastAPI-specific types or raw SQL construction inline, testing that business logic (companion §49-50) would require either a running database or extensive mocking of framework internals just to exercise a pure business rule ("can this seat be booked on this date given these existing bookings") that has nothing conceptually to do with either FastAPI or SQL. Keeping the dependency direction inward-only means the domain/business layer can be tested in complete isolation, and — a second, equally real benefit — the outer infrastructure (which specific database, which specific web framework) can be changed without touching business logic at all, since business logic never referenced those specifics in the first place.

### 43.4 Python Mechanism: Protocols as the Interface Contract Between Layers

Companion §4.5's Protocol mechanism is precisely how Clean Architecture's layer-boundary contracts are expressed in Python without heavyweight abstract base classes: a service function can depend on "anything satisfying a `BookingRepository` Protocol" rather than a concrete, specific repository implementation — allowing a test to supply a simple in-memory fake satisfying that same Protocol (companion §50's testing chapter develops this directly) without needing to inherit from any shared base class, and allowing the real implementation to be swapped (raw SQL today, an ORM tomorrow, §25.3's legitimate architectural choice) without the service layer's own code changing at all.

### 43.5 Tradeoff: Architectural Purity vs. Pragmatic, Proportional Structure

Full, textbook Clean Architecture (explicit interfaces for every single dependency, dedicated "use case" classes for every operation, strict enforcement via tooling) is genuinely more structure than a small backend with a handful of endpoints needs — companion §108.10's meta-trap (applying maximum sophistication without a justifying constraint) applies directly to architecture itself, not just individual technology choices. The actual Seat Management backend's simpler three-layer convention (no explicit Protocol interfaces enforced between every repository and service, direct function calls rather than dependency-injected interfaces throughout) is a legitimate, proportional response to its actual scale — the *principle* (dependencies point toward business logic, business logic doesn't know about SQL or HTTP specifics) is followed even without every possible formal mechanism being applied everywhere.

### 43.6 Python Mechanism: Where Validation, Error Handling, and Cross-Cutting Concerns Actually Belong

Given the layering established above, specific concerns have a clear, principled home: input validation via Pydantic models (§21) belongs at the API layer boundary, translating untrusted external input into a well-formed internal representation before it ever reaches business logic; domain-specific exception raising (companion §7) belongs in the service layer, where business rules are actually evaluated and violated; HTTP-status-code translation (companion §7.4) belongs back at the API layer, where a domain exception is translated into the HTTP-specific response shape a caller expects. Each concern lives in exactly one layer, not scattered redundantly across all three.

### 43.7 Implementation

```python
from typing import Protocol

class BookingRepository(Protocol):              # §43.4: the CONTRACT the
    def get_active_booking(self, seat_id: str, date) -> dict | None: ...  # service
    def insert_booking(self, **kwargs) -> dict: ...                        # layer
                                                                              # depends
                                                                              # on --
                                                                              # NOT a
                                                                              # concrete
                                                                              # implementation


class BookingService:                             # business logic layer --
    def __init__(self, repo: BookingRepository):   # depends on the Protocol,
        self.repo = repo                             # never on SQL/HTTP specifics

    def book_seat(self, *, seat_id: str, date, user_id: str) -> dict:
        existing = self.repo.get_active_booking(seat_id, date)
        if existing is not None:
            raise SeatAlreadyBookedError(seat_id, date)   # domain exception
                                                             # (§43.6), NOT an
                                                             # HTTPException --
                                                             # this layer has
                                                             # no knowledge of
                                                             # HTTP at all
        return self.repo.insert_booking(seat_id=seat_id, booking_date=date, user_id=user_id)


class SeatAlreadyBookedError(Exception): ...


# api/routes/bookings.py -- the OUTER layer, translates domain <-> HTTP
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/bookings")
def create_booking(payload: dict, service: BookingService = ...):  # DI, §20
    try:
        return service.book_seat(seat_id=payload["seat_id"], date=payload["date"], user_id="u-1")
    except SeatAlreadyBookedError as exc:
        raise HTTPException(409, str(exc)) from exc   # HTTP translation
                                                          # happens HERE, at
                                                          # the boundary --
                                                          # not inside the
                                                          # service (§43.6)
```

`BookingService.book_seat` never imports or references `fastapi`, `HTTPException`, or any SQL — it depends only on the `BookingRepository` Protocol and raises a plain Python exception when a business rule is violated, meaning this exact class can be unit-tested (companion §50) by supplying a trivial in-memory fake implementing the Protocol, with zero database or web framework involved at all. The route handler is where — and *only* where — the domain exception `SeatAlreadyBookedError` becomes an HTTP-specific `409` response, keeping that translation decision entirely out of the business logic it's translating.

### 43.8 Production Considerations

A codebase that violates this layering gradually (a route handler that "just this once" constructs a raw SQL query directly, bypassing the service/repository layers, for a quick feature) accumulates these violations invisibly over time — each individual instance seems harmless, but the accumulated effect is a codebase where the original architectural discipline no longer actually holds anywhere reliably, undermining the testability and swappability benefits §43.3 was meant to provide. Code review is the practical enforcement mechanism for this discipline in most teams (rather than automated tooling, though import-linting tools exist for stricter enforcement) — a reviewer explicitly checking "does this route handler contain business logic that belongs in the service layer" or "does this service function construct SQL that belongs in a repository" catches drift before it compounds.

### 43.9 Debugging

**Symptoms:** A business-logic bug fix requires touching code across three or four different files that seem unrelated to the actual rule being fixed; writing a unit test for a specific business rule requires setting up a real database connection just to exercise it. **Investigation:** Trace where the actual business decision (the `if` statement implementing the rule) lives, and check whether it's genuinely isolated in a service-layer function or scattered across route handlers and repository functions that also each contain fragments of unrelated concerns. **Root cause:** Layering violations accumulated over time, mixing business logic with HTTP or SQL concerns in ways that make each concern harder to change or test independently of the others (§43.8). **Fix:** Refactor the specific tangled code path to restore the layering discipline — extract business logic into a pure service-layer function depending only on Protocol-typed repository interfaces, moving SQL construction into repository functions and HTTP-status translation into route handlers, exactly as §43.7 demonstrates.

### 43.10 Interview Thinking

"How would you structure a new feature's code across a FastAPI backend?" is testing whether you propose this three (or more)-layer separation with dependencies pointing inward (§43.2-43.3) by default, rather than writing everything inline in the route handler — a strong answer explicitly names *why* the separation matters (independent testability, swappable infrastructure) rather than reciting "separation of concerns" as an unexplained platitude.

### 43.11 Mini Lab

Take §43.7's `BookingService` and write a unit test for `book_seat` using a simple, hand-written fake class satisfying the `BookingRepository` Protocol (an in-memory dict standing in for the database, with `get_active_booking` and `insert_booking` methods operating on it) — confirm the test exercises the `SeatAlreadyBookedError` business rule correctly with zero real database connection, zero FastAPI import, and zero HTTP involved at all, directly demonstrating the testability benefit this chapter's layering discipline exists to provide.

---
