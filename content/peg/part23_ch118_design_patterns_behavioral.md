## §118. Design Patterns III: Behavioral (Strategy, Observer, Template Method)

### 1. The Vocabulary

- **Strategy** — encapsulates an interchangeable algorithm (a "strategy") behind a common
  interface, so the calling code picks which strategy to use without an `if/elif` chain scattered
  through it.
- **Observer** — lets one or more "observers" subscribe to events on a "subject," so the subject
  can notify them without knowing anything about who's listening or what they'll do.
- **Template Method** — defines the skeleton of an algorithm in a base class, with specific steps
  overridden by subclasses — the overall sequence stays fixed, only the individual steps vary.
- **Publish/subscribe (pub/sub)** — the distributed-systems cousin of Observer, where the "subject"
  is a message broker and "observers" are separate services (see §42).

### 2. Where It Sits, and Why Teams Use It

Behavioral patterns are about how objects communicate and vary their behavior without becoming a
tangle of conditionals. Strategy is the pattern behind "pick a pricing algorithm," "pick a
rate-limiting algorithm," or "pick a sorting comparator" — anywhere multiple interchangeable
approaches need to be selected at runtime. Observer is the pattern behind "notify other parts of
the system when a booking or payment status changes," in-process, without the booking code needing
to know who cares. Template Method shows up in test frameworks and base request handlers, where
the overall flow (setup, run, teardown) is fixed but individual steps are customized per subclass.

### 3. What Actually Breaks

- **A long `if/elif` chain instead of Strategy** — every time a new pricing rule or rate-limiting
  algorithm is added, the same function grows another branch, and the function eventually becomes
  unreadable and risky to touch.
- **Tight coupling disguised as Observer** — a "subject" that directly imports and calls specific
  observer classes by name isn't actually using the pattern; real Observer means the subject only
  knows about a generic interface, not concrete listeners.
- **Observer chains with unclear ordering or failure handling** — if one observer throws an
  exception, does it stop the others from running? Undefined behavior here causes exactly the kind
  of "why did half the side effects happen" bug that's painful to debug in production.
- **Template Method overriding too much** — if subclasses end up overriding nearly every step, the
  "template" isn't actually providing structure anymore, just an illusion of shared logic.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I reach for Strategy when I see a growing conditional chain picking between interchangeable
  algorithms — pricing, rate limiting, sorting — and turn each branch into its own class behind a
  shared interface."
- "I use Observer when multiple, decoupled parts of the system need to react to the same event
  without the event's source knowing who's listening."
- "I'm explicit about failure handling in an Observer chain — one failing listener shouldn't
  silently prevent the others from running, unless that's a deliberate design choice."

### 5. Interview-Ready Answer

> "Strategy is the one I reach for most — any time I see a conditional chain picking between
> interchangeable approaches, like different pricing tiers or rate-limiting algorithms, I turn each
> branch into a class behind one interface so adding a new option doesn't mean editing that
> function again. Observer I use for in-process event reactions — notifying an audit log and a
> notification service when a booking status changes, without the booking code needing to know
> either of them exists. At a larger scale, that same idea becomes pub/sub through a real message
> broker."

### 6. Go Deeper

companion Software Systems Handbook's §94 (The Classic Design Pattern Catalog (Gang of Four))
chapter for full code examples; this book's §42 (why queues exist) for how Observer's in-process
idea becomes pub/sub across services.

---
