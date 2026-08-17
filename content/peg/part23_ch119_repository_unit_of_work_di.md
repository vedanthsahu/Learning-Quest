## §119. Repository, Unit of Work, and Dependency Injection

### 1. The Vocabulary

- **Repository** — an object that hides data-access details (SQL, ORM calls, HTTP calls to another
  service) behind a collection-like interface (`find`, `save`, `delete`), so business logic
  depends on that interface, not the storage mechanism.
- **Unit of Work** — tracks a set of changes made during one business operation and commits them
  together (or rolls all of them back together) — the pattern behind an ORM session or database
  transaction wrapper.
- **Dependency injection (DI)** — supplying an object's dependencies (a repository, a client, a
  config value) from outside, usually through a constructor or function parameter, rather than the
  object constructing or looking them up itself.
- **Inversion of control (IoC) container** — a framework component (common in FastAPI's `Depends`,
  Spring, .NET's built-in DI) that wires dependencies together automatically based on declared
  types or functions.

### 2. Where It Sits, and Why Teams Use It

These three patterns are usually used together and are the backbone of the layered/hexagonal
architecture described in §113: Repository hides storage, Unit of Work groups related changes into
one atomic commit, and DI is the mechanism that hands a service its repository (real or fake)
without the service constructing it directly. This combination is what makes business logic
testable without a real database — a test can inject a fake, in-memory repository instead of a
real one — and what makes swapping storage technology later a contained change.

### 3. What Actually Breaks

- **A repository that leaks ORM types back to callers** — if `find()` returns a raw ORM model tied
  to a live database session, callers still depend on the ORM indirectly, defeating the whole
  point of hiding storage behind an interface.
- **No real Unit of Work, so partial writes happen** — saving three related records with three
  separate, uncoordinated commits means a failure partway through leaves the database in an
  inconsistent state; grouping them under one transaction (or explicitly compensating) is the fix.
- **Manual dependency construction spreading through the codebase** — every function that needs a
  database connection constructing its own, instead of receiving one, makes swapping
  implementations (or injecting a test double) require touching many call sites instead of one
  wiring point.
- **Over-injecting things that never vary** — wrapping every single value, including ones that will
  never have a second implementation, behind DI adds indirection with no real payoff; DI earns its
  cost at genuine boundaries — storage, external services, time/randomness for tests.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I put a repository in front of storage specifically so business logic can be tested against a
  fake, in-memory version without touching a real database."
- "I group related writes inside one unit of work so a failure partway through rolls everything
  back, instead of leaving partial state committed."
- "I use dependency injection at real boundaries — storage, external clients, anything I'd want to
  swap in tests — not reflexively for every object."

### 5. Interview-Ready Answer

> "I use Repository to keep business logic from depending directly on the ORM or a specific
> database, which makes it possible to unit test that logic against an in-memory fake instead of a
> real database. Unit of Work groups the writes inside one business operation so they commit or
> roll back together, rather than as separate, uncoordinated saves. And I supply both through
> dependency injection — the service receives its repository rather than constructing it — which is
> exactly what makes swapping in a test double, or swapping the real storage technology later, a
> contained change instead of a rewrite."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §29 (Repository Pattern & Unit of Work) chapter
and companion Python Backend Engineering Handbook's §49 (Testing Philosophy & pytest
Fundamentals) chapter for full worked examples (the "Fieldnote" capstone project uses this exact
combination); this book's §113 (layered/hexagonal architecture) for the surrounding architectural
context and §128 (pytest fluency) for how this pattern makes tests fast and DB-free.

---
