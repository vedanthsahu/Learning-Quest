## §130. FastAPI Fluency: Dependency Injection, Middleware, and Lifespan

### 1. The Vocabulary

- **`Depends`** — FastAPI's dependency injection mechanism: a route parameter declared as
  `Depends(get_db)` gets its value from calling `get_db()` (which can itself depend on other
  `Depends`), the concrete implementation of §119's DI pattern for this framework.
- **Middleware** — code that runs around every request (or every request matching some rule)
  before it reaches a route handler and after the response is generated — used for CORS, request
  logging, correlation IDs, and centralized error shaping.
- **Exception handler (`@app.exception_handler`)** — a centralized function that converts a raised
  exception into a consistent HTTP error response shape, instead of every route handling its own
  errors inconsistently.
- **Lifespan (`@asynccontextmanager` lifespan function)** — code that runs once at application
  startup (before the first request) and once at shutdown (after the last) — the place database
  connection pools and external clients get created and cleanly closed.

### 2. Where It Sits, and Why Teams Use It

These four features are what make a FastAPI application's cross-cutting concerns live in one place
instead of scattered across every route. `Depends` is how a route gets a database session, the
current authenticated user, or any other per-request dependency, without constructing it manually
inline. Middleware and exception handlers are how logging, CORS, and error formatting stay
consistent across every endpoint automatically, rather than being re-implemented per route.
Lifespan is specifically what makes "create the connection pool once at startup, close it cleanly
at shutdown" possible — the alternative (opening a connection per request, or never explicitly
closing anything) either wastes resources or leaks them.

### 3. What Actually Breaks

- **A `Depends` function that isn't request-scoped when it should be** — sharing a single database
  session across all requests via a naive dependency setup reintroduces the "session shared across
  concurrent requests" bug from §127.
- **Business logic duplicated because it's not expressed as a dependency** — auth checks or common
  lookups copy-pasted into every route instead of extracted into a `Depends` function reused across
  all of them.
- **No centralized exception handler** — every route handling errors slightly differently means
  API clients get inconsistent error response shapes, making client-side error handling harder
  than it needs to be.
- **Connections created per-request instead of in lifespan** — opening a fresh database connection
  or HTTP client on every single request, instead of once at startup and reused, adds real,
  avoidable latency and can exhaust connection limits under load.
- **Forgetting shutdown cleanup entirely** — no lifespan shutdown logic means connections and
  clients aren't closed gracefully, which can leave the database seeing "zombie" connections after
  a deploy.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use `Depends` for anything a route needs that shouldn't be constructed inline — a DB session,
  the current user, shared validation logic — so it's defined once and reused."
- "I centralize error handling with exception handlers so every endpoint returns errors in the
  same shape, rather than each route inventing its own."
- "I create expensive, long-lived resources like connection pools in the lifespan function, once
  at startup, not per request."

### 5. Interview-Ready Answer

> "In FastAPI I lean on `Depends` heavily — database sessions, the current authenticated user, and
> shared validation all go through dependencies rather than being constructed inline in each route,
> which is the same dependency-injection idea as §119 applied at the framework level. I set up
> connection pools and external clients once in the lifespan function so they're created at startup
> and closed cleanly at shutdown, not reopened per request. And I use a centralized exception
> handler so every endpoint returns errors in a consistent shape instead of each route inventing its
> own."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §20 (Dependency Injection in FastAPI) chapter and
companion Python Backend Engineering Handbook's §17 (Application Lifespan & Configuration)
chapter for full FastAPI project examples; this book's §119 (Repository/Unit of Work/DI) and §123
(async/await) for the two concepts this chapter directly applies.

---
