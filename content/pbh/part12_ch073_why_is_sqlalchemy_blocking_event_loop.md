## 73. Why Is SQLAlchemy Blocking the Event Loop?

### 73.1 Symptoms

An application built on `async def` route handlers and an ostensibly async SQLAlchemy setup nonetheless shows the exact signature of event-loop blocking (companion §12.2, §55.2) — a single slow database-touching request stalls every other concurrent request, not just its own; overall throughput under concurrent load is far below what genuine async database access should allow.

### 73.2 Possible Causes

The synchronous `psycopg2` driver is being used underneath SQLAlchemy's `AsyncSession` instead of an actual async-native driver (companion §26.4's `asyncpg`/`psycopg` async-mode distinction) — a configuration mistake that silently "works" (queries return correct results) while providing none of async's actual concurrency benefit, since every query still blocks the thread it runs on; a synchronous SQLAlchemy engine (created with the ordinary, non-async `create_engine`) being called directly from within an `async def` route handler without `run_in_executor` (companion §11.5), often the direct result of following older, sync-only SQLAlchemy tutorials or copy-pasted code inside a newer async application; lazy-loading a relationship attribute (companion §29.3's N+1 mechanism) that triggers an implicit, additional synchronous query outside of the awaited, async-aware code path; or a synchronous, blocking call to an unrelated resource (file I/O, a synchronous caching library, companion §12.2's general pattern) happening to sit adjacent to otherwise-correct async database code, misleadingly attributed to "SQLAlchemy" simply because it's in the same function.

### 73.3 Metrics

CPU utilization during a "slow" database-touching request (companion §55.5) — event-loop blocking during a query characteristically shows a single core briefly at high utilization for a duration matching the query's actual execution time, rather than the low-CPU "waiting" pattern genuine async I/O should show; comparing measured concurrent request throughput against a baseline that isolates a single request's actual database latency reveals the gap directly (genuine async should allow near-linear scaling with concurrency up to the connection pool's limit; blocked-event-loop async caps out far below this).

### 73.4 Logs

`asyncio` debug-mode warnings (companion §55.2) specifically flagging long-running callbacks, which will implicate the exact blocking call; application startup logs or configuration inspection revealing which driver string (`postgresql://` versus `postgresql+asyncpg://`, companion §26.4) the engine was actually configured with — this single string is often the entire root cause, hiding in plain sight in a configuration file.

### 73.5 Investigation

Confirm the actual driver in use by inspecting the database URL's driver prefix directly (companion §26.4) — this is the single fastest, cheapest check and resolves the most common cause immediately. If the driver is genuinely async-native, audit every relationship access in the request's code path for an un-awaited, implicitly-triggered lazy load (companion §29.3), since SQLAlchemy's lazy loading, unlike an explicit query, doesn't visually announce itself as a synchronous database round-trip at the point it actually occurs in the code.

### 73.6 Root Cause

In practice, this specific symptom's dominant root cause, overwhelmingly, is a synchronous driver configured underneath an ostensibly async SQLAlchemy setup (companion §26.4) — because SQLAlchemy's `AsyncSession` API surface *looks* identical regardless of the underlying driver, this misconfiguration produces working, correct-looking code that silently blocks the event loop on every single query, a mismatch between API shape and actual runtime behavior that makes this an unusually easy mistake to introduce and an unusually hard one to notice through code review alone (companion §12.2's general "looks async but isn't" hazard, here in its single most common concrete instance).

### 73.7 Fix

Verify and, if necessary, correct the database URL to use a genuine async driver (companion §26.4's `postgresql+asyncpg://` or equivalent) — this single change, with no other code modification, resolves the dominant case. For an implicit lazy-load, either eagerly load the relationship upfront using `selectinload`/`joinedload` (companion §29.6) or explicitly await a dedicated async-aware load call, never allowing an un-awaited, implicit synchronous query to occur inside async route-handler code.

### 73.8 Tradeoffs

Migrating from a synchronous driver to an async-native one is usually close to a pure win for I/O-bound workloads with no meaningful downside beyond a one-time migration and testing effort (companion §26.4's driver-swap guidance); eagerly loading relationships to avoid implicit lazy-loads trades some upfront query cost and result-set size (companion §29.7) against never risking an accidental synchronous stall, generally the correct tradeoff for any relationship accessed inside an async request path.

### 73.9 Prevention

Establish a single, explicitly-reviewed database configuration convention (async driver only, verified in code review or, better, enforced via a startup assertion checking the URL's driver prefix) rather than trusting that no one will accidentally copy a synchronous connection string from an older reference; enable `asyncio` debug mode (companion §55.2) in development and staging specifically to surface this exact class of silent blocking before it reaches production; default relationship loading strategy to explicit, eager loading (companion §29.6) in async codebases specifically because lazy loading's implicit-query behavior is categorically more dangerous in an async context than in a synchronous one.

### 73.10 Engineering Intuition

> **Why is "the code looks correctly async, uses `AsyncSession`, and has `await` everywhere it should" not actually sufficient proof that it's truly non-blocking?** Because `AsyncSession`'s API surface is identical regardless of the underlying driver — `await session.execute(...)` compiles and runs correctly whether the actual database round-trip beneath it is genuinely non-blocking or is silently blocking the thread for its full duration; the only way to know for certain is checking the actual configured driver, not reading the calling code's syntax.

> **Why does lazy-loading feel like a uniquely dangerous pattern specifically in async SQLAlchemy code, more so than in synchronous code?** Because in synchronous code, an implicit extra query is merely inefficient (companion §29.3's ordinary N+1 cost); in async code, that same implicit, un-awaited query can additionally block the entire event loop for its duration, compounding a performance inefficiency into a concurrency-correctness problem affecting every other in-flight request simultaneously.

### 73.11 Decision Tree: Diagnosing SQLAlchemy Event-Loop Blocking

```
What is the actual configured database driver (check the URL
prefix directly, not the calling code)?
  Synchronous driver under AsyncSession -> THIS is very likely the
    entire root cause (§73.6) -- switch to a genuine async driver.
  Genuine async driver already configured -> Continue investigating.
Does the slow request access any ORM relationship attribute
without an explicit eager-load strategy?
  YES -> Check for an implicit, un-awaited lazy load (§29.3) --
    convert to selectinload/joinedload (§29.6).
  NO -> Check for an unrelated synchronous call (file I/O, a sync
    cache client) coincidentally sharing the same function (§12.2).
```

### 73.12 Further Reading

- Companion §12.2 (Blocking Calls in Async Code), §26.4 (Async Database Drivers), §29.3/§29.6 (Lazy Loading and Eager-Load Strategies) — the full mechanism depth behind this chapter's diagnostic framework.

---
