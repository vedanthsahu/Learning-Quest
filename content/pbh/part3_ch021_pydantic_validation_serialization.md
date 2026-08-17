## 21. Pydantic: Validation & Serialization

### 21.1 The Problem: Untrusted Input Must Be Checked Before It Touches Business Logic

Every request body arriving at an API is, from the application's perspective, untrusted data — a client (or an attacker) can send anything: missing fields, wrong types, unexpected extra data, maliciously crafted values. Business logic that assumes its input is already well-formed (accessing `payload["email"]` without first confirming a field named `email`, of the right type, actually exists) will fail unpredictably, or worse, silently misbehave, the moment that assumption is violated — directly the trust-boundary discipline the companion Software Systems Handbook establishes generally (companion §17.3), now given concrete enforcement at the API's actual input boundary.

### 21.2 Python Mechanism: Pydantic Models Declare Shape and Validate Automatically

A **Pydantic model** — a class inheriting from `BaseModel` with type-annotated fields — defines exactly what shape of data is valid, and constructing an instance from raw input (a dict, JSON) automatically validates every field against its declared type, raising a detailed `ValidationError` (naming every specific field that failed and why) if the input doesn't conform. FastAPI uses this directly: a route handler's parameter type-annotated as a Pydantic model causes FastAPI to parse the request body, validate it against that model, and pass a fully validated, correctly-typed object into the handler — precisely the mechanism companion §18.4 described for path/query parameters, now extended to entire request bodies.

### 21.3 Decision Framework: Separate Models for Input, Storage, and Output, Not One Model for Everything

A single model used for the incoming request body, the internal database representation, and the outgoing API response is a common early mistake — the three genuinely have different valid shapes: a `CreateBookingRequest` shouldn't accept a client-supplied `id` or `created_at` (the server assigns those); a `BookingResponse` should never accidentally include an internal-only field (an audit flag, a soft-delete marker) that leaked in only because it happened to exist on the same shared model. Defining distinct models per direction (companion-style to the actual Seat Management backend's `schemas/booking.py` separating `CreateBookingRequest` from `BookingResponse`) costs a small amount of duplication but buys real safety: a field can never leak between input and output simply because it existed on a model that was reused for both roles it shouldn't have been.

### 21.4 Python Mechanism: Field-Level and Model-Level Validators for Rules Beyond Basic Types

Beyond declaring a field's type, Pydantic supports **field validators** (`@field_validator`, checking or transforming one field) and **model validators** (`@model_validator`, checking relationships *between* fields — directly the cross-field business-rule case companion §18.5 flagged as needing explicit code rather than declarative type annotations alone). Placing this validation logic inside the Pydantic model itself (rather than as ad hoc checks scattered inside route handlers) keeps it colocated with the exact data shape it validates, and — critically — means it runs identically and automatically everywhere that model is used as a request body, not just in whichever handler happened to remember to call a separate validation function.

### 21.5 Tradeoff: Strict Validation Rejects More Input, Which Is a Feature, Not a Bug

A stricter Pydantic configuration (rejecting unexpected extra fields, refusing type coercion that a looser configuration would silently allow — a string `"42"` becoming the integer `42`) catches more genuinely malformed or suspicious input at the cost of being less forgiving of minor client-side inconsistencies. The right default for a backend's request-body validation leans strict — an unexpected extra field in a request body is far more often a sign of a client bug or a stale API contract than something safe to silently ignore, and silently accepting it can mask real integration problems that would otherwise surface immediately and clearly as a validation error.

### 21.6 Implementation

```python
from pydantic import BaseModel, field_validator, model_validator
from datetime import date

class CreateBookingRequest(BaseModel):        # INPUT shape only -- no id,
    seat_id: int                               # no created_at (§21.3)
    booking_date: date
    notes: str | None = None

    @field_validator("booking_date")
    @classmethod
    def date_not_in_past(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("booking_date cannot be in the past")
        return value


class ModifyBookingRequest(BaseModel):
    new_seat_id: int | None = None
    new_date: date | None = None

    @model_validator(mode="after")             # cross-field check (§21.4),
    def at_least_one_field_provided(self):      # can't be expressed by a
        if self.new_seat_id is None and self.new_date is None:  # single field's
            raise ValueError(                                    # own type alone
                "At least one of new_seat_id or new_date must be provided"
            )
        return self


class BookingResponse(BaseModel):              # OUTPUT shape only -- server-
    booking_id: str                             # assigned fields the client
    seat_id: int                                # never supplied (§21.3)
    booking_date: date
    status: str
```

`date_not_in_past` runs automatically the moment a `CreateBookingRequest` is constructed from an incoming request — a client sending a past date gets an immediate, clear 422 validation error naming exactly which field and why, never reaching the booking-creation business logic at all (§21.1's trust-boundary enforcement). `at_least_one_field_provided`'s `mode="after"` model validator runs once every individual field has already passed its own type validation, checking the relationship *between* `new_seat_id` and `new_date` that neither field's own type annotation could express alone (§21.4). `BookingResponse` deliberately has no relationship to `CreateBookingRequest` as a class — they're independent models for independent directions (§21.3), even though they happen to share some field names.

### 21.7 Production Considerations

Pydantic validators that raise `ValueError` inside a `field_validator`/`model_validator` are automatically converted into FastAPI's standard 422 error response with a clear message — this means validation logic written this way gets consistent, structured error responses "for free," a real advantage over equivalent manual `if`/`raise HTTPException` checks scattered in route handler bodies, which risk producing inconsistent error response shapes across different endpoints. Response models (like `BookingResponse`) should be declared explicitly as a route's `response_model` even when a handler technically returns more data than that — FastAPI uses the declared response model to filter the actual output, which is a real, load-bearing security/data-hygiene mechanism (accidentally including an internal field on the object returned from a service layer doesn't leak it to the API response, because the response model doesn't declare it), not merely documentation.

### 21.8 Debugging

**Symptoms:** A client reports a confusing validation error for a request that "looks correct"; an API response unexpectedly includes (or is missing) a field. **Investigation:** For validation errors, read the full `ValidationError` detail (FastAPI surfaces this as the 422 response body) — it names the exact field and the exact reason, which is almost always more specific and more useful than it initially appears if the full response body is actually inspected rather than just the status code. For response-shape issues, check whether the route declares an explicit `response_model` and whether that model's fields match what's actually intended to be exposed. **Root cause:** A genuine client-side data issue the validator correctly caught, or a missing/incorrect `response_model` letting internal fields leak through (or hiding a field that should be present). **Fix:** Read and act on the validator's specific error detail for the first case; add or correct the route's `response_model` declaration for the second.

### 21.9 Interview Thinking

"How do you validate that an end_date is after a start_date in a request body?" is testing whether you reach for a Pydantic `model_validator` (§21.4) as the idiomatic, colocated solution, rather than a manual check duplicated inside every route handler that happens to accept both fields — a stronger answer also explains why separate input/output models (§21.3) matter, since it's a related but distinct discipline interviewers often probe in the same discussion.

### 21.10 Mini Lab

Define a `CreateGuestVisitRequest` Pydantic model with `guest_name: str`, `visit_date: date`, `start_time: str`, and `end_time: str`, adding a `model_validator` that rejects the request if `end_time` is not later than `start_time` (simple string comparison is sufficient for this exercise). Construct the model with both a valid and an invalid time pair and confirm the validator behaves correctly in each case, then wire it into a minimal FastAPI route and confirm the invalid case produces a 422 response with a clear message, without any explicit `if` check written inside the route handler itself.

---
