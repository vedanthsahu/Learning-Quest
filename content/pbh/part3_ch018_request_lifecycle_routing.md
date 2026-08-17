## 18. Request Lifecycle & Routing

### 18.1 The Problem: Matching a URL to the Right Code, Deterministically

A backend with dozens of endpoints needs an unambiguous way to decide which handler function runs for a given incoming path and method — `GET /bookings/{id}` and `GET /bookings/me` must both resolve correctly even though the second could naively look like it matches the first's pattern with `id="me"`. Getting routing precedence wrong produces a confusing bug where the "wrong" handler silently runs for a request that looks, at the URL level, ambiguous.

### 18.2 Python Mechanism: A Route Table Matched in Registration Order

Starlette (and therefore FastAPI, §16.5) matches incoming requests against routes in the order they were registered, taking the *first* match — this is precisely why route ordering is a real, functional concern, not a cosmetic one: a specific literal path (`/bookings/me`) must be registered *before* a competing parameterized path (`/bookings/{id}`) if both could match the same incoming URL, or the parameterized route will greedily match first and the literal route will never be reached at all.

### 18.3 Decision Framework: Path Parameters vs. Query Parameters — What Each Actually Communicates

A **path parameter** (`/bookings/{booking_id}`) should identify a specific resource — it's part of the URL's hierarchical identity, and two different values genuinely refer to two different things. A **query parameter** (`/bookings?status=CONFIRMED`) should filter, sort, or paginate a collection — it modifies *how* a resource (or collection of resources) is returned, without changing *which* resource is being addressed. Getting this distinction backwards (using a query parameter for something that's really a resource identifier, or a path parameter for an optional filter) produces an API that's technically functional but violates what a caller reasonably expects from the URL structure itself, directly the companion Software Systems Handbook's REST API design discipline (companion §29) made concrete in FastAPI's specific syntax.

### 18.4 Python Mechanism: Type-Annotated Path/Query Parameters Are Validated Before the Handler Runs

FastAPI reads a route handler's type-annotated parameters (`booking_id: int`, `status: str | None = None`) and validates/coerces the incoming raw string values against them *before* the handler function's body ever executes — a request with a non-numeric `booking_id` against an `int`-annotated parameter is rejected with an automatic 422 response, without a single line of the handler's own code running at all. This is the same type-system discipline companion §5 developed generally, now given genuine runtime enforcement power specifically at the API boundary, which is exactly why companion §5.3 called out route parameters as the highest-leverage place to invest typing effort.

### 18.5 Tradeoff: Automatic Validation vs. Custom Validation Logic

FastAPI's automatic type-based validation handles type coercion and basic constraints (numeric ranges via `Query(gt=0)`, string length) declaratively, with zero custom code — but genuinely complex, cross-field, or business-rule validation ("end_date must be after start_date," "this combination of filters is mutually exclusive") requires either Pydantic's own validator mechanisms (§21) or explicit checks inside the handler body. The right default is pushing as much validation as reasonably possible into the declarative, automatic layer (simpler, self-documenting, generates correct OpenAPI docs automatically, §23) and reserving explicit in-handler checks for genuinely cross-field business logic that the declarative layer can't express.

### 18.6 Implementation

```python
from fastapi import FastAPI, HTTPException, Path, Query
from datetime import date

app = FastAPI()

# Literal path registered FIRST -- must win over the parameterized route below
# for the exact string "me" (§18.2's ordering rule).
@app.get("/bookings/me")
def get_my_bookings():
    return {"bookings": ["b-1", "b-2"]}

@app.get("/bookings/{booking_id}")
def get_booking(booking_id: int = Path(gt=0)):     # §18.4: type + constraint
    return {"booking_id": booking_id}                # validated before this
                                                        # line ever runs

@app.get("/bookings")
def list_bookings(
    status: str | None = Query(default=None),         # §18.3: filters the
    start_date: date | None = None,                    # collection, doesn't
    end_date: date | None = None,                       # identify one resource
):
    if start_date and end_date and start_date > end_date:
        # Cross-field business rule -- NOT expressible via simple type
        # annotations alone, so it's an explicit check (§18.5).
        raise HTTPException(400, "start_date must be before end_date")
    return {"status": status, "start_date": start_date, "end_date": end_date}
```

`/bookings/me` registered before `/bookings/{booking_id}` ensures a request for `GET /bookings/me` matches the literal route rather than being captured by the parameterized one with `booking_id="me"` (which would then fail type coercion against the `int` annotation anyway, but only *after* incorrectly matching the wrong route first — registering it in the right order avoids this entirely, §18.2). `Path(gt=0)` and the `date | None` query parameters demonstrate §18.4's automatic validation; the `start_date > end_date` check demonstrates §18.5's explicit-check escape hatch for logic the type system alone can't express.

### 18.7 Production Considerations

A common production mistake mirrors §18.2 exactly but across an entire router rather than two routes: routers mounted with overlapping prefixes, where a broader router registered first silently intercepts requests intended for a more specific one registered later — this is precisely why router registration order in the main application assembly (companion-style to the actual Seat Management backend's `main.py`, which registers a dozen routers) deserves the same deliberate ordering attention as individual routes within one file. FastAPI's automatic validation errors (422 responses) should be monitored as their own metric in production (companion §65) — a sudden spike in 422s often indicates a frontend/backend contract mismatch (a field renamed on one side but not the other) rather than a `500`-class server bug, and the two should be triaged completely differently.

### 18.8 Debugging

**Symptoms:** A specific, literal-looking endpoint (`/bookings/me`) intermittently or consistently returns a 422 validation error or unexpected data instead of its intended response. **Investigation:** Check the route registration order for a competing parameterized route (`/bookings/{booking_id}`) registered *before* the literal one. **Root cause:** The parameterized route matched first (§18.2's first-match-wins rule) and either succeeded incorrectly or failed type validation against the literal path segment being coerced as if it were the parameter. **Fix:** Reorder route registration so more specific, literal routes are registered before more general, parameterized ones that could also match the same URL shape.

### 18.9 Interview Thinking

"Why does `/bookings/me` need to be registered before `/bookings/{booking_id}`?" tests concrete understanding of route-matching order (§18.2) rather than an assumption that a framework "figures out" the most specific match automatically — FastAPI/Starlette do not do this; registration order is the actual, load-bearing mechanism.

### 18.10 Mini Lab

Build a small FastAPI app with both `/items/{item_id}` and `/items/featured` routes, deliberately registering the parameterized route first. Send a request to `/items/featured` and observe what actually happens (likely a 422, since `"featured"` fails `int` type coercion for `item_id`). Then reorder the routes so the literal one is registered first, and confirm `/items/featured` now correctly reaches its own handler.

---
