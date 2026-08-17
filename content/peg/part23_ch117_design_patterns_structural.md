## §117. Design Patterns II: Structural (Adapter, Facade, Decorator)

### 1. The Vocabulary

- **Adapter** — wraps an incompatible interface (usually a third-party API or SDK) behind the
  interface your code actually expects, so the rest of the codebase never sees the third party's
  shape directly.
- **Facade** — a simple, unified interface placed in front of a set of more complex lower-level
  classes or clients, so callers get a short, purpose-built method instead of orchestrating five
  calls themselves.
- **Decorator** — adds behavior to an object dynamically by wrapping it in another object with the
  same interface, without modifying the original object's class.
- **Composition (as the mechanism behind all three)** — each of these patterns works by having one
  object hold a reference to another and delegate to it, not by inheriting from it.

### 2. Where It Sits, and Why Teams Use It

Structural patterns are about reshaping interfaces without touching the thing behind them. An
adapter is the single most common one in real backend code: wrap the Stripe SDK, the AWS SDK, or a
legacy internal API behind your own interface, so a provider swap later means writing one new
adapter instead of hunting down every call site. A facade shows up whenever multiple services or
clients need to be called together to do one meaningful thing — like "create an order," which
might mean touching inventory, payments, and notifications. A decorator shows up any time you want
to add logging, caching, or retry behavior around an existing function without rewriting it.

### 3. What Actually Breaks

- **No adapter at all around a third-party SDK** — provider-specific types, exceptions, and
  method names spread through business logic; swapping the provider later means touching every
  call site instead of one adapter file.
- **A facade that becomes a second business-logic layer** — a facade should orchestrate calls, not
  contain its own new rules; if it starts making decisions the underlying services don't know
  about, logic has silently split across two places.
- **Decorators applied in an unpredictable order** — stacking multiple decorators (logging,
  caching, retry) without a clear, intentional order can produce surprising behavior, like caching
  a response before a retry decorator has actually succeeded.
- **Confusing decorator (the pattern) with `@decorator` (the Python language feature)** — Python's
  `@` syntax is one convenient way to *implement* the decorator pattern, but the pattern itself is
  language-agnostic and about wrapping objects, not just functions.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I wrap third-party SDKs behind an adapter so provider swaps later touch one file, not every
  call site."
- "I reach for a facade when a meaningful business operation actually requires coordinating
  several services or clients, and I keep the facade itself free of new business rules."
- "I use decorators to add cross-cutting behavior like logging or caching around existing
  functions without modifying them directly."

### 5. Interview-Ready Answer

> "The structural pattern I use constantly is Adapter — any third-party SDK gets wrapped behind an
> interface my own code defines, so a provider swap is a new adapter, not a search-and-replace
> across the codebase. Facade comes up when a single business operation, like placing an order,
> actually needs to coordinate inventory, payment, and notification services — I give callers one
> clean method instead of making them know the coordination themselves. Decorator I use for
> cross-cutting concerns like logging, caching, or retries layered around a function without
> touching its own logic."

### 6. Go Deeper

companion Software Systems Handbook's §94 (The Classic Design Pattern Catalog (Gang of Four))
chapter and companion Python Backend Engineering Handbook's §32 (HTTP Clients & REST Integration)
chapter for full code examples; this book's §26 (webhooks/retries/circuit breakers) for the
retry-decorator use case in context.

---
