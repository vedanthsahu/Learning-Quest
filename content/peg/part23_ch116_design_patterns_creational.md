## §116. Design Patterns I: Creational (Factory, Builder, Singleton Caveats)

### 1. The Vocabulary

- **Factory (factory method / simple factory)** — a function or class whose job is to create
  objects, hiding which concrete class gets instantiated behind a shared interface — the caller
  asks for "a notification sender" without knowing or caring whether it gets email, SMS, or push.
- **Builder** — constructs a complex object step by step, useful when an object has many optional
  parameters and a single giant constructor would be unreadable or error-prone.
- **Singleton** — guarantees exactly one instance of a class exists application-wide, with a single
  global access point to it.
- **Dependency injection (preview)** — often used *instead of* a factory or singleton to supply an
  object's dependencies from outside rather than having the object construct or look them up
  itself (full coverage in §119).

### 2. Where It Sits, and Why Teams Use It

Creational patterns solve one problem: object construction logic getting tangled with the rest of
the code. A factory lets you swap which concrete class gets built — like picking a notification
sender based on user preference — by changing one place. A builder makes object construction
readable when there are many optional pieces (an HTTP client with timeout, retries, headers, base
URL all optional). A singleton is reached for when truly one shared instance makes sense — a
connection pool, a configuration object — but it's also the most commonly misused pattern here.

### 3. What Actually Breaks

- **Singleton overuse for convenience** — using a singleton just to avoid passing an object around
  explicitly turns it into global mutable state, which makes unit testing painful (you can't
  easily swap in a test double) and can hide surprising cross-request state bugs in a shared
  server process.
- **A factory that leaks implementation details** — a "factory" that still requires the caller to
  know provider-specific configuration defeats the purpose; the whole point is that the caller
  only depends on the interface.
- **A builder for an object with only two fields** — added ceremony with no real payoff; builders
  earn their complexity once there are enough optional parameters that a plain constructor call
  becomes hard to read at the call site.
- **Singletons without thread-safety** — a "single" instance built without synchronization can
  silently become multiple instances under concurrent initialization, defeating the pattern's
  entire guarantee.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use a factory when the caller shouldn't need to know which concrete implementation it's
  getting — like picking a notification channel based on config."
- "I reach for a singleton only for something that genuinely should be one shared instance
  app-wide, like a connection pool — not as a shortcut to avoid passing dependencies explicitly."
- "In practice, dependency injection often replaces both factories and singletons in modern
  frameworks, since the framework constructs and shares instances for me."

### 5. Interview-Ready Answer

> "Of the creational patterns, factory and builder come up the most in real code — factory when I
> want callers depending on an interface rather than a concrete class, for example picking a
> payment provider or notification channel from config, and builder when an object has enough
> optional configuration that a single constructor call gets unreadable. I'm cautious with
> singletons specifically — they solve a real problem for genuinely shared state like a connection
> pool, but overused they turn into hard-to-test global state, and in most modern frameworks
> dependency injection handles that sharing more safely anyway."

### 6. Go Deeper

companion Software Systems Handbook's §94 (The Classic Design Pattern Catalog (Gang of Four))
chapter for full code examples in context; this book's §119 (Repository, Unit of Work, DI) for the
pattern that most often replaces singleton-for-convenience in real codebases.

---
