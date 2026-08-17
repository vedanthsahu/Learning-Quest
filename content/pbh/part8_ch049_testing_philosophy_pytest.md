## 49. Testing Philosophy & pytest Fundamentals

### 49.1 The Problem: Every Preceding Chapter Assumed Testability; This Part Delivers It

Parts I-VII repeatedly referenced testing as a benefit of a given design choice — companion §43.3's Protocol-typed layer boundaries, §45.2's pure domain functions, §29's Repository pattern — without yet showing the actual testing mechanics that realize those benefits. This Part is not a general treatment of testing philosophy (the companion Software Systems Handbook's §117-118 already covers the test pyramid, mocking vocabulary, flaky-test causes, and contract testing in full, generic depth) — it is specifically the Python-and-FastAPI-native implementation of that philosophy, assuming that general foundation.

### 49.2 Python Mechanism: pytest's Function-Based Tests and Assertion Rewriting

`pytest` tests are plain functions prefixed `test_`, using Python's ordinary `assert` statement rather than a `self.assertEqual(...)`-style API — pytest's **assertion rewriting** intercepts a failing `assert` at import time and produces a detailed failure report (showing the actual values of every sub-expression in the assertion) without the test author needing to choose a specific, differently-named assertion method per comparison type, a meaningfully lower-friction experience than `unittest`'s older, more verbose API.

### 49.3 Python Mechanism: Fixtures — Dependency Injection for Tests

A pytest **fixture** (a function decorated `@pytest.fixture`) provides setup (and, via `yield`, teardown, exactly companion §3.2 and §20.4's guaranteed-cleanup context-manager pattern) that test functions can request simply by naming the fixture as a parameter — pytest resolves and injects it automatically, directly the same dependency-injection mechanism companion §20.2 established for FastAPI's own `Depends(...)`, now applied to the testing framework itself rather than the application. This is precisely why a codebase already comfortable with FastAPI's dependency injection tends to find pytest fixtures immediately familiar rather than a new concept to learn from scratch.

### 49.4 Decision Framework: Fixture Scope Controls How Often Expensive Setup Actually Runs

A fixture's `scope` parameter (`function` — the default, re-run for every single test; `module` — once per test file; `session` — once for the entire test run) directly trades isolation against speed: a `function`-scoped database-connection fixture guarantees each test starts from a clean, independent state (maximal isolation, safest default) but re-pays connection-setup cost on every single test; a `session`-scoped fixture (an expensive-to-start test database container, companion §51's Testcontainers) pays that cost once for the whole run, at the cost of tests needing to be more careful about not leaving state behind that could affect a later test sharing the same fixture instance.

### 49.5 Python Mechanism: `pytest.mark.parametrize` — One Test Function, Many Input/Expected-Output Pairs

`@pytest.mark.parametrize("input,expected", [(...), (...), ...])` runs the same test function body once per listed argument tuple — directly implementing companion §118's table-driven testing discipline for edge cases (companion AI Systems Handbook §120's "acceptance criteria" pattern for hands-on labs is a closely related idea) without duplicating near-identical test function bodies for every individual case, and with pytest reporting exactly which specific parameter combination failed, not just that "the test" failed somewhere among several duplicated near-copies.

### 49.6 Tradeoff: `TestClient` Lets You Test a FastAPI Application Without Actually Running a Server

FastAPI's `TestClient` (built on `httpx`, §32.2) sends real, fully-formed requests through the actual ASGI application (§16.3) — including routing, dependency resolution (§20), and Pydantic validation (§21) — entirely in-process, with no real network socket, no separate running server process, and no real port binding at all. This means route-level integration tests run fast (no network latency) while still exercising the genuine, complete request-handling path, a meaningfully stronger guarantee than a pure unit test of an isolated handler function called directly, since `TestClient` tests confirm the *whole* wiring (middleware, dependencies, validation) works together, not just one function's own internal logic in isolation.

### 49.7 Implementation

```python
import pytest
from fastapi.testclient import TestClient
from myapp.main import app

# FIXTURE (§49.3) -- other tests just name `client` as a parameter to get it
@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_booking_payload():
    return {"seat_id": "s-1", "booking_date": "2026-08-01"}


def test_create_booking_success(client, sample_booking_payload):
    response = client.post("/bookings", json=sample_booking_payload)
    assert response.status_code == 201
    assert response.json()["seat_id"] == "s-1"


def test_create_booking_missing_field(client):
    response = client.post("/bookings", json={"seat_id": "s-1"})   # missing
    assert response.status_code == 422                              # booking_date


# PARAMETRIZED (§49.5) -- one function, several distinct input/expected pairs
@pytest.mark.parametrize(
    "booking_date,expected_status",
    [
        ("2026-01-01", 201),          # a valid, future date
        ("2020-01-01", 422),          # a past date -- rejected by validation
        ("not-a-date", 422),          # malformed input entirely
    ],
)
def test_create_booking_date_validation(client, booking_date, expected_status):
    response = client.post("/bookings", json={"seat_id": "s-1", "booking_date": booking_date})
    assert response.status_code == expected_status
```

`client` and `sample_booking_payload` are both fixtures — `test_create_booking_success` requests both simply by naming them as parameters, and pytest resolves and supplies them automatically (§49.3), directly mirroring FastAPI's own `Depends(...)` pattern. The parametrized `test_create_booking_date_validation` runs three times, once per tuple, with pytest's failure output identifying exactly which specific `booking_date` value produced an unexpected status if any of the three fail — a meaningfully more informative failure report than three separately-named, largely-duplicated test functions would provide.

### 49.8 Production Considerations

Fixture scope (§49.4) should be chosen deliberately per fixture, not defaulted uniformly to `function` scope everywhere out of an abundance of caution — a `session`-scoped database container fixture combined with per-test transaction rollback (companion §27's transaction mechanism, used here specifically as a test-isolation tool: begin a transaction before each test, roll it back after, regardless of what the test did) achieves both the speed of shared expensive setup *and* the isolation guarantee of a clean state per test, a common, high-value pattern worth knowing explicitly rather than reinventing per project. `TestClient`-based tests (§49.6), while fast and thorough, still don't replace genuine integration tests against a *real* database and *real* external dependencies (companion §51) — a `TestClient` test with a mocked-out repository layer confirms the FastAPI wiring itself works, not that your actual SQL queries are correct against a real PostgreSQL instance.

### 49.9 Debugging

**Symptoms:** A test passes in isolation but fails when the full test suite runs together; a fixture appears to run far more (or far less) often than expected, affecting either test speed or test isolation. **Investigation:** For suite-order-dependent failures, check for shared, non-function-scoped fixture state that one test is mutating in a way a later test unexpectedly depends on or is broken by (companion §117.7's exact shared-mutable-test-state flaky-test cause, now diagnosed specifically via pytest's fixture-scope mechanism). For unexpected fixture frequency, check the fixture's actual declared `scope` against what the test author intended. **Root cause:** An overly-broad fixture scope allowing state to leak between tests that should be isolated from each other; or a scope narrower than intended, silently re-paying expensive setup cost on every single test unnecessarily. **Fix:** Narrow fixture scope (or add explicit teardown/reset logic) for state that must not leak between tests; broaden scope deliberately, paired with an explicit per-test isolation mechanism (transaction rollback, §49.8) where expensive shared setup is safe to reuse.

### 49.10 Interview Thinking

"How would you test a FastAPI endpoint without running a real server?" is testing whether `TestClient` (§49.6) is your default answer, with an explicit understanding that it exercises the real ASGI application in-process rather than being a lighter-weight, less-thorough stand-in — a strong answer also distinguishes this from pure unit tests of isolated handler or service functions (companion §45.9's pattern), correctly identifying both as valuable but testing genuinely different things.

### 49.11 Mini Lab

Set up a minimal FastAPI application with one POST endpoint accepting a Pydantic model with a date field validated to reject past dates (companion §21.6's `field_validator` pattern). Write the `client` fixture and at least four parametrized test cases via `pytest.mark.parametrize` covering a valid date, a past date, a malformed date string, and a missing required field — confirm all four produce the correct, distinct status codes, and deliberately break one case (change the expected status to a wrong value) to observe pytest's detailed assertion-rewriting failure output.

---
