## 106. LLD Interview Framework and Worked Examples I: Elevator System, Library Management System

### 106.1 The LLD Framework: A Repeatable Companion to §92's HLD Framework

§93 already established LLD *principles* (SOLID, GRASP, composition, DI, Repository, Service Layer). This chapter provides the missing piece: a repeatable *process* for applying those principles live, under interview conditions, the same role §92's ten-step framework plays for HLD. The LLD framework: (1) **Identify the core entities/classes** and their responsibilities (a single-responsibility pass, §93); (2) **Identify relationships between entities** — composition vs. inheritance, association vs. aggregation; (3) **Define the key interfaces/abstractions** a client of this system would use, before internal implementation details; (4) **Walk through the primary use cases** end to end against the class design, checking that every stated requirement is actually satisfiable; (5) **Identify extension points** — where does this design need to accommodate a stated or implied future requirement (a new pricing rule, a new vehicle type) without a rewrite, directly testing Open/Closed adherence (§93); (6) **State the concurrency model** if the system has any shared mutable state accessed by multiple actors (§26, §32). Unlike HLD's emphasis on boxes and infrastructure, LLD's center of gravity is class responsibility and extensibility — a strong LLD answer produces a small number of well-named classes with clear, single responsibilities, not an exhaustive UML diagram.

### 106.2 "Design an Elevator System"

**Core entities:** `Elevator` (current floor, direction, state, door status), `ElevatorController` (assigns requests to elevators, the system's central coordination point), `Request` (origin floor, destination floor, direction), `Floor` (up/down call buttons). **Key interfaces:** `ElevatorController.requestElevator(floor, direction)` (external hall call) and `Elevator.selectFloor(floor)` (internal cabin request) — deliberately two distinct request types, since conflating them is a common design mistake that fails to model how real elevator systems actually receive input. **Primary use case walkthrough:** A user on floor 3 presses "up" → `ElevatorController` evaluates all elevators' current state (position, direction, existing request queue) and assigns the request to the best candidate (nearest, moving in the same direction, or idle) — this assignment algorithm is the design's actual core difficulty, not the class structure surrounding it. **Extension point:** Supporting multiple elevator-selection strategies (nearest-elevator, least-busy, zone-based for high-rise buildings) cleanly implies a **Strategy pattern** (§94's GoF catalog) for the assignment algorithm specifically, so a new strategy can be added without modifying `ElevatorController` itself (Open/Closed, §93). **Concurrency model:** Multiple floor requests can arrive concurrently while an elevator is mid-transit — the request queue per elevator needs thread-safe access (§26), and the assignment decision itself should be made atomically to avoid two controller threads assigning the same elevator to conflicting requests simultaneously. **This question is testing:** clean state-machine modeling (an elevator's direction/state transitions) combined with recognizing where a pluggable algorithm (the Strategy pattern) belongs — a candidate who hardcodes one assignment algorithm directly into the controller class has missed the extension-point signal (§106.1 Step 5).

### 106.3 "Design a Library Management System"

**Core entities:** `Book` (catalog metadata — title, author, ISBN), `BookCopy` (a specific physical or licensed instance of a Book, since a library holds multiple copies), `Member`, `Loan` (links a Member to a BookCopy for a checkout period), `Reservation` (a Member waiting for a currently-unavailable Book). **Key relationship:** `Book` and `BookCopy` is a deliberate one-to-many modeling decision — conflating them (treating "the book" as a single entity representing all copies) fails the moment two copies of the same book have different availability states, a common LLD-interview mistake worth naming explicitly. **Key interfaces:** `LibraryService.checkout(memberId, copyId)`, `LibraryService.returnBook(copyId)`, `LibraryService.reserve(memberId, bookId)` — a **Service Layer** (§93) coordinating the underlying entities rather than embedding business rules (loan limits, overdue fines, reservation queue ordering) directly inside the entity classes themselves. **Primary use case walkthrough:** A member attempts to check out a copy of a Book with zero available copies → the system should offer a `Reservation` instead, and when a copy is later returned, the reservation queue (typically FIFO) should be checked before the copy becomes generally available again — this queue-priority-on-return logic is the design's actual core difficulty. **Extension point:** Different member types (student, faculty, guest) having different loan limits and fine structures cleanly implies either a **Strategy pattern** for the loan-policy calculation or a simple `MemberType` enum with associated policy data, depending on how much the policies genuinely vary in *behavior* (Strategy) versus just *data* (enum/config) — a candidate should explicitly justify which one fits, rather than reaching for a design pattern reflexively (§93's principle that patterns solve a specific complexity, not a default choice). **Concurrency model:** Two members attempting to check out the last available copy of a book simultaneously is the system's central race condition — requiring a transactional check-and-update (§32.3) on copy availability, structurally identical to §105.2's parking-garage concurrency concern. **This question is testing:** correct entity/relationship modeling (the Book/BookCopy distinction specifically) and recognizing when a design pattern is justified by genuine behavioral variation versus when simpler data-driven configuration suffices.

### 106.4 Engineering Intuition

> **How is an LLD interview's center of gravity different from an HLD interview's?** HLD (§92) is scored primarily on requirement-gathering, capacity-driven component selection, and infrastructure-level tradeoffs; LLD is scored primarily on entity/relationship modeling correctness, single-responsibility class design, and recognizing genuine (not reflexive) design-pattern application points (§104.2's Signal 6, made concrete).

> **What's the most common LLD mistake across both worked examples in this chapter?** Conflating two entities that need independent lifecycle/state (Book vs. BookCopy; hall-call Request vs. cabin-selection Request) into one — this single modeling error cascades into an awkward, hard-to-extend design regardless of how well everything downstream is implemented.

> **What would over-engineering an LLD answer look like?** Introducing a Strategy pattern, a Factory, and an Observer for the Library system's member types before establishing that member-type policies actually differ in *behavior* rather than just in a few configuration values — exactly §93's warning that patterns solve problems, and should be introduced in response to a genuine one, not applied by default to sound sophisticated.

### 106.5 Decision Tree: Applying the LLD Framework to a New, Unfamiliar Prompt

```
Given an unfamiliar LLD prompt:
1. List the nouns in the problem statement -- these are strong
   candidates for your core entities (§106.1 Step 1).
2. For each pair of entities, ask: does one exist independently
   of the other, or is one just an attribute of the other? This
   determines composition vs. simple field (the Book/BookCopy
   test, §106.3).
3. Walk the PRIMARY use case end to end BEFORE discussing any
   design pattern -- patterns should emerge from a demonstrated
   need (an extension point, §106.1 Step 5), not be applied
   upfront.
4. Explicitly identify the concurrency-sensitive operation (the
   one where two actors could race) -- nearly every LLD prompt
   has exactly one central race condition worth naming.
```

### 106.6 Further Reading

- §93 (LLD Foundations: SOLID/GRASP/DI/Repository/Service Layer), §94 (GoF Pattern Catalog) — the direct mechanism foundations for this chapter's two worked examples.

---
