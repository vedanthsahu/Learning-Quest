## 93. Low-Level Design (LLD) Foundations: SOLID, GRASP, and Object Composition

### 93.1 The Problem LLD Solves, and How It Differs From HLD

§92's HLD framework answers "what are the boxes, and why." **Low-Level Design (LLD)** answers the next question down: within any one box, what are the actual classes, interfaces, and objects, and how do they collaborate — a question HLD deliberately leaves unanswered, because answering it too early is exactly the premature-detail mistake this handbook has warned against since §1.5. LLD matters because the same correct HLD can be implemented well or badly at the object level: badly, in a way where a single requirement change ripples through a dozen unrelated classes; well, in a way where change is contained to exactly the class that owns it. The problem LLD solves is, precisely, containing the blast radius (§1.3.3) of a future requirement change to the smallest possible piece of code — the object-level analogue of everything this handbook has already said about service boundaries (§12.5) and bulkheads (§42.4), now applied one layer of abstraction down.

### 93.2 SOLID: Five Named Answers to "What Makes a Class Change-Resistant"

SOLID is not five arbitrary rules — each letter is a named answer to a specific, recurring way object-oriented code becomes fragile under change, discovered independently by the object-oriented design community over decades and later collected under one acronym.

- **S — Single Responsibility Principle**: a class should have exactly one reason to change. The problem this solves: a class handling both "how to validate a user" and "how to send a user a welcome email" now changes whenever *either* concern changes, and a bug fix to email formatting risks breaking validation logic that had nothing to do with it — directly the same "unrelated changes colliding" problem that motivated splitting a monolith at the service level (§12.3), now at the class level.
- **O — Open/Closed Principle**: a class should be open for extension but closed for modification — new behavior should be addable without editing existing, already-tested code. The problem this solves: every time a new payment type is added to a payment processor by editing a growing `if/else` chain inside one method, every existing payment type's tested code path is put at risk of regression by an unrelated addition.
- **L — Liskov Substitution Principle**: a subclass must be usable anywhere its parent class is expected, without breaking the caller's assumptions. The problem this solves: a `Square` class that inherits from `Rectangle` but overrides `setWidth` to also change height violates callers' reasonable assumption that setting a rectangle's width leaves its height alone — a subtle, hard-to-spot correctness bug introduced purely by an inheritance relationship that looked reasonable on paper.
- **I — Interface Segregation Principle**: no client should be forced to depend on methods it doesn't use. The problem this solves: a single, bloated `Worker` interface with `work()` and `eat()` forces a `RobotWorker` implementation to provide a meaningless `eat()` method, coupling unrelated concerns and making the interface harder to implement correctly for every future implementer.
- **D — Dependency Inversion Principle**: high-level modules should depend on abstractions, not on concrete low-level modules. The problem this solves: a high-level `OrderService` that directly instantiates a concrete `MySQLDatabase` class cannot be tested without a real database and cannot be switched to a different database without editing `OrderService` itself — directly the motivation for the Dependency Injection and Repository patterns in §93.4-93.5.

### 93.3 GRASP: Assigning Responsibility, Not Just Structuring Classes

Where SOLID names properties a *finished* class should have, **GRASP (General Responsibility Assignment Software Patterns)** names the reasoning process for deciding, in the first place, *which class should own a given piece of behavior* — a question SOLID assumes has already been answered. Its most load-bearing principles: **Information Expert** (assign a responsibility to the class that already has the information needed to fulfill it, avoiding classes that must reach into other objects' internals to do their job); **Low Coupling / High Cohesion** (minimize how much classes need to know about each other's internals, while maximizing how tightly related a single class's own responsibilities are — directly the class-level restatement of the service-boundary reasoning from §12.5); and **Controller** (assign the responsibility of receiving and coordinating a system-level event to a dedicated coordinating object, not scattering that coordination across whichever class happens to be convenient).

### 93.4 Dependency Injection: The Concrete Mechanism Behind Dependency Inversion

§93.2's Dependency Inversion Principle states a goal — depend on abstractions — without saying how to actually achieve it in running code. **Dependency Injection (DI)** is the concrete mechanism: rather than a class constructing its own dependencies internally (`new MySQLDatabase()` buried inside `OrderService`), those dependencies are constructed externally and *passed in* (injected), typically via a constructor parameter, so `OrderService` only ever refers to an abstract `Database` interface and has no idea, and no need to know, which concrete implementation it was actually handed. This single mechanism is what makes automated testing (substituting a fake, in-memory database for the real one) and future flexibility (swapping databases without touching `OrderService`'s code) both possible at once, and it is the load-bearing mechanism behind nearly every "testable, swappable" architecture claim made anywhere in modern software engineering.

### 93.5 The Repository Pattern and the Service Layer

The **Repository pattern** applies DI's abstraction goal specifically to data access: instead of scattering direct database queries throughout business logic, all access to a given entity's storage is funneled through a single, abstract `Repository` interface (`UserRepository.findById(id)`), with the concrete implementation (a specific SQL query, a specific NoSQL lookup, §7.5's per-dataset choice) hidden behind it. This directly mirrors §4.5's warning against letting callers depend on a database's raw schema — a Repository is the object-level equivalent of the API contract from §4.3, insulating business logic from storage implementation details exactly as an API insulates external callers from internal service details. The **Service Layer** pattern sits one level above repositories, holding the actual business logic and orchestration ("place an order" coordinates the order repository, the inventory repository, and the payment gateway) — keeping business rules out of both the data-access layer (which should only know how to store and retrieve, per Information Expert, §93.3) and the presentation/API layer (which should only know how to translate external requests into service calls).

```
Layering demonstrated (LLD applied to one HLD "box"):

  [ API / Controller layer ]   <- receives requests, calls services
            |
            v
  [ Service Layer ]            <- business logic, orchestration
            |
            v
  [ Repository interfaces ]    <- abstract data access contracts
            |
            v
  [ Concrete DB implementation ]  <- the actual SQL/NoSQL calls

Dependency direction points DOWNWARD through abstractions (DIP,
§93.2) -- the Service Layer depends on a Repository INTERFACE,
never a concrete database class directly.
```

### 93.6 Composition Over Inheritance

A recurring, hard-won lesson in object-oriented design, directly connected to the Liskov Substitution Principle's warning (§93.2): inheritance creates a tight, often fragile coupling between parent and child classes (a change to the parent can silently break every subclass, and deep inheritance hierarchies become difficult to reason about as a whole), while **composition** — building a class's behavior by holding references to other, smaller objects rather than inheriting from a shared parent — keeps that coupling loose and each piece independently replaceable. This preference, "favor composition over inheritance," is the object-level analogue of the microservices-over-monolith reasoning from §12.2-12.4: composition costs a small amount of upfront indirection in exchange for dramatically easier future change — precisely the tradeoff shape from §1.7, now recurring one final time at the smallest possible scale this handbook addresses.

### 93.7 Engineering Intuition

> **How do I know a class violates Single Responsibility?** Ask how many different, unrelated stakeholders or reasons could force this class to change — if the answer is more than one, per §93.2, it's a candidate for splitting.
>
> **How do I know I need the Repository pattern, rather than direct database calls in business logic?** The moment your business logic needs to be unit-tested without a real database, or the moment you can foresee ever needing to change storage technology (§7.5), Repository's abstraction pays for itself.
>
> **What would over-engineering LLD look like?** Applying deep, multi-level inheritance hierarchies and a Repository/Service Layer split to a small script with one, permanent data store and no testing requirement — the same "sophistication before the constraint exists" mistake from §1.5, now at the class level.

### 93.8 Exercises

1. Take a class you've written that handles more than one responsibility (e.g., validating input and also formatting output). Split it per the Single Responsibility Principle and explain what future change would now be contained to only one of the two resulting classes.
2. Explain, using §93.6, why a `Duck` class inheriting from a `Bird` class with a `fly()` method becomes a problem the moment a `Penguin` subclass is introduced, and how composition (e.g., a `FlightBehavior` object) would avoid it.

---
