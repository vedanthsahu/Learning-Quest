## 23. OpenAPI Generation & API Contracts

### 23.1 The Problem: Frontend and Backend Teams Need a Shared, Accurate Source of Truth

A frontend team integrating against a backend API needs to know exactly what each endpoint expects and returns — and hand-maintained documentation drifts from the actual code the moment either side changes without remembering to update a separate document. The companion Seat Management backend's own API documentation effort (produced earlier in this project) is a direct, concrete instance of this exact problem — useful, but manually written, and therefore only as accurate as the moment it was last updated.

### 23.2 Python Mechanism: FastAPI Generates OpenAPI Schema From the Same Code That Runs

FastAPI automatically generates a complete **OpenAPI schema** (a standardized, machine-readable API description format) directly from the route definitions, Pydantic models (§21), and type annotations already present in the running application code — every route's path, method, parameters, request body shape, and possible response shapes are derived from the actual, executing source of truth, not a separately maintained document. This is precisely why the documentation cannot silently drift out of sync the way a hand-written document can: the schema regenerates from the code itself every time the application starts.

### 23.3 Decision Framework: `/docs` and `/redoc` Are Generated Views Over the Same Schema, Not Separate Documentation Efforts

FastAPI's built-in interactive documentation (`/docs`, using Swagger UI, and `/redoc`) are both rendered directly from the OpenAPI schema (§23.2) — they are views, not independent documentation that could drift from each other, since both read the identical, code-derived schema. This means investing in *better type hints and Pydantic models* (§21, companion §5) directly and automatically improves the generated documentation's quality, rather than documentation quality being a separate writing effort competing for time against actual feature development.

### 23.4 Python Mechanism: Enriching the Generated Schema Without Writing Separate Docs

FastAPI exposes several mechanisms for adding human-readable context directly into the code that generates the schema: a route's `summary` and `description` parameters (seen throughout the actual Seat Management backend's `admin_dashboard.py`, e.g., its detailed `responses={...}` blocks documenting specific error codes), a Pydantic field's `description` via `Field(description="...")`, and explicit `responses={...}` declarations documenting non-2xx status codes and their shapes. This is the correct place to invest documentation effort — enriching the schema-generating code itself, rather than writing prose documentation in a separate file that requires separate discipline to keep updated (directly this handbook's own instance of "cross-reference and generate, don't hand-duplicate," the same principle governing this handbook's own build pipeline).

### 23.5 Tradeoff: Auto-Generated Contracts Enable Auto-Generated Clients, at the Cost of Schema Discipline

Because the OpenAPI schema is a standardized format, it can be fed into code-generation tools that produce a typed API client for the frontend automatically — eliminating an entire class of manual, error-prone "match the frontend's fetch calls to the backend's actual field names" work. The cost: the schema's accuracy is now load-bearing infrastructure, not just documentation — a route that technically works but has an inaccurate type hint (a field typed as `str` that can actually be `None`) generates a subtly wrong client, silently breaking the contract's usefulness exactly where it mattered most, making disciplined, accurate typing (companion §5.3's public-interface-first guidance) a direct API-contract-integrity concern, not merely a code-quality preference.

### 23.6 Implementation

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="Seat Management API",
    version="1.0.0",
    description="Booking, guest, and location management for office seating.",
)

class BookingResponse(BaseModel):
    booking_id: str = Field(description="Unique identifier for this booking.")
    seat_id: str = Field(description="The seat this booking reserves.")
    status: str = Field(
        description="One of CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED."
    )

@app.post(
    "/bookings",
    response_model=BookingResponse,
    summary="Create a new seat booking",
    description=(
        "Creates a booking for the authenticated user (or, with the "
        "appropriate permission, on behalf of another user), validating "
        "that the requested seat is not already booked for the given date."
    ),
    responses={
        409: {
            "description": "The requested seat is already booked for this date.",
            "content": {
                "application/json": {
                    "example": {"error": {"code": "seat_conflict"}}
                }
            },
        },
    },
)
def create_booking(seat_id: str, booking_date: str) -> BookingResponse:
    ...
```

Every piece of this — the `Field(description=...)` calls, the route's `summary`/`description`, the explicit `responses={409: ...}` block — becomes part of the OpenAPI schema FastAPI generates automatically, immediately visible in `/docs` with zero separate documentation-writing process (§23.3-23.4); a frontend engineer opening `/docs` sees exactly this level of detail, generated from and guaranteed consistent with the actual running code, not a separate document that might be stale.

### 23.7 Production Considerations

The auto-generated `/docs` and full OpenAPI JSON schema (typically at `/openapi.json`) reveal the API's complete shape, including every field name and every documented error code — for a genuinely internal or sensitive API, this endpoint itself may need to be disabled or access-controlled in production (FastAPI supports setting `docs_url=None`, `openapi_url=None`), a deliberate security-versus-developer-convenience tradeoff distinct from, but related to, companion §63's broader API-security discipline. Versioning an API contract (companion §46's API-versioning chapter) benefits directly from OpenAPI's machine-readable nature — a schema diff between two versions can be computed and reviewed for breaking changes automatically, rather than relying entirely on manual review to catch a field that quietly changed type or was removed.

### 23.8 Debugging

**Symptoms:** A frontend integration breaks after a backend deployment with "no API changes," or a generated API client behaves subtly incorrectly for a specific field. **Investigation:** Diff the OpenAPI schema (`/openapi.json`) between the two deployments to find the actual, precise change — since the schema is code-derived (§23.2), any real behavioral change in the API surface will show up here even if it wasn't described as an intentional "API change" by whoever deployed it. **Root cause:** A type hint or Pydantic model change that had a schema-level consequence the author didn't realize was contract-affecting. **Fix:** Treat any OpenAPI schema diff as a reviewable artifact in the deployment process (companion §46), specifically to catch this class of accidental contract change before it reaches consumers.

### 23.9 Interview Thinking

"How do you keep API documentation from going stale?" is testing whether you know FastAPI (and OpenAPI-based frameworks generally) solve this structurally by generating documentation from the same code that runs (§23.2), rather than relying on developer discipline to manually update a separate document — a strong answer connects this directly to why investing in precise type hints (companion §5) has a documentation payoff, not just a type-safety one.

### 23.10 Mini Lab

Take one of the route handlers from an earlier chapter in this Part (e.g., §21.6's `create_booking`-style route) and enrich it with a `summary`, a `description`, `Field(description=...)` on every response model field, and an explicit `responses={...}` entry for at least one non-2xx case. Run the application, open `/docs`, and confirm every piece of added context appears exactly where expected in the generated interactive documentation — directly observing the code-to-documentation pipeline rather than only reading about it.

---
