## §124. Decorators and Context Managers

### 1. The Vocabulary

- **Decorator (`@decorator`)** — a function that wraps another function (or class) to add behavior
  before, after, or around its execution, without changing the wrapped function's own code —
  Python's built-in syntax for the Decorator design pattern (§117).
- **Context manager (`with` statement)** — an object defining `__enter__`/`__exit__` (or a
  generator wrapped in `@contextmanager`) that guarantees setup and cleanup code both run, even if
  an exception occurs in between.
- **`functools.wraps`** — a small decorator-writing helper that preserves the original function's
  name and docstring when wrapping it, which matters for debugging, introspection, and frameworks
  that inspect function metadata.
- **Common built-ins that are actually context managers** — file handles (`open(...)`), database
  sessions, and locks are almost always used via `with` specifically because forgetting cleanup
  (closing a file, releasing a lock, returning a connection to the pool) is a classic resource-leak
  bug.

### 2. Where It Sits, and Why Teams Use It

These two features solve the same underlying problem from different angles: making sure code that
*should* always run (logging, timing, cleanup, error handling) actually does, without repeating it
at every call site. A decorator wraps a function's entire execution — used for logging, timing,
retries, authentication checks, and caching. A context manager wraps a *block* of code, guaranteeing
cleanup runs even on an exception — used for file handles, database sessions, locks, and temporary
state changes.

### 3. What Actually Breaks

- **A decorator that swallows the wrapped function's identity** — without `functools.wraps`, the
  wrapped function's `__name__` and docstring become the decorator's own, breaking introspection,
  some framework behaviors, and making stack traces harder to read.
- **Manual `try/finally` cleanup instead of a context manager** — repeating open/close or
  acquire/release logic at every call site instead of writing one context manager once; every
  repetition is another chance to forget the cleanup on one code path.
- **A context manager whose `__exit__` doesn't handle exceptions correctly** — if `__exit__`
  swallows an exception without deliberately intending to, callers lose visibility into real
  failures happening inside the `with` block.
- **Decorators that hide expensive or side-effecting behavior** — a caching or retry decorator
  applied silently to a function can surprise a caller who doesn't expect the function to, say,
  make three network calls behind the scenes on failure.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I reach for a decorator when I want the same behavior — logging, timing, retries, auth checks —
  applied consistently across many functions without repeating the logic in each one."
- "I use a context manager any time cleanup absolutely must happen even on an exception — file
  handles, locks, database sessions — instead of a manual `try/finally` at every call site."
- "I always use `functools.wraps` when writing a decorator, so the wrapped function keeps its real
  name and docstring."

### 5. Interview-Ready Answer

> "I use decorators for cross-cutting behavior I want applied consistently — logging, timing,
> retry logic, permission checks — without repeating it in every function. Context managers I use
> whenever cleanup has to happen no matter what, even if an exception is raised inside the block —
> closing a file, releasing a lock, returning a connection to a pool. The pattern I actively avoid
> is hand-rolled `try/finally` cleanup repeated at multiple call sites, since it's very easy for one
> of those copies to be missing the cleanup step."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §2 (Functions, Closures & Decorators) chapter and
companion Python Backend Engineering Handbook's §3 (Context Managers, Iterators & Generators)
chapter for full worked examples including async variants; this book's §117 (structural design
patterns) for the underlying Decorator pattern this Python feature implements.

---
