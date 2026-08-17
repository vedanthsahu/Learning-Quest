## §172. Memory Leaks, Connection Leaks, and Resource Leaks

### 1. The Vocabulary

- **Memory leak** — memory that's allocated and never released because something still holds a
  reference to it, even though the application logically no longer needs it — in garbage-collected
  languages like Python, this almost always means an unintentionally retained reference, not
  literally "forgetting to free" memory.
- **Connection leak** — a database connection, HTTP client connection, or file handle that's
  acquired but never properly released back to its pool — the specific resource-leak variant most
  common in backend services.
- **Unbounded cache / unbounded collection growth** — an in-memory cache or list that grows without
  any eviction policy or size limit is a memory leak in slow motion, even though no single line of
  code looks obviously wrong.
- **Resource leak (general term)** — the umbrella category covering memory, connections, file
  handles, threads, or any other finite resource that's acquired but never released.

### 2. Where It Sits, and Why Teams Use It

If someone says "memory leak" in a production incident, the concrete, useful mental model is: some
data structure is quietly growing over the process's lifetime, usually because of a reference that
outlives its intended scope — a global cache with no eviction, an event listener that's registered
but never unregistered, or (in Python specifically, tying back to §127) an ORM session holding
references to every object it's ever loaded, never closed or expired. This is why services with a
memory leak often show a distinctive symptom: memory usage climbs steadily over hours or days and
is only reset by a restart — the exact shape of the "slow memory growth" incident in §107.

### 3. What Actually Breaks

- **Connection pools exhausted from unclosed connections** — a code path that acquires a database
  connection but doesn't release it on every exit path (including exception paths) slowly exhausts
  the pool, eventually blocking every other request that needs a connection.
- **An unbounded in-process cache** — a dictionary used as an ad hoc cache with no size limit or
  TTL grows for as long as the process runs, especially dangerous for high-cardinality keys (per-
  user data, for example) that never naturally get reused and evicted.
- **Event listeners or callbacks registered without ever being unregistered** — a common pattern in
  long-running processes (WebSocket connections, background workers) where each new registration
  adds to a growing list that's never cleaned up when the corresponding entity goes away.
- **Only noticing at restart-driven "resolution"** — a leak that's "fixed" by a routine restart
  masks the underlying bug indefinitely; a service that needs restarting every few days to stay
  healthy has an active, unaddressed leak, not a stable operational pattern.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I check that resource acquisition — connections, file handles — always happens with a
  guaranteed release, usually via a context manager (§124), including on exception paths."
- "I treat any in-process cache or collection with no size limit or eviction policy as a
  potential slow memory leak, even if it looks harmless in testing with small data."
- "Steadily climbing memory that only resets on restart is my signal to look for a leak, not to
  just schedule more frequent restarts."

### 5. Interview-Ready Answer

> "The pattern I watch for is memory or connection usage climbing steadily over the process's
> lifetime rather than stabilizing — that's usually a reference (a cache, a listener registration, a
> connection) that outlives its intended scope. I make sure resource acquisition always pairs with
> guaranteed release, generally through a context manager, on every exit path including exceptions,
> and I treat any unbounded in-process cache as a leak risk even when it looks harmless with small
> test data. If a service only stays healthy because it's restarted regularly, I treat that as an
> active, unaddressed leak, not a normal operating pattern."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §54 (CPU & Memory Profiling) chapter and
companion Python Backend Engineering Handbook's §75 (Why Is Memory Leaking?) chapter for full
leak-detection tooling (`tracemalloc`, memory profilers) and a full incident walkthrough; this
book's §124 (context managers) and §107 (scaling/infra mysteries, including the slow-memory-growth
incident) for the prevention pattern and the real incident shape respectively.

---
