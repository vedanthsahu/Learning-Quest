## §55. Circuit Breakers, Bulkheads, and Graceful Degradation

### 1. The Vocabulary

- **Circuit breaker** — after enough consecutive failures calling a dependency, "open the
  circuit" and stop calling it for a while, failing fast instead of continuing to try (and
  periodically test if it's recovered before fully closing again).
- **Bulkhead** — isolating resources (thread pools, connection pools) per-dependency, so one
  slow/failing dependency can't exhaust resources needed for calls to a completely different,
  healthy dependency.
- **Graceful degradation** — when a non-critical dependency fails, serve a reduced but still-
  functional experience (e.g. show a product page without personalized recommendations) instead
  of failing the entire request.
- **Load shedding** — deliberately rejecting some requests under extreme load to keep the system
  responsive for the requests it does accept, rather than degrading into unresponsiveness for
  everyone.

### 2. Where It Sits, and Why Teams Use It

These patterns exist specifically to prevent one failing piece of a system from cascading into a
much larger outage — the difference between "one dependency is down" and "the whole system is
down because of one dependency."

### 3. What Actually Breaks

- **No circuit breaker, so every request keeps trying a dependency that's clearly down** — each
  failed attempt still costs a full timeout's worth of waiting, compounding latency and resource
  usage across every request, instead of failing fast once the pattern is clear.
- **No bulkhead, so one slow dependency exhausts a shared resource pool** — if calls to a slow
  third-party API and calls to the primary database share the same thread/connection pool, the
  slow API can starve the pool and take down completely unrelated functionality that never even
  touched that API.
- **Treating every dependency failure as equally critical** — failing an entire page load because
  a non-essential recommendations service is down, when a functional page without
  recommendations would have been a perfectly reasonable degraded experience.
- **No load shedding under extreme load** — instead of a controlled subset of requests getting a
  fast, clear rejection, the whole system slows to a crawl and eventually fails for everyone.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A circuit breaker fails fast once a dependency is clearly down, instead of every request
  paying the full timeout cost trying anyway."
- "I isolate resource pools per dependency (bulkheads) so one slow dependency can't starve
  resources needed for unrelated, healthy calls."
- "I distinguish essential from non-essential dependencies, and design non-essential failures to
  degrade gracefully rather than fail the whole request."

### 5. Interview-Ready Answer

> "These are all about containing failure instead of letting it cascade. A circuit breaker stops
> calling a dependency that's clearly failing, so requests fail fast instead of each paying a full
> timeout. Bulkheads isolate resource pools per dependency, so a slow, unrelated dependency can't
> starve resources needed elsewhere. And for anything non-essential, I design for graceful
> degradation — a working page without recommendations beats a failed page because
> recommendations were briefly down."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §67 (Retries, Timeouts & Circuit Breakers)
chapter; companion Software Systems Handbook's §42 (Microservices Mechanics: mesh, gateways,
bulkheads, circuit breakers) chapter (bulkheads, circuit breakers as part of service-mesh
patterns).

---
