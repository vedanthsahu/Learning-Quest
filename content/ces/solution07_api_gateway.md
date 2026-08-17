## Project 07: API Gateway — Solution Guide

### Business Reasoning

The business need is consolidating inconsistent, duplicated cross-cutting logic (auth, rate limiting, logging) across multiple services into one consistently-applied layer. The core engineering risk is exactly what centralization always risks: the gateway becomes a single point of failure for everything behind it unless deliberately designed not to be.

### Requirements Analysis

The availability requirement deserves the most attention, precisely because it's the requirement most likely to be under-engineered by default — a naive single-instance gateway satisfies every functional requirement perfectly while creating a far worse availability profile than the multiple independent services it replaced. The fault-isolation requirement (one service's trouble shouldn't affect another) is the second load-bearing requirement, ruling out any shared-resource design that couples services together at the gateway layer.

### Architecture

```
Clients -> Load Balancer -> [Gateway instance 1, 2, 3, ...] (redundant, no single point of failure)
Gateway: [Auth middleware] -> [Rate limit middleware] -> [Logging middleware] -> [Router]
Router: config-driven path-prefix -> backend service mapping, one independent circuit breaker per service
```

### Tradeoff Discussion

**Single shared circuit breaker/connection pool vs. per-backend-service isolation.** A single shared pool across all backend services is simpler to configure, but couples every service's resource availability together — one service exhausting the shared pool starves requests to every other service, directly violating the fault-isolation requirement. Per-service isolation (a dedicated circuit breaker and connection pool per backend service) correctly isolates failures, at the cost of more configuration and resource overhead per service.

**Hardcoded routing vs. configuration-driven routing.** Hardcoded routing (an `if/elif` chain mapping paths to services in code) is simple initially but requires a code change and redeploy for every new service — directly conflicting with the extensibility requirement. Configuration-driven routing (a routing table loaded from config, changeable without a code deploy) adds a small amount of upfront design complexity but scales to new services without touching gateway code at all.

### Alternative Designs Considered and Rejected

**A single gateway instance for simplicity.** Rejected — this is the challenge's first named trap made concrete: since every request passes through the gateway, a single instance makes the gateway's own uptime the hard ceiling on the entire system's effective availability, regardless of how reliable the backend services themselves are. **Duplicating full authentication logic in both the gateway and every backend service.** Rejected as the default — centralizing authentication at the gateway is the entire point of building one; re-duplicating it in every service reintroduces the inconsistency problem the gateway was built to solve, without a specific, stated defense-in-depth requirement justifying the duplication.

### Chosen Design

Multiple redundant, horizontally-scaled gateway instances behind a load balancer; a configuration-driven routing table (path prefix → backend service); shared authentication and rate-limiting middleware applied once, centrally, before routing; one independent circuit breaker per backend service to contain failures.

### Implementation Walkthrough

```python
ROUTES = {                                   # config-driven, not hardcoded logic (§ traps)
    "/orders": {"service": "orders-service", "url": "http://orders-svc:8000"},
    "/users": {"service": "users-service", "url": "http://users-svc:8000"},
}
circuit_breakers: dict[str, CircuitBreaker] = {
    name: CircuitBreaker(failure_threshold=5, cooldown_seconds=30) for name in
    {r["service"] for r in ROUTES.values()}
}

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if not is_valid_token(request.headers.get("Authorization")):
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
    return await call_next(request)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    allowed, retry_after = await is_allowed(get_client_id(request), limit=1000, window_seconds=60, redis=redis_client)
    if not allowed:
        return JSONResponse(status_code=429, headers={"Retry-After": str(retry_after)}, content={})
    return await call_next(request)

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def gateway_route(path: str, request: Request):
    prefix = "/" + path.split("/")[0]
    route = ROUTES.get(prefix)
    if route is None:
        raise HTTPException(404, "No matching backend service")

    breaker = circuit_breakers[route["service"]]     # per-service isolation, not shared
    if breaker.is_open():
        raise HTTPException(503, f"{route['service']} is currently unavailable")

    try:
        response = await http_client.request(
            request.method, f"{route['url']}/{path}", timeout=5.0,
            content=await request.body(), headers=dict(request.headers),
        )
        breaker.record_success()
        return Response(content=response.content, status_code=response.status_code)
    except (httpx.TimeoutException, httpx.ConnectError) as exc:
        breaker.record_failure()
        raise HTTPException(502, f"{route['service']} did not respond") from exc
```

`circuit_breakers` is keyed per-service, giving each backend service an independent failure domain — a request to `/orders` failing repeatedly opens only the `orders-service` breaker, leaving `/users` requests entirely unaffected, directly closing the challenge's third named trap. `ROUTES` is a plain data structure rather than branching code, meaning a new service is added by adding one config entry, not by modifying `gateway_route` itself.

### Production Improvements

Add request/response size limits and a global timeout ceiling per backend call, independent of any single service's own configured timeout, as a defense against a misconfigured backend service hanging the gateway's own worker capacity (Python Backend Engineering Handbook §76.6's missing-timeout hazard, applied here at the gateway layer specifically). Add distributed tracing (§65.5) propagating a correlation ID from the gateway into every backend service call, so a slow end-to-end request can be traced across the boundary the gateway introduces.

### Scaling Path

Gateway instances scale horizontally and statelessly (rate-limit and auth state live in Redis, not gateway-instance memory, following the same shared-external-state pattern as Project 02), so adding gateway capacity is a matter of adding instances behind the load balancer with no coordination required between them.

### Interview Discussion

An API gateway question typically tests whether a candidate recognizes the single-point-of-failure risk unprompted (Python Backend Engineering Handbook §96.2's "how would you handle a traffic spike" translation applies directly here) and whether they isolate per-backend-service failure domains rather than sharing resources across services by default.

### Lessons Learned

The core lesson is that centralizing cross-cutting concerns is valuable specifically because it eliminates duplication and inconsistency — but centralizing a *point of failure* along with those concerns is an unforced, avoidable cost, solved entirely by treating the gateway itself as a redundant, horizontally-scaled service like any other, not a special, singular component. This same "don't accidentally centralize failure while centralizing logic" lesson applies directly to Project 09 (Authentication Service), which faces an identical risk.

---
