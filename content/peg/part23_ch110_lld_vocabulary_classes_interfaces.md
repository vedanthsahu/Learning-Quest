## §110. LLD Vocabulary: Classes, Interfaces, and Contracts

### 1. The Vocabulary

- **Interface (contract)** — a promise of behavior ("this thing can `save()` and `find()`")
  separate from any specific implementation, so callers can depend on the promise, not the detail.
- **Cohesion** — how tightly a class's responsibilities belong together; a class that does one
  clear thing has high cohesion.
- **Coupling** — how much one class depends on the internal details of another; low coupling means
  you can change one class without breaking others.
- **SOLID** — five design guidelines (Single Responsibility, Open/Closed, Liskov Substitution,
  Interface Segregation, Dependency Inversion) that all point at the same goal: change should be
  local, not contagious.
- **Composition over inheritance** — preferring "this class *has a* helper object" over "this class
  *is a* subclass," because deep inheritance chains are notoriously brittle to change.

### 2. Where It Sits, and Why Teams Use It

LLD is the level below HLD (§109) — not "which services exist" but "which classes exist inside one
service, and how do they talk to each other." It's what actually gets code-reviewed: the
difference between a `PaymentService` that's easy to extend with a new payment provider and one
that requires editing a giant `if/elif` chain every time.

### 3. What Actually Breaks

- **God classes** — one class that does validation, persistence, notification, and business logic
  all at once; every change risks breaking something unrelated, and every PR touching it gets
  slow, contested reviews.
- **Leaky abstractions** — an interface that claims to hide a database but still forces callers to
  know about SQL-specific error codes; the abstraction isn't actually protecting anyone.
- **Inheritance for code reuse alone** — subclassing just to avoid retyping a method, producing a
  class hierarchy that breaks the moment a subclass needs to behave differently from its parent in
  one specific way (a classic Liskov Substitution violation).
- **No interface at the boundary that actually changes** — hardcoding a specific email provider's
  SDK directly into business logic, so swapping providers later means rewriting the business logic
  instead of writing one new adapter.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I look for classes doing more than one job and split them — a class name with 'and' in its
  description is usually a sign."
- "I put an interface at boundaries I expect to change — external providers, storage, anything
  swappable — not everywhere reflexively."
- "I default to composition; I only reach for inheritance when a true is-a relationship holds and
  the subclass never needs to violate the parent's contract."

### 5. Interview-Ready Answer

> "At the class level I'm mainly optimizing for isolated change — high cohesion inside a class, low
> coupling between classes. I put an interface at any boundary I expect to swap out later, like an
> external provider or a storage layer, so the business logic depends on a contract, not a
> concrete implementation. And I default to composition over inheritance, because deep inheritance
> chains tend to break in ways that are hard to see coming."

### 6. Go Deeper

DSA Engineering Handbook's and Python Backend Handbook's design-pattern and SOLID-principle
coverage for full worked examples; this book's §116-118 for the specific pattern catalog and §119
for Repository/DI, the two patterns most directly built from this vocabulary.

---
