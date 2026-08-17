## §113. Layered, Clean, and Hexagonal Architecture

### 1. The Vocabulary

- **Layered architecture** — code organized into horizontal layers (presentation, business logic,
  data access), where each layer only talks to the one directly below it.
- **Clean architecture / hexagonal architecture (ports & adapters)** — the same underlying idea
  with a different visual metaphor: business logic sits at the center, knowing nothing about the
  database or the web framework; "ports" (interfaces) define what the core needs, "adapters"
  (concrete implementations) plug into those ports from the outside.
- **Dependency rule** — dependencies point inward, toward business logic, never outward toward
  infrastructure — the core doesn't import the database driver; the database adapter imports the
  core's interfaces.
- **Anemic domain model (anti-pattern)** — business objects that are just data bags (getters and
  setters, no behavior), with all actual logic living in separate "service" classes — a common
  layered-architecture failure mode.

### 2. Where It Sits, and Why Teams Use It

All three names describe roughly the same goal: keep the parts of the code that represent "what
this business actually does" separate from the parts that represent "how we currently store data
or expose an API" — so that switching frameworks, databases, or API protocols doesn't require
rewriting business rules. Teams reach for this explicitly when they've been burned by business
logic that's scattered across controllers, ORM models, and utility files, making it impossible to
answer "where does the actual rule live?"

### 3. What Actually Breaks

- **Business logic leaking into controllers** — a route handler that validates, calculates
  pricing, and saves to the database all inline; every new client (mobile app, CLI, scheduled job)
  needing the same logic has to duplicate it.
- **The core layer importing the framework** — business logic classes that inherit from an ORM base
  class or import a web framework's request object, silently breaking the dependency rule and
  coupling "what the business does" to "how we happen to store it today."
- **Over-applying strict layering to a small CRUD app** — four layers of indirection to save a
  simple record is pure ceremony; this architecture earns its cost once business rules are
  genuinely non-trivial, not by default.
- **An anemic domain model masquerading as "clean"** — moving code into a `core/` folder without
  actually moving behavior there just relocates the mess.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "The core idea across layered, clean, and hexagonal is the same: business logic shouldn't know
  about the database or the web framework, so either can be swapped without rewriting rules."
- "I check the dependency rule specifically — does core logic import anything infrastructure-
  specific? If so, the boundary isn't real yet."
- "I don't reach for this on a simple CRUD service — the ceremony only pays for itself once
  business rules get genuinely complex or need to be reused across multiple entry points."

### 5. Interview-Ready Answer

> "Layered, clean, and hexagonal architecture are all versions of the same rule: keep business
> logic ignorant of infrastructure, so the database or the framework can change without touching
> the rules. I check that by asking whether the core logic ever imports anything infrastructure-
> specific — if it does, the boundary isn't actually enforced. I reserve this for services where
> business rules are genuinely non-trivial or reused across multiple entry points; for a simple
> CRUD service it's usually unnecessary ceremony."

### 6. Go Deeper

companion Software Systems Handbook's §93 (Low-Level Design (LLD) Foundations: SOLID, GRASP, DI,
Repository) chapter for full worked examples; this book's §119 (Repository, Unit of Work,
Dependency Injection) for the concrete patterns that implement this boundary in code.

---
