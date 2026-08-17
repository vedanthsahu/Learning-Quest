## Appendix C: Python Implementation Index

### C.1 Purpose

Every chapter in this handbook contains a concrete, fully-explained implementation. This index lets a reader locate the specific chapter demonstrating a given pattern without needing to already know which Part it belongs to.

### C.2 Core Language Patterns

Mutable default argument trap and fix — §1, §98.2. Custom context manager (`__enter__`/`__exit__`) — §3.2. Generator-based streaming pipeline — §3.4, §42.3. Dataclass with validation — §4.2. Protocol-based structural typing for a repository interface — §4.5, §43.4. Custom exception hierarchy for API error responses — §7.5.

### C.3 Concurrency Patterns

`ThreadPoolExecutor` bridging a blocking call into async via `run_in_executor` — §11.5. Bounded producer-consumer queue with backpressure — §15.5. Async context manager for a timeout (`asyncio.timeout`) — §15.3. Fire-and-forget task with explicit reference retention (avoiding garbage collection of an in-flight task) — §13.6.

### C.4 FastAPI & ASGI Patterns

`yield`-based dependency with guaranteed cleanup — §20.4, §26.6. Composable, layered dependencies (a dependency depending on another dependency) — §20.5. Custom middleware with `call_next` — §19.3. `BackgroundTasks` usage and its durability limits — §22.5, §84.4. Streaming response generator — §22.4. WebSocket handler with a Redis pub/sub backplane for cross-instance delivery — §33.4, §95.4.

### C.5 Database Patterns

Parameterized query construction — §24.2. SQLAlchemy ORM model with a relationship and eager-load hint — §25.4, §82.4, §98.4. Async session factory with connection pool sizing — §26.6. `SELECT ... FOR UPDATE` row locking inside a transaction — §27.7, §101.5. Alembic three-step zero-downtime `NOT NULL` migration — §28.6. Repository pattern with a Protocol-typed interface — §29.4. Keyset (cursor-based) pagination — §31.2.

### C.6 External Systems Patterns

`httpx` async client with explicit timeout and retry — §32.4-32.5. Idempotency-key pattern for a retried external call — §32.6, §86.7. OAuth2/JWT issuance and verification — §34.3-34.4, §80.4. Redis-based distributed lock — §35.5. Redis atomic `INCR`-based rate limiter — §61.4, §94.2. Celery task with retry and backoff — §37.4, §85.4.

### C.7 File & Document Patterns

Streaming multipart upload with a running size check — §41.3, §87.4, §101.3. Magic-byte content-type validation — §41.4, §87.4. Server-generated, path-traversal-safe object key — §63.5, §87.4. `defusedxml`-hardened XML parsing — §38.5. Generator-chain document-ingestion pipeline — §42.4.

### C.8 Architecture Patterns

Layered architecture with a service/domain/repository split — §43.4, §45.3. `SecretStr`-based secrets handling — §44.3. Multi-tier cache-aside implementation with explicit invalidation — §47.6, §83.4. Outbox pattern for dual-write consistency — §46.7, §110.2.

### C.9 Testing Patterns

Protocol-satisfying fake repository (as a mock alternative) — §50.4. Testcontainers-backed integration test with per-test transaction rollback — §51.4. Contract test with Pact — §52.3. `freezegun`-based deterministic time testing — §53.5.

### C.10 Performance Patterns

`cProfile` and `py-spy` usage for CPU profiling — §54.2-54.3. `tracemalloc` snapshot-diffing for memory-leak diagnosis — §57.7, §75.5. `orjson`-based fast serialization — §56.2. `pytest-benchmark` statistical benchmarking — §58.4.

### C.11 Security Patterns

RBAC with object-level authorization and IDOR-safe 404s — §59.7, §81.4. `bcrypt`/`argon2` password hashing — §62.2, §80.4. Redis-based distributed rate limiting with exponential lockout — §61.5.

### C.12 Production Patterns

`contextvars`-based correlation ID propagation, including across a Celery task boundary — §64.3, §90.4. OpenTelemetry counter/gauge/histogram instrumentation — §65.4, §90.4. Three-state circuit breaker — §67.6, §109.4. Deterministic hash-bucketed feature flag — §68.4. Multi-stage Dockerfile — §69.6.

---
