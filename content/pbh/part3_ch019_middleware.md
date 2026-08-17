## 19. Middleware

### 19.1 The Problem: Cross-Cutting Behavior That Every Request Needs, Regardless of Which Route Handles It

§2.1 introduced decorators as a way to apply cross-cutting behavior across many *functions*. A related but distinct problem exists at the *request* level: some behavior — logging every request's timing, attaching a CORS header, rejecting requests missing a required header — needs to apply to literally every request hitting the application, before routing even decides which specific handler runs, regardless of which route ends up handling it. Wrapping every individual route handler in a decorator for this would work but require remembering to apply it consistently to every route, forever, including every new one added later.

### 19.2 Python Mechanism: Middleware Wraps the Entire ASGI Application, Not Individual Routes

**Middleware** sits between the ASGI server (§16.6) and the application's routing layer, seeing *every* request before routing occurs and *every* response before it's sent back — structurally, it's a function that wraps the entire application the same way a decorator (§2.2-2.4) wraps a single function, but operating one layer higher, around the whole request-handling pipeline rather than one handler. Multiple middleware layers compose like nested function calls: the first-registered middleware is the outermost layer, seeing the request first and the response last.

### 19.3 Decision Framework: Middleware vs. a Dependency (Preview of §20)

Middleware is the right tool for behavior that applies uniformly to *all* requests regardless of route (CORS headers, request timing/logging, a global request-ID injection) and that doesn't need access to route-specific information (path parameters, the specific Pydantic model a route expects). A **dependency** (§20) is the right tool when the cross-cutting behavior needs to be selectively applied to specific routes, or needs access to route-level context — authentication is the canonical example: it's usually implemented as a dependency, not middleware, specifically because different routes may need different permission checks, which a single uniform middleware layer can't naturally express per-route.

### 19.4 Tradeoff: Middleware Order Determines What Each Layer Actually Sees

Because middleware layers nest (§19.2), registration order directly determines execution order — a CORS middleware registered *after* an authentication-checking middleware means every request (including ones that would be rejected by CORS policy) still executes the authentication check first, potentially wasted work or, worse, a subtly different security posture than intended. There is no universally "correct" order for every middleware stack, but the order must be a deliberate decision, reasoned through explicitly, not an accident of whatever sequence felt natural to write.

### 19.5 Python Mechanism: FastAPI/Starlette Middleware as an Async Function

```python
import time
import uuid
from fastapi import FastAPI, Request

app = FastAPI()

@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id     # attach to request.state so
                                                 # route handlers/dependencies
                                                 # can read it later (§19.6)
    start = time.perf_counter()

    response = await call_next(request)         # THIS is where control passes
                                                  # to the next layer inward --
                                                  # everything after this line
                                                  # runs on the way BACK OUT
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.1f}"
    return response


@app.get("/bookings/{booking_id}")
async def get_booking(booking_id: int, request: Request):
    print(f"[{request.state.request_id}] handling booking {booking_id}")
    return {"booking_id": booking_id}
```

`call_next(request)` is the pivot point: everything written before it runs on the way *in* (request phase), and everything after it runs on the way *out* (response phase) — this single function call is what makes middleware's nested, wrapping structure concrete rather than abstract. `request.state.request_id` demonstrates §19.3's boundary: the middleware generates and attaches an identifier available to every downstream handler, but the actual business logic (what to do with `booking_id`) remains entirely the route handler's responsibility, not the middleware's.

### 19.6 Production Considerations

A request-ID-attaching middleware like §19.5's is a genuine production necessity, not a nicety — it's the specific mechanism that lets every log line for one request (across middleware, handler, and any downstream service calls that propagate the ID) be correlated together during an incident investigation, directly the foundation companion §65's distributed tracing chapter builds on. Middleware that does meaningful work (not just header manipulation) adds latency to *every single request*, including ones that don't need whatever that middleware provides — an expensive middleware (one making a network call, for instance) should be scrutinized far more critically than an equivalently-expensive operation inside one specific route handler, precisely because its cost is paid by the entire application, not just callers of one endpoint.

### 19.7 Debugging

**Symptoms:** A CORS-related browser error occurs despite CORS middleware apparently being configured; a request ID or trace header is missing from some responses but present on others. **Investigation:** Check middleware registration order (§19.4) for the CORS case — a middleware raising an early error or short-circuiting the response (an authentication rejection, for instance) registered *before* the CORS middleware can prevent CORS headers from ever being attached to that particular (rejected) response, which browsers then report confusingly as a CORS failure rather than the actual underlying auth rejection. For missing request IDs, check whether every response path (including error responses generated by exception handlers, companion §7.4) actually passes back through the middleware's response phase, or whether some error-handling path bypasses it. **Root cause:** Middleware ordering causing an early response to skip a later-registered middleware's response-phase logic entirely. **Fix:** Reorder middleware so cross-cutting concerns like CORS are registered outermost (first), ensuring they apply even to responses generated or short-circuited by inner layers.

### 19.8 Interview Thinking

"Where would you add request logging and a correlation ID to a FastAPI application?" tests whether middleware (§19.2-19.3) is your default answer rather than adding logging calls to every individual route handler — a stronger answer distinguishes this from authentication, correctly noting authentication more often belongs in a per-route dependency (§20) rather than blanket middleware, since different routes may need different permission checks.

### 19.9 Mini Lab

Write two middleware functions for a small FastAPI app: one that logs "request started" before `call_next` and "request finished" after it (with the elapsed time), and a second, separately-registered CORS-like middleware that adds a custom header to every response. Register them in one order, observe (via print statements) the actual execution order across both middlewares for a single request, then swap the registration order and confirm the execution order changes correspondingly — directly confirming §19.4's nesting behavior.

---
