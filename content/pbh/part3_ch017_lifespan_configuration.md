## 17. Application Lifespan & Configuration

### 17.1 The Problem: Some Setup Must Happen Once, Not Per Request

A backend commonly needs to establish a database connection pool (companion §26), warm a cache, or validate that required configuration is present — exactly once, when the application starts, not on every incoming request (which would be both wasteful and, for a connection pool specifically, actively wrong — companion §26 develops why a pool is created once and reused). Symmetrically, on shutdown, resources need deliberate, orderly release (closing connections, flushing pending writes) rather than the process simply vanishing mid-operation.

### 17.2 Python Mechanism: The ASGI Lifespan Protocol

§16.3 mentioned that ASGI's `scope["type"]` includes a `"lifespan"` variant alongside `"http"` and `"websocket"` — this is a dedicated event stream, separate from any individual request, that the server sends exactly twice: once at startup (before accepting any requests) and once at shutdown (after the server has stopped accepting new ones). FastAPI exposes this through its `lifespan` context-manager parameter, a direct, idiomatic use of the context-manager mechanism from companion §3: code before the `yield` runs at startup, code after runs at shutdown, with the same "runs exactly once, cleanup guaranteed" property.

### 17.3 Decision Framework: Lifespan Setup vs. Per-Request Dependency Injection (Preview of §20)

A resource that's expensive to create and safe to share across every request (a connection pool, a loaded ML model, an HTTP client session) belongs in lifespan setup, created once. A resource that's cheap to create or that must be request-scoped (a single database *connection* checked out from the pool for this one request's duration, companion §26) belongs in a per-request dependency instead (§20) — conflating the two is a common mistake: creating a new connection pool on every request (instead of once at lifespan startup) defeats the entire purpose of pooling, while trying to share one single database connection object across every concurrent request (instead of one per request from the pool) risks exactly the shared-mutable-state races §14 warned about.

### 17.4 Python Mechanism: Settings as a Validated, Typed Object — Not Scattered `os.environ` Calls

Reading configuration via scattered `os.environ.get("DATABASE_URL")` calls throughout a codebase has two real problems: a typo'd environment variable name fails silently (returns `None` rather than raising an error), and there's no single place documenting every configuration value the application actually needs. **Pydantic Settings** (`pydantic-settings`) defines configuration as a typed class, loaded once from environment variables (or a `.env` file) and validated at startup — a missing or wrong-typed required setting fails immediately and loudly when the application starts, rather than failing confusingly, much later, the first time that specific configuration value happens to be used.

### 17.5 Tradeoff: Fail Fast at Startup vs. Fail Late at First Use

Validating all configuration eagerly at startup (§17.4's approach) means a misconfiguration is caught in seconds, during deployment, with a clear error naming exactly which setting is wrong — dramatically cheaper to diagnose than the alternative (lazy, per-use `os.environ.get` calls) where a missing configuration value might not be exercised until a specific, rare code path runs in production, hours or days after a bad deployment. This is a direct, concrete instance of the companion Software Systems Handbook's "fail loud and fail fast" reliability principle (companion §19), applied specifically to configuration.

### 17.6 Implementation

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str                    # REQUIRED -- no default means startup
                                           # fails immediately if it's missing
    redis_url: str = "redis://localhost:6379"
    max_pool_size: int = 20

    class Config:
        env_file = ".env"

settings = Settings()                    # validated ONCE, at import time (§17.4)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: runs once, before any request is accepted (§17.2)
    app.state.db_pool = await create_connection_pool(
        settings.database_url, max_size=settings.max_pool_size
    )
    print("Startup complete: connection pool ready")

    yield                                  # application runs here, handling
                                             # requests, until shutdown begins

    # Shutdown: runs once, guaranteed, after the server stops accepting
    # new requests (§17.2's guarantee, from the context-manager pattern, §3.2)
    await app.state.db_pool.close()
    print("Shutdown complete: connection pool closed")


app = FastAPI(lifespan=lifespan)

async def create_connection_pool(url: str, max_size: int):
    ...  # real implementation in companion §26
```

`Settings()` instantiation validates every declared field immediately — if `DATABASE_URL` isn't set in the environment or `.env` file, this line raises a clear validation error naming the missing field, at startup, before the application ever tries to accept a request (§17.5). The `lifespan` async context manager's structure directly mirrors companion §3's context-manager pattern: `app.state.db_pool` is created once before `yield` and guaranteed-closed after it, regardless of how the application's runtime between those two points unfolds.

### 17.7 Production Considerations

Storing shared resources on `app.state` (as in §17.6) rather than as bare module-level globals is a deliberate choice — it keeps the resource's lifetime explicitly tied to *this specific application instance's* lifespan, which matters directly for testing (a test can construct a fresh `FastAPI` app with its own lifespan and its own isolated pool, rather than fighting over shared module-level global state across test runs, companion §51). A related production discipline: lifespan startup code that can fail (a database that's temporarily unreachable when the application starts) should fail the application's startup entirely rather than starting in a degraded, partially-initialized state — a service that reports itself as "up" via a health check (companion §66) while its connection pool silently failed to initialize is a worse failure mode than simply refusing to start at all.

### 17.8 Debugging

**Symptoms:** A configuration value is silently `None` or unexpectedly defaulted in production despite being set correctly in the deployment environment; the application appears to start successfully but the first real request fails with a connection error. **Investigation:** Check whether configuration is read via scattered `os.environ.get(...)` calls (no validation, silent `None` on typos) versus a validated Settings object (§17.4); check whether resource initialization happens in lifespan startup (§17.2) or lazily on first request, which can mask a startup-time failure until traffic actually arrives. **Root cause:** Untyped, unvalidated configuration access, or resource initialization deferred past the point where a failure would be loudly, immediately visible. **Fix:** Migrate configuration reads to a single validated Settings class; move expensive/critical resource initialization into lifespan startup so failures surface at deploy time, not at first-request time.

### 17.9 Interview Thinking

"Where would you initialize a database connection pool in a FastAPI application, and why?" tests whether you know the lifespan mechanism specifically (§17.2-17.3) rather than either creating a pool per-request (defeating pooling entirely) or relying on import-time side effects (which complicate testing and don't provide the same guaranteed-cleanup-on-shutdown property).

### 17.10 Mini Lab

Write a small FastAPI application with a `lifespan` context manager that prints "starting" before `yield` and "stopping" after it, storing a simple in-memory dict on `app.state` as a stand-in for a connection pool. Add a Pydantic `Settings` class with at least one required field (no default) and confirm that omitting it from the environment causes the application to fail immediately at startup with a clear validation error, before ever printing "starting."

---
