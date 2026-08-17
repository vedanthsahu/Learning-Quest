## 26. Async Sessions & Connection Pools

### 26.1 The Problem: §24.4's Connection Cost, Now at Real Concurrency Scale

§24.4 established that opening a database connection is expensive and should be reused rather than recreated per request — this chapter develops exactly how that reuse is safely managed under real, concurrent load, where potentially hundreds of requests are in flight simultaneously (§12's async model, or multiple worker processes, §16.8) all needing database access, but a database server can only sensibly handle a bounded number of simultaneous connections before its own resources (memory, per-connection overhead) are exhausted.

### 26.2 Python Mechanism: A Connection Pool Maintains a Bounded Set of Ready, Reusable Connections

A **connection pool** opens a fixed (or bounded, elastically-sized-within-limits) set of connections once, at application startup (§17.2's lifespan mechanism, directly), and hands them out to requests as needed, returning each connection to the pool when the request is done rather than closing it — avoiding both §24.4's per-request connection-opening cost and, critically, bounding the *total* number of simultaneous connections the database must support, regardless of how many concurrent requests the application itself is handling.

### 26.3 Decision Framework: Pool Size Is a Genuine Capacity-Planning Decision, Not a Default to Leave Untouched

A pool sized too small becomes a bottleneck under load — requests queue waiting for a free connection even though the application itself could otherwise handle more concurrency, directly the same backpressure/capacity mismatch companion §15.6 developed generally. A pool sized too large risks overwhelming the database server itself (each connection carries real server-side memory and process overhead) or exceeding a managed database service's own connection limit — the correct size depends on the database server's actual capacity and the application's realistic concurrent-query volume (companion §56's queueing-theory-based capacity planning applies directly), not a framework's arbitrary default.

### 26.4 Engineering Constraint: An Async Application Needs an Async-Native Database Driver to Avoid §11.2's Trap

§11.2 established that a synchronous, blocking call inside `async def` code blocks the *entire* event loop. A synchronous database driver's query call (`psycopg2`'s default blocking behavior) is exactly such a call — issuing a query and waiting for the database's response blocks synchronously, meaning an async FastAPI application using `psycopg2` directly inside route handlers either needs every database call wrapped in `run_in_executor` (§11.5, real but avoidable overhead) or, better, should use a genuinely async-native driver/ORM interface (`psycopg` in async mode, or SQLAlchemy's async session support) that `await`s the database round-trip natively, yielding to the event loop during the wait exactly like any other async I/O operation.

### 26.5 Tradeoff: Async Database Access Adds Real Complexity for a Real Concurrency Benefit

Async database sessions require the entire call chain touching them to also be async (an async session can't be safely used from synchronous code without its own bridging concerns) — a real "async all the way down" discipline cost, mirroring companion §12.5's ecosystem-fragmentation tradeoff generally. This cost is worth paying specifically when the application's actual expected concurrent-request volume is high enough that §26.4's blocking-driver cost would meaningfully degrade overall throughput — for a lower-concurrency backend, a synchronous driver used correctly (via `run_in_executor` where needed, or a purely synchronous WSGI-style deployment) remains a perfectly legitimate, simpler choice.

### 26.6 Implementation

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from typing import Annotated

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/seatdb",
    pool_size=10,             # steady-state pool size (§26.3)
    max_overflow=5,            # additional connections allowed under a
                                # temporary burst, beyond pool_size
    pool_timeout=30,           # how long a request waits for a free
                                # connection before failing (§26.3's
                                # backpressure signal, made concrete)
)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield                       # engine/pool created above at IMPORT time in
                                  # this simplified example; real code often
    await engine.dispose()        # constructs it here instead (§17.3)

app = FastAPI(lifespan=lifespan)

async def get_session():
    async with async_session_factory() as session:   # one session PER
        yield session                                  # REQUEST (§20.4's
                                                          # yield-dependency
                                                          # pattern, applied
                                                          # to the database
                                                          # layer specifically)

@app.get("/bookings/{booking_id}")
async def get_booking(
    booking_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
):
    result = await session.get(Booking, booking_id)   # AWAITED -- yields to
    return result                                        # the event loop
                                                            # during the DB
                                                            # round-trip (§26.4)
```

`pool_size=10, max_overflow=5` bounds the engine to at most 15 simultaneous connections under burst load, 10 in steady state (§26.3) — a deliberate, explicit capacity decision rather than a framework default. `get_session`'s `yield`-based dependency (directly §20.4's pattern) provides exactly one `AsyncSession` per request, checked out from the pool and returned when the request completes, regardless of success or failure. `await session.get(Booking, booking_id)` is a genuine `await` — the event loop is free to run other coroutines during this specific database round-trip, avoiding §26.4's blocking-driver trap entirely.

### 26.7 Production Considerations

`pool_timeout` (§26.6) is the specific, measurable signal of a pool that's undersized for actual load — requests failing with a pool-timeout error under real traffic is a direct, actionable metric (distinct from a vague "the database feels slow" report) that should be monitored explicitly (companion §65) as its own alert, since it precisely distinguishes "the pool is exhausted" (a capacity-sizing problem, §26.3) from "individual queries are slow" (a query-optimization problem, companion §30) — two very different fixes for two genuinely different root causes that look similar from a user's perspective. A connection pool sized for one application instance must be considered *per instance* when running multiple worker processes (§16.8) or multiple deployed replicas — ten instances each with a pool of 10 means the database must actually support up to 100 simultaneous connections, a multiplication easy to overlook when reasoning about "the" pool size as if only one existed.

### 26.8 Debugging

**Symptoms:** Requests occasionally fail with a connection-pool-timeout error specifically under peak traffic, recovering once traffic subsides; an async application's overall throughput is worse than expected despite using an async database driver. **Investigation:** For pool timeouts, check the configured pool size against actual peak concurrent-request volume and the number of running application instances/workers (§26.7's multiplication). For unexpectedly poor async throughput, verify the actual driver/session in use is genuinely async-native (`asyncpg`-backed, not `psycopg2` called synchronously inside `async def` without `run_in_executor`, §26.4). **Root cause:** An undersized pool relative to real, multi-instance-aware concurrent demand, or a synchronous driver silently blocking the event loop despite the application otherwise being written in async style. **Fix:** Size the pool against measured peak concurrency across all instances combined (companion §56); replace a synchronous driver call with a genuine async-native equivalent, or wrap it in `run_in_executor` if no async-native option exists yet.

### 26.9 Interview Thinking

"How would you size a database connection pool for a service expecting 500 requests per second?" is testing whether Little's Law-style capacity reasoning (companion §56.2) — pool size should reflect concurrent in-flight requests times average query duration, not raw requests-per-second directly — is part of your default approach, rather than picking an arbitrary round number; a strong answer also raises §26.7's per-instance multiplication as a factor easy to miss in a multi-worker or multi-replica deployment.

### 26.10 Mini Lab

Configure an async SQLAlchemy engine with a deliberately small pool (`pool_size=2, max_overflow=0, pool_timeout=2`) against a local or in-memory-equivalent database. Fire five concurrent simulated requests each holding a session open for a noticeable duration (an `asyncio.sleep` inside the session's usage), and observe at least one request failing with a pool-timeout error once the pool is exhausted — directly reproducing §26.7's diagnostic signature. Then increase the pool size and re-run, confirming all five requests now succeed.

---
