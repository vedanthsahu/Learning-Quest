## 4. Dataclasses, Enums & Structural Typing (Protocols)

### 4.1 The Problem: Modeling Domain Data Without Drowning in Boilerplate

A backend constantly needs small, structured data objects — a booking request, a user profile, a configuration bundle — and hand-writing `__init__`, `__repr__`, and `__eq__` for every one of them is repetitive and, worse, easy to get subtly wrong (a forgotten field in `__eq__`, an `__init__` that doesn't match the class's actual attributes). A related but distinct problem: representing a fixed, closed set of valid values (a booking status, a user role) as bare strings invites typos that no tool catches until runtime, if ever.

### 4.2 Python Mechanism: `@dataclass` Generates the Boilerplate From Type-Annotated Fields

The `@dataclass` decorator inspects a class's type-annotated attributes and automatically generates `__init__`, `__repr__`, and `__eq__` (comparing all fields) — turning a domain object into a few lines of field declarations instead of a hand-written constructor and comparison logic. This directly solves §4.1's first problem: the fields are declared once, and every mechanical piece of behavior that should follow from "these are the fields" is generated consistently, rather than manually kept in sync by the author.

### 4.3 Tradeoff: Mutable by Default, With an Explicit Opt-In to Immutability

A plain `@dataclass` produces a mutable object — its fields can be reassigned after construction, exactly like an ordinary class (§1.3's mutability discussion applies directly). Passing `frozen=True` makes it immutable — attempting to reassign a field raises an exception — which is the right choice whenever a data object represents a value that shouldn't change after creation (an event that already happened, a configuration loaded at startup) and, as a direct benefit, makes the object hashable and safe to use as a dict key or put in a set, which a mutable object generally should not be.

### 4.4 Python Mechanism: Enums Give a Closed Set of Values a Type, Not Just a Convention

An `Enum` class defines a fixed set of named values (`BookingStatus.CONFIRMED`, `BookingStatus.CANCELLED`) that are genuine, distinct objects — comparing `status == BookingStatus.CONFIRMED` is comparing against a specific, known member, not against a bare string that could be misspelled with no error raised. This directly solves §4.1's second problem: an invalid status value becomes a construction-time or type-checker-time error rather than a silent runtime string mismatch discovered only when a comparison unexpectedly fails.

### 4.5 Decision Framework: Protocols — Typing an Object by What It Does, Not What It Inherits From

A **Protocol** (from the `typing` module) defines a set of methods/attributes an object must have to satisfy the type, *without* requiring that object to inherit from any particular base class — this is **structural typing** ("if it has the right shape, it satisfies the type"), directly formalizing the duck-typing already implicit in §3.4's iterator protocol discussion. Use a Protocol when you want to accept "anything with a `.save()` method" (a repository, a cache, a mock in a test) without forcing every such object into an artificial shared inheritance hierarchy — this is usually the right default for backend interfaces, reserving actual inheritance for genuine is-a relationships with shared implementation to reuse, not merely a shared type signature.

### 4.6 Implementation

```python
from dataclasses import dataclass
from enum import Enum, auto
from typing import Protocol
from datetime import date

class BookingStatus(Enum):
    CONFIRMED = auto()      # auto() assigns increasing values automatically --
    CANCELLED = auto()      # the actual integer values rarely matter, only
    COMPLETED = auto()      # that each member is distinct (§4.4)

@dataclass(frozen=True)     # immutable: a booking record shouldn't mutate
class Booking:              # after creation (§4.3)
    booking_id: str
    seat_id: str
    booking_date: date
    status: BookingStatus

class Notifier(Protocol):   # structural type: "anything with a .send(...) method"
    def send(self, message: str) -> None: ...

def notify_booking_created(notifier: Notifier, booking: Booking) -> None:
    notifier.send(f"Booking {booking.booking_id} confirmed for {booking.booking_date}")

class EmailNotifier:         # NOTE: does not inherit from Notifier at all
    def send(self, message: str) -> None:
        print(f"[email] {message}")

notify_booking_created(EmailNotifier(), Booking("b-1", "s-42", date.today(), BookingStatus.CONFIRMED))
# Type-checks and runs correctly -- EmailNotifier satisfies Notifier structurally,
# with zero inheritance relationship between them (§4.5).
```

`Booking` gets a generated `__init__(booking_id, seat_id, booking_date, status)`, `__repr__`, and `__eq__` entirely from its field declarations (§4.2); `frozen=True` (§4.3) means a `Booking` instance can be safely shared across code without fear of one part of the system mutating a record another part is relying on. `EmailNotifier` satisfies the `Notifier` Protocol purely by having a matching `send` method — no `class EmailNotifier(Notifier)` inheritance is written or needed (§4.5).

### 4.7 Production Considerations

`@dataclass`'s generated `__eq__` compares *all* fields by default — for a class with a field that shouldn't participate in equality (an internal cache, a computed timestamp), use `field(compare=False)` explicitly, since silently comparing every field can produce two objects being reported as unequal for a reason that has nothing to do with what the code actually cares about. For Enums specifically, a common production mistake is serializing an Enum member directly to JSON without converting it to its underlying value first — most JSON serializers don't know how to encode an Enum member natively, producing a confusing serialization error far from where the Enum was actually constructed.

### 4.8 Debugging

**Symptoms:** Two dataclass instances that "should" be equal compare as unequal; a Protocol-typed parameter rejects an object at type-check time that clearly has the right methods at runtime (or vice versa — passes type-checking but fails at runtime). **Investigation:** For the equality case, check whether every field actually participates meaningfully in equality, or whether one field (a timestamp, an internal id) is causing spurious differences. For the Protocol case, check whether the method signatures actually match exactly (parameter types, return type) — Protocols check structure precisely, not loosely. **Root cause:** Either an unintended field in the generated `__eq__`, or a Protocol method signature mismatch invisible without careful reading. **Fix:** Use `field(compare=False)` for non-comparison fields; align the concrete class's method signature exactly with the Protocol's declared signature.

### 4.9 Interview Thinking

"When would you use a Protocol instead of an abstract base class?" tests whether you understand structural versus nominal typing (§4.5) — a strong answer notes that a Protocol lets third-party or already-existing classes (that you can't or don't want to modify to add inheritance) satisfy your interface retroactively, which is specifically valuable when writing code that needs to accept objects from a library you don't control, or when writing tests that pass in a simple stand-in object without needing it to inherit from anything.

### 4.10 Mini Lab

Define a frozen `@dataclass` called `GuestVisit` with fields for `visit_id`, `guest_name`, `visit_date`, and a `VisitStatus` Enum (`SCHEDULED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`). Then define a `Notifier` Protocol like §4.6's, write two different concrete classes satisfying it (one printing to console, one just appending to a list for testing), and write a function that accepts any `Notifier` and calls it when a `GuestVisit`'s status changes to `CHECKED_IN`.

---
