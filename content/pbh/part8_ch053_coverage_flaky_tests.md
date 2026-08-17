## 53. Coverage & Flaky Tests in Backend Suites

### 53.1 The Problem: Companion §117.6-117.7 Gave You the General Principles; Python Backends Have Their Own Specific Instances of Both

Companion §117.6 established coverage as a useful negative signal with a sharp limit, and §117.7 catalogued the general causes of flaky tests. This closing Part VIII chapter provides the Python-specific tooling for measuring coverage meaningfully, and the specific, recurring Python/async/FastAPI causes of flakiness this handbook's own mechanisms (Part II's concurrency, §26's async sessions) tend to introduce if not handled carefully.

### 53.2 Python Mechanism: `coverage.py` and Branch Coverage

`coverage.py` (typically invoked via `pytest --cov`) measures which lines — and, with `--cov-branch`, which *branches* of conditional logic — actually executed during a test run. Branch coverage is a meaningfully stronger signal than plain line coverage: a line coverage report can show 100% for an `if`/`else` block where every test happened to take the `if` branch and never the `else` — the line containing `else:` itself was "covered" (the interpreter passed over it), but the code path it guards was never actually exercised, precisely the kind of gap companion §117.6 warned coverage alone cannot detect without branch-level granularity.

### 53.3 Decision Framework: Coverage as a Diff-Focused Signal, Not a Whole-Codebase Score to Chase

Rather than treating an aggregate "80% coverage" (or any single target number) as a goal in itself — which, per companion §117.6, predictably produces assertion-free tests written purely to move the number — a more useful practice tracks coverage specifically on the *diff* of a given change (did this pull request's new or modified code get tested, regardless of the whole codebase's historical aggregate) and treats a drop in newly-added code's coverage as the actionable signal, rather than fixating on the codebase-wide aggregate, which is dominated by old code the current change didn't touch at all.

### 53.4 Python Mechanism: The `pytest-asyncio` Event Loop — a Recurring, Python-Async-Specific Flakiness Source

Testing async code (§12, §17) requires `pytest-asyncio` (or pytest's own native asyncio support) to actually run `async def test_...` functions at all — a common, specifically Python-async flakiness source is **event loop scope mismatch**: a fixture creating an async resource (a database connection, an HTTP client) tied to one event loop, while a different test (or a different fixture scope) creates or expects a *different* event loop, producing confusing `RuntimeError: Event loop is closed` or similar errors that have nothing to do with the actual test logic and everything to do with event-loop lifecycle mismanagement across fixture scopes — a genuinely Python-and-asyncio-specific instance of companion §117.7's general flaky-test cause catalogue, not covered by that chapter's generic treatment.

### 53.5 Python Mechanism: `freezegun` — Eliminating `datetime.now()` as a Flakiness Source

Any test whose assertions depend on the current wall-clock time (a booking's date validated as "not in the past," companion §21.6, tested near a day boundary) is a latent flaky test — it can pass reliably for months and then fail specifically when run within a few seconds of local midnight, or fail consistently in one timezone-configured CI environment while passing in another. The `freezegun` library's `@freeze_time("2026-08-01")` decorator pins `datetime.now()` (and related time functions) to a fixed, explicit value for the duration of a test, eliminating this entire flakiness class by construction rather than hoping the test never happens to run at an unlucky moment.

### 53.6 Implementation

```python
import pytest
from freezegun import freeze_time
from datetime import date

@freeze_time("2026-08-01")               # §53.5: wall-clock time is now
def test_booking_date_validation_not_in_past():   # DETERMINISTIC for this test
    today = date.today()
    assert today == date(2026, 8, 1)      # never flaky, regardless of
                                             # when this test actually runs

    with pytest.raises(ValueError):
        CreateBookingRequest(seat_id="s-1", booking_date=date(2026, 7, 31))  # a
                                                                                # PAST
                                                                                # date,
                                                                                # relative
                                                                                # to the
                                                                                # frozen
                                                                                # "today"


# pytest-asyncio event loop scope -- explicit, not left to accidental default
@pytest.fixture(scope="function")         # matches the DEFAULT test scope --
async def async_http_client():             # avoiding §53.4's mismatch
    import httpx
    async with httpx.AsyncClient() as client:
        yield client

@pytest.mark.asyncio
async def test_external_call(async_http_client):
    response = await async_http_client.get("http://localhost:8000/health")
    assert response.status_code == 200


class CreateBookingRequest:
    def __init__(self, seat_id, booking_date):
        if booking_date < date.today():
            raise ValueError("booking_date cannot be in the past")
```

`@freeze_time("2026-08-01")` makes `test_booking_date_validation_not_in_past` produce the identical result every single time it runs, regardless of the actual calendar date the test suite executes on — directly eliminating §53.5's flakiness class rather than merely reducing its probability. `async_http_client`'s explicit `scope="function"` (matching the default test scope pytest-asyncio expects) is a deliberate, visible choice rather than an accidental default — the specific discipline that avoids §53.4's event-loop-scope-mismatch flakiness, which otherwise manifests as confusing, hard-to-diagnose `RuntimeError`s that have nothing to do with the actual async logic under test.

### 53.7 Production Considerations

A flaky test that's tolerated (re-run until it passes, rather than fixed) trains an entire team to distrust CI failures generally — directly companion §117.7's warning about eroded trust in the test suite, with a specific, additional Python-backend consequence: once a team habitually re-runs failures without investigating, a *genuine* regression hiding among the noise of known-flaky tests becomes far more likely to be missed, since it looks, superficially, like just another instance of the tolerated flakiness. `coverage.py`'s diff-focused mode (§53.3) should be wired directly into CI pull-request checks, surfacing exactly which new or modified lines lack test coverage as part of the review itself, rather than requiring a reviewer to manually cross-reference a separate coverage report against the diff by hand.

### 53.8 Debugging

**Symptoms:** A test suite has a small number of tests that fail intermittently, seemingly at random, with no code change correlated to the failures; an async test suite occasionally produces confusing `RuntimeError: Event loop is closed` errors unrelated to the actual test's logic. **Investigation:** For general intermittent failures, check whether the failing tests involve wall-clock time, shared mutable fixture state (companion §117.7, §49.9), or execution-order dependency — run the specific failing test in isolation repeatedly, and then as part of the full suite repeatedly, to narrow down which category it falls into (companion §117.8's exact diagnostic technique). For event-loop errors specifically, check fixture scopes for async resources against the test scope actually in use (§53.4). **Root cause:** An untreated time-dependency (fixable via `freezegun`, §53.5); shared state leaking between tests (companion §49.9's fix); or a genuine async fixture-scope mismatch. **Fix:** Apply `@freeze_time` to any test whose correctness depends on the current date/time; correct async fixture scopes to consistently match the test scope they're used within; for shared-state leakage, apply companion §51.4's transaction-rollback-style isolation pattern.

### 53.9 Interview Thinking

"Your test suite has a test that fails about 1 in 20 runs — how do you investigate?" is testing whether you have a specific, structured hypothesis list (time-dependency, shared state, async event-loop scope, execution order) rather than an unstructured "just re-run it" response — a strong answer runs the specific failing test both in isolation and within the full suite repeatedly (companion §117.8) as the first diagnostic step, since this single check quickly narrows the search space to a small number of remaining likely causes.

### 53.10 Mini Lab

Write a test whose correctness depends on `date.today()` without using `freeze_time` (e.g., asserting a booking made "today" has a status derivable from the current date), and note the theoretical flakiness risk even if it doesn't manifest during your session. Then rewrite it using `@freeze_time` and confirm identical, deterministic behavior. Separately, set up a minimal async test with an explicitly-scoped async fixture as in §53.6, run it several times in a row, and confirm no event-loop-related errors occur — then deliberately mismatch the fixture's scope (e.g., to `session`) and observe whether the same error class §53.4 describes appears.

---
