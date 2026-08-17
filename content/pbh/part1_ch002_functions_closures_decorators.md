## 2. Functions, Closures & Decorators

### 2.1 The Problem: Cross-Cutting Behavior Without Rewriting Every Endpoint

A backend has dozens or hundreds of route handlers, and a large fraction of them need the same cross-cutting behavior applied — timing how long they take, checking a permission before running, retrying on a transient failure, caching a repeated result. Copy-pasting that logic into every handler is both tedious and, worse, means a fix to the logic must be repeated everywhere it was copied. The engineering need is a way to *wrap* existing behavior with new behavior, without touching the wrapped function's own code.

### 2.2 Engineering Constraint: Functions Are Objects, and That's the Whole Trick

In Python, a function is itself an object — it can be assigned to a variable, passed as an argument, returned from another function, and stored in a data structure, exactly like an integer or a string. This single fact is the entire foundation for solving §2.1's problem: if a function can be passed around like any other value, then a second function can accept it, build a new function that calls the original plus some extra behavior, and return that new function in its place.

### 2.3 Python Mechanism: Closures Capture Their Enclosing Scope

A **closure** is an inner function that references a variable from its enclosing (outer) function's scope, and continues to have access to that variable even after the outer function has finished executing — the inner function "closes over" that variable rather than losing it. This is what lets a wrapping function remember configuration (a threshold, a permission string, a cache dict) that was supplied once, at wrap time, and have every subsequent call to the wrapped function see it, without needing to pass it explicitly on every call.

### 2.4 Tradeoff: A Decorator Is Just a Closure With Special Call Syntax

A **decorator** — the `@my_decorator` syntax placed above a function definition — is not a new language feature requiring new reasoning; it is syntactic sugar for `my_function = my_decorator(my_function)`, applied at definition time. The tradeoff decorators introduce is entirely about *readability versus indirection*: a decorated function's actual behavior now depends on code the reader may not see at the call site, which is a genuine cost when a decorator changes behavior non-obviously (silently swallowing exceptions, for instance) — a well-designed decorator should behave predictably enough that "what does this do" is answerable from its name alone.

### 2.5 Decision Framework: When a Decorator Is the Right Tool, and When It Isn't

Reach for a decorator when the cross-cutting behavior is genuinely uniform across many call sites and doesn't need per-call-site customization beyond what the decorator's own arguments provide (timing, logging, a permission check, a retry policy). Avoid a decorator when the "cross-cutting" behavior actually needs deep, call-site-specific logic — at that point, an explicit function call inside the handler body is more honest and more debuggable than a decorator quietly branching internally per input.

### 2.6 Implementation

```python
import functools
import time

def timed(func):
    """Decorator: logs how long the wrapped function took to run."""
    @functools.wraps(func)          # preserves func's __name__/__doc__ (§2.7)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        print(f"{func.__name__} took {elapsed_ms:.2f}ms")
        return result
    return wrapper

@timed
def fetch_user_profile(user_id: str) -> dict:
    time.sleep(0.05)                # simulated DB call
    return {"user_id": user_id, "name": "Ada"}

fetch_user_profile("u-123")
# Output: "fetch_user_profile took 50.xx ms" printed, then the dict returned
# normally -- the caller's code is completely unaware timing was added.
```

`wrapper` is a closure over `func` (§2.3) — it remembers exactly which function it's wrapping. `*args, **kwargs` let the decorator work on any function signature without knowing it in advance. `functools.wraps` copies the original function's metadata (`__name__`, `__doc__`) onto `wrapper`, which matters in production because without it, every decorated function would report its name as `"wrapper"` in logs, stack traces, and introspection — a genuinely common, easy-to-miss production debugging annoyance.

### 2.7 Production Considerations

Forgetting `functools.wraps` is the single most common decorator mistake in real backend codebases — it doesn't break functionality, but it corrupts observability (stack traces, `/docs` auto-generated API documentation in frameworks that introspect function names, debugger output) in a way that's only discovered when someone is already mid-investigation of something else and gets confused by every wrapped function reporting the same generic name. A second production consideration: decorators that catch and suppress exceptions (a common pattern for "safe" wrappers) must re-raise or explicitly log what they caught — a decorator that silently swallows an exception turns a loud, debuggable failure into a silent, much worse one (directly the companion Software Systems Handbook's failure-visibility principle, applied at the function-wrapping level).

### 2.8 Debugging

**Symptoms:** Every function in a stack trace or log shows the same name (`wrapper`) regardless of which actual handler ran; a decorated function's docstring or auto-generated API docs are missing or wrong. **Investigation:** Check whether the decorator uses `functools.wraps(func)` on its inner function. **Root cause:** Without it, the wrapper function's own identity (name, docstring, module) replaces the original's everywhere introspection is used. **Fix:** Add `@functools.wraps(func)` immediately above the inner function definition — a one-line fix with no downside, which is precisely why omitting it should be treated as a bug, not a style preference.

### 2.9 Interview Thinking

"Implement a decorator that retries a function up to N times on failure" is a common prompt testing exactly the mechanism in this chapter — a strong answer explains closures capturing `N` and the wrapped function (§2.3) before writing any code, and explicitly discusses what happens to the *last* exception if all retries fail (it should propagate, not be silently swallowed, §2.7's exact warning) rather than treating that as an afterthought.

### 2.10 Mini Lab

Write a decorator `require_positive(func)` that wraps a function taking a single numeric argument, raising `ValueError` before calling the wrapped function if that argument is not greater than zero. Apply it to a small `calculate_discount(amount)` function and verify both the rejection path (negative input) and the pass-through path (positive input, correct result, and confirm via `.__name__` that `functools.wraps` preserved the original function's name).

---
