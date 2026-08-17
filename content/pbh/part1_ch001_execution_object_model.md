## 1. The Python Execution & Object Model

### 1.1 The Problem: Backend Bugs That Only Make Sense Once You Know What Python Actually Does

A backend engineer who treats Python as "pseudocode that runs" will eventually hit a class of bug that looks impossible: a default argument that silently accumulates state across requests, a cache that returns the wrong object because two "equal" values weren't actually the same object, a service that mutates a dict it thought was a private copy. Every one of these traces back to a specific, learnable fact about how CPython actually represents and executes code — this chapter is not Python trivia, it is the minimum model needed to stop being surprised by your own program.

### 1.2 Engineering Constraint: Everything Is an Object, and Objects Have Identity Independent of Value

In Python, every value — an integer, a string, a function, a class — is an object living somewhere in memory, and every object has three properties: an **identity** (effectively its memory address, stable for its lifetime), a **type** (fixed at creation, determines what operations are valid), and a **value** (which may or may not be allowed to change). This is a different model from languages with unboxed primitives, where `x = 5` might mean "5 lives in this memory slot" — in Python, `x = 5` means "the name `x` now refers to the integer object `5`, which exists independently and might already be referenced by other names."

### 1.3 Tradeoff: Mutability Is a Property of the Type, Not a Setting You Choose

Some types are **immutable** (int, str, tuple, frozenset) — once created, their value can never change; any operation that looks like modification actually creates a new object. Some types are **mutable** (list, dict, set, and any ordinary class instance by default) — their value can change in place, with their identity staying the same. This is not a stylistic choice per object; it's fixed by the type. The engineering consequence: passing a mutable object into a function, or storing it in a shared cache, means the caller and callee (or every reader of the cache) share the *same* object — a mutation by one is visible to all of them, whether that's intended or not.

### 1.4 Decision Framework: Identity (`is`) vs. Equality (`==`)

`is` asks "are these the same object" (identity comparison); `==` asks "do these compare as equal" (value comparison, using the type's `__eq__`). For immutable small integers and interned strings, CPython's implementation details can make `is` *appear* to work for equality checks in casual testing — this is an implementation detail, not a language guarantee, and code relying on it is a latent bug waiting for a slightly different input to surface. The decision rule for backend code is simple and should never require deeper reasoning: use `is` only for singleton checks (`if value is None`, `if flag is True`), and `==` for everything else, including comparing your own domain objects (where you control `__eq__`).

### 1.5 Python Mechanism: Namespaces, Scoping, and the Mutable Default Argument Trap

A **namespace** is a mapping from names to objects — Python has several nested namespaces (local, enclosing, global, built-in, resolved in that order, the "LEGB" rule) and looking up a name walks outward through them. The specific, high-frequency backend bug this explains: a function parameter with a mutable default value (`def handler(cache={})`) has that default object created *once*, at function-definition time, not once per call — every call that doesn't supply its own argument shares and can mutate the exact same dict, meaning state silently leaks across requests that have no business sharing anything.

### 1.6 Implementation

```python
# The mutable-default-argument bug, and the fix.

def add_item_broken(item, bucket={}):        # bucket created ONCE at def time
    bucket[item] = True
    return bucket

def add_item_fixed(item, bucket=None):
    if bucket is None:                        # fresh dict every call, per §1.4's
        bucket = {}                           # "is None" identity check
    bucket[item] = True
    return bucket

print(add_item_broken("a"))   # {'a': True}
print(add_item_broken("b"))   # {'a': True, 'b': True} -- "a" leaked in from the
                               # PREVIOUS call's shared default object (§1.5)

print(add_item_fixed("a"))    # {'a': True}
print(add_item_fixed("b"))    # {'b': True} -- correctly isolated per call
```

Every call to `add_item_broken` without an explicit `bucket` argument reuses the exact same dict object created when the function was defined — this is precisely §1.3's mutability point manifesting as a real bug. `add_item_fixed` sidesteps it by using the immutable sentinel `None` as the default and constructing a fresh mutable object inside the function body on every call.

### 1.7 Production Considerations

This bug is especially dangerous in backend code because a request handler with a mutable default looks correct in every individual test (a single request, a single call) and only reveals itself under concurrent or repeated real traffic — exactly the kind of failure that passes code review and unit tests but causes a confusing, hard-to-reproduce production incident. Any code review checklist for a Python backend should flag mutable default arguments (`= []`, `= {}`, `= set()`) as an automatic, non-negotiable item, not a stylistic nitpick.

### 1.8 Debugging

**Symptoms:** A collection (list/dict/set) argument to a function appears to "remember" values from unrelated previous calls; state that should be request-scoped bleeds across requests. **Investigation:** Check every function signature for a mutable literal as a default value — this single grep-able pattern (`def \w+\(.*=\[\]|\{\}|set\(\)`) explains the overwhelming majority of instances of this bug. **Root cause:** Default argument objects are evaluated once, at function-definition time, not per call (§1.5). **Fix:** Replace the mutable default with `None`, and construct the mutable object inside the function body.

### 1.9 Interview Thinking

An interviewer asking "what's wrong with this function" and showing a mutable default argument is testing whether you know this is a language-level gotcha, not a runtime bug — a strong answer explains *why* it happens (default evaluated at def-time, §1.5) rather than just reciting "don't use mutable defaults" as a memorized rule. A stronger follow-up: "when would sharing a mutable default actually be intentional?" — a legitimate, rare answer is a memoization cache meant to persist exactly for the function's lifetime, which is precisely why the fix isn't "never do this," it's "know exactly what you're choosing when you do."

### 1.10 Mini Lab

Write a function `record_request(path, log=[])` (deliberately buggy) that appends `path` to `log` and returns it. Call it three times with different paths and observe the accumulating list. Then rewrite it using the `None`-sentinel pattern from §1.6, call it three times again, and confirm each call now returns a list containing only that call's single path.

---
