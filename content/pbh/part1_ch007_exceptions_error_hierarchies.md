## 7. Exceptions & Error Hierarchies for APIs

### 7.1 The Problem: An API Needs to Tell Callers *What Kind* of Thing Went Wrong

A backend fails for many distinct reasons — a client sent invalid input, a requested resource doesn't exist, a user lacks permission, a downstream dependency timed out, an unexpected bug occurred — and each of these deserves a genuinely different HTTP status code and response shape. Code that catches a bare, generic `Exception` everywhere and returns a flat "something went wrong" response has thrown away exactly the information a well-designed API needs to be useful to its caller.

### 7.2 Engineering Constraint: Exceptions Form a Type Hierarchy, and `except` Matches by Type

Python's exceptions are classes, related by inheritance — `ValueError` and `KeyError` both inherit from `Exception`, which inherits from `BaseException`. An `except SomeType:` clause catches that type *and every subclass of it* — this is the mechanism that makes deliberately designing your own exception hierarchy valuable: catching a shared base class lets calling code handle an entire category of related errors uniformly, while catching a specific subclass lets it handle one particular case differently.

### 7.3 Decision Framework: Design a Domain-Specific Exception Hierarchy, Don't Reuse Built-Ins for Domain Errors

Raising a bare `ValueError` for "booking not found" and a bare `ValueError` for "seat already booked" makes both errors indistinguishable to calling code without inspecting the error message string — a fragile, easy-to-break coupling. The better pattern: define a small hierarchy of custom exceptions specific to your domain (`BookingNotFoundError`, `SeatAlreadyBookedError`, both inheriting from a common `BookingError`) so that calling code (crucially, the API layer's error handler) can catch by *type*, mapping each exception class to the correct HTTP status code deterministically, rather than parsing error message text.

### 7.4 Tradeoff: A Central Exception Handler vs. Per-Endpoint Try/Except

Catching and translating exceptions to HTTP responses inside every single route handler is repetitive and inconsistent — different handlers will inevitably drift in exactly which status code they return for "not found." A centralized exception handler (FastAPI's `@app.exception_handler`, §18) that maps exception types to responses in one place guarantees consistency and means a route handler's own code can simply `raise` a meaningful domain exception and trust the framework to translate it correctly — at the cost of that mapping logic living somewhere less locally visible than the handler itself, a tradeoff worth making deliberately, not by accident.

### 7.5 Python Mechanism: `raise ... from ...` Preserves the Original Cause

When translating a low-level exception into a higher-level domain one (catching a database driver's connection error and re-raising as your own `BookingServiceUnavailableError`), `raise NewError(...) from original_exception` preserves the original exception as the new one's `__cause__`, visible in the traceback — losing this chain (raising a fresh exception with no `from`) discards exactly the low-level detail a real production investigation needs to find the actual root cause underneath the domain-level error message.

### 7.6 Implementation

```python
class BookingError(Exception):
    """Base for all booking-domain errors -- callers can catch this broadly."""

class BookingNotFoundError(BookingError):
    def __init__(self, booking_id: str):
        self.booking_id = booking_id
        super().__init__(f"Booking {booking_id} not found")

class SeatAlreadyBookedError(BookingError):
    def __init__(self, seat_id: str, date):
        self.seat_id = seat_id
        self.date = date
        super().__init__(f"Seat {seat_id} already booked for {date}")


def cancel_booking(booking_id: str, repo) -> None:
    try:
        booking = repo.get(booking_id)
    except KeyError as exc:
        raise BookingNotFoundError(booking_id) from exc   # preserves original
                                                            # cause (§7.5)
    if booking is None:
        raise BookingNotFoundError(booking_id)
    booking.cancel()


# API-layer translation (illustrative -- FastAPI's real mechanism is in §18):
def to_http_response(exc: BookingError) -> tuple[int, dict]:
    if isinstance(exc, BookingNotFoundError):
        return 404, {"error": "not_found", "booking_id": exc.booking_id}
    if isinstance(exc, SeatAlreadyBookedError):
        return 409, {"error": "conflict", "seat_id": exc.seat_id}
    return 500, {"error": "unknown_booking_error"}   # base BookingError catch-all
```

`BookingError` as a common base (§7.3) means code that only cares "was this a booking-domain problem at all" can `except BookingError:` once, while the HTTP-translation layer distinguishes `BookingNotFoundError` (404) from `SeatAlreadyBookedError` (409) by type, never by inspecting message text. `raise BookingNotFoundError(booking_id) from exc` keeps the original `KeyError` visible in the traceback for debugging, while still letting calling code work with the meaningful, domain-specific exception type.

### 7.7 Production Considerations

An exception hierarchy that's too flat (everything is just `BookingError`) loses the type-based dispatch benefit §7.3 exists for; one that's too deep and granular (a distinct exception class per validation rule) becomes its own maintenance burden with little corresponding benefit — the right granularity is "one exception type per distinct HTTP-response-relevant outcome," not one per every possible internal reason. A related production discipline: never let a raw, unexpected exception (a `KeyError`, a database driver's internal exception type) leak all the way to the API boundary unhandled — an unhandled 500 response with a raw internal exception's message risks exposing internal implementation detail (table names, internal file paths) to an external caller, a real, if minor, security concern (companion §63's injection/OWASP chapter develops this further).

### 7.8 Debugging

**Symptoms:** An API endpoint returns a generic 500 error for a condition that should clearly be a 404 or 400; a production error log shows a low-level exception (a database driver error) with no indication of which higher-level domain operation was in progress when it occurred. **Investigation:** Check whether the failing code path raises a domain-specific exception at all, or lets a low-level exception propagate untranslated; check whether `raise ... from ...` was used, or whether the original exception's context was discarded. **Root cause:** Missing domain-exception translation at the point where a low-level failure is first detected. **Fix:** Catch the low-level exception at the boundary where it's first meaningful to translate, and `raise` an appropriate domain exception `from` it, preserving the chain for debugging while giving the API layer a type it can dispatch on correctly.

### 7.9 Interview Thinking

"How would you structure error handling for this API?" is testing whether you propose a type-based domain exception hierarchy with centralized translation (§7.3-7.4) rather than scattered per-endpoint try/except blocks returning ad hoc error dicts — a strong answer also proactively mentions never leaking raw internal exceptions to API responses (§7.7) as a security-adjacent detail interviewers specifically listen for.

### 7.10 Mini Lab

Design a small exception hierarchy for a guest-visit domain: a base `GuestVisitError`, and two specific subclasses `GuestVisitNotFoundError` and `GuestVisitAlreadyCheckedInError`. Write a `check_in_visit(visit_id, repo)` function that raises the appropriate specific exception for each failure case (using `raise ... from ...` where a lower-level lookup failure is being translated), then write a small `to_http_response` function mapping each specific exception type to a distinct status code, verifying via a few test calls that each exception type produces the correct mapped response.

---
