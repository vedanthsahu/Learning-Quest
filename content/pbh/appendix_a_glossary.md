## Appendix A: Glossary

**ADR (Architecture Decision Record)** — The five-question format (§78.3) used throughout this handbook's capstone: what's being decided, what options were considered, the real tradeoffs, what was chosen and why, and what would trigger revisiting it.

**AsyncSession** — SQLAlchemy's async-compatible database session object (§26.6); its API surface is identical regardless of the underlying driver, which is precisely why a misconfigured synchronous driver underneath it is so easy to miss (§73.6).

**Backpressure** — A mechanism that slows or rejects new work when a system's capacity to process existing work is exceeded (§15.5), typically implemented via a bounded queue.

**BackgroundTasks** — FastAPI's built-in mechanism for running work after a response is sent, within the same process (§22.5); explicitly not durable across process restarts (§84.3).

**Cache Stampede** — Many concurrent requests simultaneously missing on the same expiring cache key and falling through to the underlying source at once (§47.8, §74.2).

**Circuit Breaker** — A three-state (Closed/Open/Half-Open) mechanism that stops attempting calls to a sustained-failing dependency, failing fast instead of adding load to an already-degraded system (§67.6).

**Cold Start vs. Steady State** — The distinction between a system's behavior immediately after starting (caches empty, connections not yet pooled) and its behavior under sustained, representative load.

**Connection Pool** — A managed, bounded set of reusable database connections (§26.3), sized against actual concurrent demand rather than guessed.

**Correlation ID** — A unique identifier attached to a request and propagated through every downstream operation and log line it triggers (§64.2-64.3), including explicitly across process boundaries like Celery tasks (§90.4).

**Eager Loading** — Explicitly loading a related object alongside its parent in one query (`selectinload`/`joinedload`, §29.6), avoiding the implicit, per-access cost of lazy loading.

**Event Loop** — The single-threaded scheduler underlying Python's `asyncio` that runs coroutines cooperatively (§12.4); blocked by any synchronous call that doesn't yield control back to it (§12.2).

**GIL (Global Interpreter Lock)** — CPython's mechanism ensuring only one thread executes Python bytecode at a time (§9.2), the reason CPU-bound work doesn't parallelize via threads alone.

**Idempotency Key** — A caller-supplied identifier ensuring a retried operation has the same effect as executing it once (§32.6), essential for safely retrying non-idempotent operations like payments or notifications.

**IDOR (Insecure Direct Object Reference)** — An authorization vulnerability where an object's existence or accessibility is revealed to a user who shouldn't have access, typically via a distinguishable error response (§59.7); prevented by returning identical 404s for both "doesn't exist" and "exists but forbidden" (§81.4).

**Lazy Loading** — A relationship attribute triggering an implicit, additional database query only when accessed (§29.3); the root of both the N+1 problem and event-loop-blocking risk in async code (§73.2).

**N+1 Query Problem** — Executing one query to fetch a list, then one additional query per item in that list to fetch related data (§30.5), instead of a single batched query.

**Optimistic Locking** — A concurrency-control strategy that detects (rather than prevents) conflicting concurrent writes via a version number, rejecting a write if the version has changed since it was read (§31.6).

**Outbox Pattern** — Writing an event to an "outbox" table in the same transaction as the primary write, with a separate process publishing outbox rows, solving the dual-write consistency problem (§46.7).

**Readiness vs. Liveness** — Two distinct health-check semantics (§66.2-66.3): readiness governs whether a pod receives new traffic; liveness governs whether a pod is restarted.

**Row-Level Locking (`SELECT ... FOR UPDATE`)** — Explicitly locking specific rows within a transaction to prevent a concurrent transaction from reading or modifying them until the lock is released (§27.7).

**Selectinload / Joinedload** — SQLAlchemy's explicit eager-loading strategies (§29.6), the standard fix for the N+1 problem and for lazy-load-induced event-loop blocking.

**tracemalloc** — Python's standard-library memory-allocation tracer (§57.7), used via snapshot-diffing (comparing object-count growth between two points in time, not absolute counts) to diagnose genuine memory leaks (§75.5).

**tsvector / Full-Text Search** — PostgreSQL's native text-search data type and query mechanism (§88.4), a lighter-weight alternative to a dedicated search engine for moderate search requirements.

**Zero-Downtime Migration (Three-Step NOT NULL Pattern)** — Adding a `NOT NULL` column safely by first adding it as nullable, backfilling existing rows in batches, then adding the constraint (§28.6), avoiding a single migration that locks the table for its full rewrite duration.

---
