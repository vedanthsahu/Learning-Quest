## §123. Async/Await in Practice

### 1. The Vocabulary

- **Coroutine** — a function defined with `async def`, which doesn't run immediately when called —
  calling it produces an awaitable object that must be `await`ed (or scheduled) to actually run.
- **Event loop** — the single-threaded scheduler that runs many coroutines cooperatively,
  switching between them at `await` points while one is waiting on I/O.
- **I/O-bound vs CPU-bound** — async helps I/O-bound work (network calls, database queries, file
  reads) by letting the event loop do something else while waiting; it does nothing for CPU-bound
  work, which still blocks the single event loop thread.
- **Blocking the event loop** — calling a synchronous, blocking function (a sync DB driver, a
  heavy computation, `time.sleep`) from inside an async function freezes the *entire* event loop,
  not just that one request — every other concurrent request stalls too.

### 2. Where It Sits, and Why Teams Use It

Async/await exists to let a single process handle many concurrent I/O-bound requests without
spawning a thread per request. A web server handling a request that mostly waits on a database
query and an external API call can, with async, serve dozens of other requests during that wait
instead of sitting idle. Frameworks like FastAPI are built around this model; a synchronous Flask
app or a `def` route in FastAPI runs on a thread pool instead and doesn't get this benefit
automatically.

### 3. What Actually Breaks

- **A blocking call inside an async function** — using a synchronous database driver, a synchronous
  `requests.get()`, or plain `time.sleep()` inside an `async def` route freezes the entire event
  loop for every concurrent request, not just the one that made the call — one of the single most
  common and most confusing async bugs in production.
- **Mixing sync and async database drivers** — an async route calling a synchronous ORM session is
  a specific, very common version of the above; the fix is an async-native driver (`asyncpg`,
  SQLAlchemy's async engine) or explicitly running the sync call in a thread pool.
- **`await`-ing nothing meaningful, or forgetting `await` entirely** — calling a coroutine without
  `await` silently returns a coroutine object instead of running it — no error, just work that
  never actually happened.
- **Assuming async makes CPU-bound code faster** — image processing, heavy parsing, or dense
  computation inside an `async def` still blocks the loop exactly like a sync call would; that
  work belongs in a background worker (§129) or a process pool, not an `await`.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Async helps I/O-bound work by letting the event loop serve other requests during a wait; it
  doesn't speed up CPU-bound work at all."
- "The bug I watch for specifically is a blocking, synchronous call inside an async function — it
  freezes every concurrent request on that process, not just the one that made the call."
- "If a route needs heavy computation, I move it to a background worker rather than doing it
  inline in an async handler."

### 5. Interview-Ready Answer

> "Async/await buys concurrency for I/O-bound work — a request that's mostly waiting on a database
> or an external API can let the event loop serve other requests during that wait. The bug I'm most
> careful about is calling something synchronous and blocking, like a sync DB driver, inside an
> async route — that freezes the entire event loop for every concurrent request, not just that one,
> and it's a very easy mistake to make without noticing in local testing with low traffic. For
> genuinely CPU-heavy work, I don't reach for async at all — that goes to a background worker."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §12 (AsyncIO Mental Model & the Event Loop)
chapter for the full event-loop mechanics and asyncio internals; this book's §130 (FastAPI
fluency) for how this plays out specifically in route handlers.

---
