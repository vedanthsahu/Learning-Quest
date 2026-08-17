## §163. Design Patterns IV: Proxy, Composite, Command, Iterator, State, Chain of Responsibility

### 1. The Vocabulary

- **Proxy** — a stand-in object with the same interface as a real object, controlling access to it
  — common variants: lazy proxy (defers expensive creation until actually needed), remote proxy
  (represents an object living elsewhere over the network), protection proxy (adds an access check
  before delegating).
- **Composite** — treats individual objects and groups of objects through the same interface, so
  client code can work with a single item or a whole tree of items identically — the pattern
  behind things like nested menus or nested comment threads.
- **Command** — encapsulates an action (and its parameters) as an object, so it can be queued,
  logged, undone, or executed later, rather than being a direct function call.
- **Iterator** — provides a standard way to step through a collection's elements without exposing
  its internal structure — in Python, this is largely built into the language itself (`for`,
  generators, `__iter__`).
- **State** — lets an object change its behavior when its internal state changes, by delegating to
  separate state-specific objects rather than a large conditional on a status field.
- **Chain of Responsibility** — passes a request along a chain of handlers, each deciding to
  process it, pass it on, or both — the pattern behind middleware pipelines (auth, logging,
  validation, each handling its concern and passing the request onward).

### 2. Where It Sits, and Why Teams Use It

These six round out the common pattern vocabulary beyond §116-118. The two most likely to come up
in everyday backend work are Command (a queued/executable job is literally this pattern, §129,
§42) and Chain of Responsibility (any middleware stack — auth, logging, CORS, §130 — is this
pattern by another name). State is the clean alternative to a sprawling `if status ==` chain
managing an order or payment lifecycle. Proxy shows up specifically for lazy-loading and access
control. Composite and Iterator come up less often in typical backend code but are worth
recognizing by name when they do (nested resource hierarchies, custom collection types).

### 3. What Actually Breaks

- **A large conditional on a status field instead of State** — an order-lifecycle function with a
  growing `if status == "pending": ... elif status == "shipped": ...` chain is exactly the pattern
  State exists to replace, and it grows more error-prone with every new status added.
- **Not recognizing that a middleware stack already is Chain of Responsibility** — reinventing
  ad-hoc request-processing logic without the vocabulary to describe it as this well-known pattern
  makes the design harder to discuss and reason about with other engineers.
- **A "Command" that isn't actually reified as an object** — queuing "an action" as a loose
  function reference with no consistent structure makes it hard to log, retry, or serialize the
  action consistently — the whole benefit of Command comes from treating the action as real,
  structured data.
- **Overusing Proxy for simple cases** — wrapping every object in a proxy "just in case" adds
  indirection with no real payoff; it earns its cost specifically for lazy loading, remote access,
  or access control, not as a default habit.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I recognize a middleware stack as Chain of Responsibility, and a queued background job as
  Command — these patterns already exist in code I write regularly, even without naming them."
- "I reach for State instead of a growing status-based conditional when an entity's behavior
  genuinely changes based on its lifecycle stage, like an order or payment."
- "I use Proxy specifically for lazy loading, remote access, or access control — not as a general-
  purpose wrapping habit."

### 5. Interview-Ready Answer

> "A few of these I already use without necessarily naming them — a background job queued for later
> execution is Command, and a middleware pipeline handling auth, logging, and validation in
> sequence is Chain of Responsibility. For an entity with real lifecycle-dependent behavior, like an
> order or payment status, I'd reach for State rather than growing a single function's conditional
> logic with every new status. Proxy I use specifically for lazy loading or access control, not as
> a default wrapping habit."

### 6. Go Deeper

companion Software Systems Handbook's §94 (The Classic Design Pattern Catalog (Gang of Four))
chapter for full code examples of all six; this book's §129 (Celery/background workers), §130
(FastAPI middleware), and §156 (saga pattern) for real production code that implements Command,
Chain of Responsibility, and State-adjacent ideas respectively.

---
