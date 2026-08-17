## 5. The Type System for Backend Engineers

### 5.1 The Problem: Catching a Class of Bug Before a Test Or a User Does

Python does not check types at runtime the way a compiled language does — passing a string where a function expects an integer doesn't fail until (and unless) the code actually tries to do integer-only operations on it, potentially far from where the wrong value was originally passed in. On a large backend codebase with many contributors, this class of mistake — a wrong-shaped argument, a typo'd dict key expected to exist, a function that returns `None` in a code path the caller didn't anticipate — is common enough that catching it before code review, let alone before production, has real engineering value.

### 5.2 Engineering Constraint: Python's Type Hints Are Not Enforced at Runtime by Default

A type hint like `def get_user(user_id: str) -> dict` is, by itself, purely documentation — Python does not raise an error if you call `get_user(42)`. The value comes entirely from a separate **static type checker** (mypy, pyright) that reads these hints and analyzes your code *without running it*, flagging mismatches before the code ever executes. This is a genuinely different tradeoff than a statically-typed compiled language: you opt into the safety incrementally, file by file, and can always fall back to no hints at all — powerful for gradual adoption on an existing codebase, but it means type hints an author wrote carelessly (or a type checker misconfigured to be lenient) provide false confidence, not a real guarantee.

### 5.3 Decision Framework: How Much Typing Discipline a Backend Actually Needs

Full, strict typing on every function (the type-checker equivalent of 100% test coverage, §117 companion chapter) has diminishing returns past a point — the highest-value place to invest typing effort is at **module boundaries**: function signatures other parts of the codebase call into, and especially the request/response models FastAPI validates against (§21). Internal helper functions used only within one file benefit less, and chasing perfect type coverage there is often lower-leverage than the same effort spent on tests (companion §117-118) or on typing the actual public interfaces other engineers depend on.

### 5.4 Python Mechanism: Generics Let a Function or Class Be Typed Without Fixing a Specific Type

A **generic** type is parameterized over another type — `list[str]` is a list specifically of strings, `dict[str, int]` is a dict from strings to ints — and a function or class can itself be generic, meaning it works correctly for *any* type `T` while still letting the type checker verify that whatever `T` a specific caller uses is used consistently throughout. This matters for backend code writing reusable infrastructure (a generic repository base class, a generic paginated-response wrapper) that should work identically for `Booking`, `Guest`, or `User` without being copy-pasted three times with only the type changed.

### 5.5 Tradeoff: `Optional`/`| None` Forces You to Handle the Absent Case Explicitly

Marking a return type as `str | None` (or the older `Optional[str]`) tells both the type checker and the next reader that this function can genuinely return nothing, and that calling code must handle that case before treating the result as a plain string — a type checker will flag code that uses the result without a `None` check first. The discipline this enforces directly prevents a very common production bug class: a lookup function that returns `None` when nothing is found, called by code that assumes it always gets a real object back, crashing with an `AttributeError` several lines later, far from the actual missing-data root cause.

### 5.6 Implementation

```python
from typing import TypeVar, Generic

T = TypeVar("T")                       # a placeholder type -- stands for
                                        # "whatever type this is used with"

class Repository(Generic[T]):
    """A generic in-memory repository, reusable for any entity type T."""
    def __init__(self) -> None:
        self._items: dict[str, T] = {}

    def save(self, item_id: str, item: T) -> None:
        self._items[item_id] = item

    def find_by_id(self, item_id: str) -> T | None:   # explicit "might not
        return self._items.get(item_id)                # exist" (§5.5)


class Booking:
    def __init__(self, booking_id: str) -> None:
        self.booking_id = booking_id


booking_repo: Repository[Booking] = Repository()   # T is fixed to Booking HERE
booking_repo.save("b-1", Booking("b-1"))

result = booking_repo.find_by_id("b-1")
if result is not None:                              # the type checker REQUIRES
    print(result.booking_id)                         # this check before allowing
                                                       # .booking_id access
```

`Repository(Generic[T])` is written once and works correctly for `Repository[Booking]`, `Repository[Guest]`, or any other entity type — the type checker verifies that a `Repository[Booking]`'s `save` only accepts `Booking` objects and `find_by_id` only returns `Booking | None`, without the class itself needing to be duplicated per entity type (§5.4). `find_by_id`'s `T | None` return type (§5.5) means the type checker flags `result.booking_id` on line 20 as an error unless the `if result is not None` guard is present first.

### 5.7 Production Considerations

Type hints have zero runtime cost by themselves (they're not checked as code executes) — but this means a type checker must actually be run, typically in CI (companion Software Systems Handbook §46's CI/CD chapter), for typing discipline to provide any real, enforced safety; type hints written but never checked by a CI job are documentation at best and misleading at worst if they drift from reality unnoticed. For FastAPI specifically (§21), type hints on route handler parameters are not merely documentation — Pydantic actually uses them at runtime to validate and coerce incoming request data, meaning a wrong type hint there has an immediate, real functional consequence, not just a static-analysis one.

### 5.8 Debugging

**Symptoms:** A function that "should" always return a value occasionally causes an `AttributeError` or `TypeError` deep in calling code, far from where the actual missing/wrong-typed value originated. **Investigation:** Check whether the originating function's actual return type includes `None` (or a different type) in some code path that its type hint doesn't currently declare, or that was declared but never checked by an actual type-checker run. **Root cause:** A type hint mismatch or omission that a type checker would have caught, but that either wasn't run or was silently ignored. **Fix:** Correct the type hint to reflect every real return path, add the explicit `None`/error handling at the call site the corrected hint now requires, and ensure the type checker runs in CI so this class of drift is caught automatically going forward.

### 5.9 Interview Thinking

"Should this codebase use strict typing everywhere?" is less a yes/no question than an invitation to discuss §5.3's tradeoff explicitly — a strong answer identifies which specific boundaries (public APIs, request/response models) benefit most and acknowledges that chasing full coverage on every internal helper is a real cost with declining marginal benefit, mirroring the same "proportional investment" judgment the companion Software Systems Handbook applies to testing and observability.

### 5.10 Mini Lab

Write a generic `Cache(Generic[T])` class with `get(key) -> T | None` and `set(key, value: T) -> None` methods backed by an internal dict. Instantiate it as `Cache[Booking]` and, in a small script, deliberately call `.get()` on a missing key and demonstrate (by trying to access an attribute on the result without a `None` check) the exact kind of error a type checker configured on this file would have caught before runtime — then add the guard and show the corrected version.

---
