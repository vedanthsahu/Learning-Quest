## 3. Context Managers, Iterators & Generators

### 3.1 The Problem: Resources That Must Be Released, and Data Too Large to Hold at Once

Two distinct but related backend problems: first, a resource (a database connection, a file handle, a lock) must be reliably released even if the code using it raises an exception halfway through — a bug here leaks connections until the pool is exhausted. Second, a dataset (a large query result, a file being streamed to a client) is too large, or arrives too slowly, to build entirely in memory before processing it — code that materializes the whole thing into a list first wastes memory and adds latency proportional to the *entire* dataset before any of it can be used.

### 3.2 Python Mechanism: Context Managers Guarantee Cleanup Regardless of How the Block Exits

A **context manager** — anything usable in a `with` statement — implements `__enter__` (run at the start of the block) and `__exit__` (run at the end, *guaranteed*, whether the block completed normally, returned early, or raised an exception). This guarantee is the entire value proposition: `conn = get_connection(); ...; conn.close()` written manually will skip the `close()` call if anything between acquisition and release raises — the `with` statement form cannot skip cleanup that way, because `__exit__` runs during exception propagation, not just on the happy path.

### 3.3 Tradeoff: Writing a Context Manager Class vs. `@contextmanager`

A full context-manager class (`__enter__`/`__exit__` methods) is verbose but explicit, and is the right choice when the object has other responsibilities beyond just being a context manager (a connection object that's also queried, for instance). The `@contextlib.contextmanager` decorator turns a single generator function into a context manager — the code before the `yield` is `__enter__`, the code after is `__exit__` — dramatically less boilerplate for a one-off resource wrapper, at the cost of the exit logic being harder to unit-test in isolation than a class's separate `__exit__` method would be.

### 3.4 Python Mechanism: Iterators Are a Protocol, Not a Type

Anything implementing `__iter__` (returns an iterator) and `__next__` (returns the next item, raises `StopIteration` when exhausted) can be used in a `for` loop, regardless of what it actually is internally — a list, a database cursor, a network stream, or a custom class. This is a **protocol**, not inheritance — Python doesn't care what your object *is*, only whether it *behaves* like an iterator, directly the same structural-typing principle §4 develops formally for backend data models.

### 3.5 Decision Framework: Generators Solve §3.1's Memory Problem Directly

A **generator function** (any function containing `yield`) is the practical way almost all backend code implements the iterator protocol without writing `__iter__`/`__next__` by hand: calling it doesn't run the function body immediately, it returns a generator object that runs the body incrementally, one `yield` at a time, only as the caller asks for the next value. The direct engineering consequence: a generator processing a million-row database result set never holds all million rows in memory simultaneously — only whichever row is currently being processed, plus whatever buffering the underlying driver does — making "generator vs. list" the first, cheapest lever for any backend code processing a dataset too large to comfortably fit in memory.

### 3.6 Implementation

```python
from contextlib import contextmanager

@contextmanager
def db_transaction(conn):
    """Context manager: commits on success, rolls back on any exception."""
    try:
        yield conn                      # __enter__ half: hand the connection
                                          # to the `with` block's body
        conn.commit()                    # only reached if the block succeeded
    except Exception:
        conn.rollback()                  # guaranteed to run on ANY exception
        raise                            # re-raise -- never swallow (§2.7)
    finally:
        conn.close()                     # ALWAYS runs, success or failure


def stream_large_result(cursor, batch_size=500):
    """Generator: yields rows in batches without loading the full result set."""
    while True:
        batch = cursor.fetchmany(batch_size)   # only THIS batch is in memory
        if not batch:
            return                              # raises StopIteration for the
                                                  # for-loop to stop on
        for row in batch:
            yield row


# Usage:
with db_transaction(get_connection()) as conn:
    cursor = conn.execute("SELECT * FROM bookings")
    for row in stream_large_result(cursor):     # processes one row at a time
        process(row)
```

`db_transaction` uses the try/except/finally structure specifically so that a failure partway through the `with` block still triggers `rollback()` and `close()` — the guarantee from §3.2, implemented via §3.3's lower-boilerplate generator-based approach. `stream_large_result` never builds the full result set as a Python list; `fetchmany` retrieves only `batch_size` rows at a time from the database driver, and `yield` suspends the function exactly at that point, resuming only when the consuming `for` loop asks for the next item.

### 3.7 Production Considerations

A context manager's `__exit__` (or the code after `yield` in the `@contextmanager` form) must itself be defensive — if `rollback()` can also raise (a broken connection, for instance), that secondary exception can mask the original one unless handled carefully; production database wrapper code commonly logs the original exception explicitly before attempting cleanup, precisely so a cleanup failure doesn't erase the actual root cause from the logs. For generators, a subtle but real production issue: a generator that's never fully consumed (the caller breaks out of the loop early) may leave a database cursor or file handle open until the generator object is garbage-collected — for anything holding a real external resource, wrap the generator's resource acquisition in its own context manager rather than relying on garbage collection timing.

### 3.8 Debugging

**Symptoms:** Database connections or file handles accumulate and are eventually exhausted under load, even though the code "looks like" it closes everything. **Investigation:** Check whether cleanup uses a `with` block/context manager or manual `.close()` calls; for manual calls, check whether every code path between acquisition and close can raise. **Root cause:** A manual-cleanup code path skipped `.close()` because an exception (or an early `return`) jumped past it (§3.2). **Fix:** Convert the resource-acquisition code to a context manager so cleanup is structurally guaranteed rather than dependent on every code path remembering to call it.

### 3.9 Interview Thinking

"Why would you use a generator instead of returning a list?" is testing whether you connect the *memory* argument (§3.5) to a concrete scenario, not just recite "it's more efficient" — a strong answer names the specific tradeoff: a generator can only be iterated once and doesn't support random access or `len()`, so it's the right choice specifically when the caller only needs to process items sequentially and the dataset is large or arrives incrementally, not a universal replacement for lists.

### 3.10 Mini Lab

Write a generator function `paginate(fetch_page_fn, page_size=50)` that repeatedly calls `fetch_page_fn(offset, page_size)` (a stand-in for a paginated API or DB query) and yields individual items across all pages, stopping when a call returns an empty page. Then write a context manager (using `@contextmanager`) that times how long a full iteration over your generator takes, using the pattern from §3.6's `db_transaction` as a structural template.

---
