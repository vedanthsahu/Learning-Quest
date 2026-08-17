## 46. Error Handling Strategy & API Versioning

### 46.1 The Problem: An API's Contract Isn't Just Its Happy Path, and It Isn't Frozen Forever

Companion §7 and §43.6 established where error translation belongs architecturally; this chapter completes that picture at the whole-API level — a consistent, predictable error response *shape* across every endpoint (not just correct status codes per endpoint individually), and the related, distinct problem of evolving an API's contract over time without breaking clients who integrated against an earlier version.

### 46.2 Python Mechanism: FastAPI's Centralized Exception Handlers

Beyond the per-domain-exception mapping companion §7.4 introduced conceptually, FastAPI's `@app.exception_handler(ExceptionType)` registers a single, application-wide handler for a given exception type (or a shared base class, companion §7.3's hierarchy) — meaning every route across the entire application that raises, say, `BookingError` (or any subclass) gets identical, consistent error-response formatting automatically, without each individual route needing its own try/except translation logic. This directly closes the consistency gap a purely per-route approach risks: without centralization, two different engineers writing two different endpoints can easily produce two subtly different error-response shapes for what should be the identically-formatted category of error.

### 46.3 Decision Framework: A Consistent Error Response Shape Is Itself Part of Your API Contract

Every error response across an entire API should share a predictable structure (an `error` object with a `code` and `message`, directly the shape the actual Seat Management backend's `sso.py` `_error_response` helper already establishes) — a frontend team integrating against the API can then write *one* generic error-handling function covering every endpoint, rather than needing endpoint-specific error-parsing logic scattered throughout the frontend codebase. Deciding this shape once, early, and enforcing it centrally (§46.2) is meaningfully cheaper than retrofitting consistency across dozens of already-inconsistent endpoints later.

### 46.4 Engineering Constraint: A Breaking API Change Affects Every Client That Hasn't Yet Updated, Simultaneously

Renaming a response field, changing a field's type, or removing an endpoint entirely breaks every client still depending on the old shape, the instant the change deploys — unlike a database migration (companion §28), where you control every consumer (your own application code), an API's consumers may include external partners, third-party integrations, or older versions of your own frontend still cached in users' browsers, none of which you can force to update simultaneously with your backend's deployment.

### 46.5 Decision Framework: URL-Path Versioning vs. Header-Based Versioning

**URL-path versioning** (`/v1/bookings`, `/v2/bookings`) makes the version explicit and highly visible, simple for clients to understand and simple to route at the infrastructure level (a reverse proxy can route `/v1/*` and `/v2/*` to entirely different backend deployments if needed) — the practical default for most REST APIs, including how a v2 of the actual Seat Management backend would most naturally be introduced. **Header-based versioning** (a custom `Api-Version` request header) keeps URLs stable across versions, which some API design philosophies prefer, at the cost of being less visible/discoverable and requiring every client to remember to set the header correctly. For most backend teams, URL-path versioning's simplicity and visibility make it the more practical, more commonly successful choice.

### 46.6 Tradeoff: Maintaining Multiple API Versions Simultaneously Has a Real, Ongoing Cost

Supporting `/v1` and `/v2` simultaneously means every subsequent business-logic change potentially needs to be applied (or deliberately, correctly *not* applied) to both versions' code paths — a real, ongoing maintenance burden that grows with every additional supported version. The practical discipline: define an explicit **deprecation policy** (a stated timeline after which an old version will be removed, communicated to clients in advance, sometimes via a `Deprecation` response header) rather than supporting every version indefinitely by default — companion §46 (of the Software Systems Handbook)'s general API-versioning discipline applies directly here, now with this handbook's Python-specific implementation mechanism.

### 46.7 Implementation

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

class DomainError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code

class SeatAlreadyBookedError(DomainError):
    def __init__(self, seat_id: str):
        super().__init__("seat_conflict", f"Seat {seat_id} already booked", status_code=409)

class BookingNotFoundError(DomainError):
    def __init__(self, booking_id: str):
        super().__init__("not_found", f"Booking {booking_id} not found", status_code=404)


@app.exception_handler(DomainError)          # §46.2: ONE handler for the
async def handle_domain_error(request: Request, exc: DomainError):   # ENTIRE
    return JSONResponse(                                              # base
        status_code=exc.status_code,                                  # class --
        content={"error": {"code": exc.code, "message": exc.message}},  # every
    )                                                                    # subclass
                                                                          # is
                                                                          # covered
                                                                          # automatically

# Versioned routers (§46.5) -- URL-path based:
from fastapi import APIRouter

v1_router = APIRouter(prefix="/v1")
v2_router = APIRouter(prefix="/v2")

@v1_router.get("/bookings/{booking_id}")
def get_booking_v1(booking_id: str):
    return {"booking_id": booking_id, "status": "CONFIRMED"}   # v1 shape

@v2_router.get("/bookings/{booking_id}")
def get_booking_v2(booking_id: str):
    return {"id": booking_id, "state": "CONFIRMED", "version": 2}  # v2's
                                                                       # DIFFERENT
                                                                       # field
                                                                       # names --
                                                                       # a genuine
                                                                       # breaking
                                                                       # change,
                                                                       # isolated
                                                                       # to its
                                                                       # own path

app.include_router(v1_router)
app.include_router(v2_router)
```

`handle_domain_error` is registered once, against the `DomainError` base class — every specific subclass (`SeatAlreadyBookedError`, `BookingNotFoundError`, and any future domain exception added later) is automatically caught and formatted identically, with zero additional registration needed per new exception type (§46.2-46.3). The two versioned routers demonstrate §46.5's URL-path approach concretely: `get_booking_v1` and `get_booking_v2` can genuinely diverge in response shape (different field names) while both remain live simultaneously, each serving the specific clients still depending on that exact contract.

### 46.8 Production Considerations

A centralized exception handler (§46.2) must still include a catch-all handler for genuinely *unexpected* exceptions (anything not a recognized `DomainError` subclass) that returns a generic 500 response without leaking internal exception details (companion §7.7's exact warning) — an unhandled exception reaching FastAPI's own default handling can, depending on configuration, expose a stack trace to the client, a real information-disclosure risk in production that must be explicitly prevented via a broad, final `Exception` handler alongside the more specific `DomainError` one. API version deprecation (§46.6) should be tracked via real, monitored usage metrics (companion §65) — knowing that `/v1` still receives meaningful traffic from a specific known client is very different operationally from `/v1` receiving zero traffic for months, and this distinction should drive the actual deprecation timeline decision, not an arbitrary, traffic-blind calendar date.

### 46.9 Debugging

**Symptoms:** Different endpoints across the same API return inconsistently-shaped error responses, complicating frontend error handling; a client integration breaks immediately after a backend deployment that "didn't change that endpoint." **Investigation:** For inconsistent error shapes, audit whether error responses are constructed ad hoc per-route or via a centralized exception handler (§46.2) — inconsistency is the direct symptom of the latter's absence. For the breaking-client case, check whether the deployed change touched a *shared* response model or shared logic that an unrelated-seeming endpoint's clients also happened to depend on. **Root cause:** Missing centralized error handling, producing genuine per-route inconsistency; or an underestimated blast radius of a change to shared code affecting more of the API's actual contract than the change's author realized. **Fix:** Migrate ad hoc, per-route error handling to a centralized `@app.exception_handler` registered against a shared domain-exception base class; for contract changes, adopt explicit versioning (§46.5) for any change that could plausibly break an existing client, rather than modifying a live, already-depended-upon response shape in place.

### 46.10 Interview Thinking

"How would you introduce a breaking change to a public API without disrupting existing clients?" is testing whether explicit versioning (§46.5) with a defined deprecation policy (§46.6) is your default answer — a strong answer also raises the ongoing maintenance-cost tradeoff of supporting multiple versions simultaneously unprompted, since a candidate who only sees versioning as a free solution has missed half of the actual engineering tradeoff being evaluated.

### 46.11 Mini Lab

Implement §46.7's `DomainError` hierarchy and centralized handler, plus at least one additional domain exception subclass you define yourself. Confirm every subclass, including your new one, is automatically formatted identically by the single registered handler with no additional registration code. Then implement the two versioned routers and confirm both `/v1/bookings/{id}` and `/v2/bookings/{id}` are simultaneously reachable and correctly return their own distinct response shapes.

---
