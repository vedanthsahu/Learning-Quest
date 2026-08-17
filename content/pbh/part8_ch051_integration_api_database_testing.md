## 51. Integration, API & Database Testing (Testcontainers)

### 51.1 The Problem: Fakes Prove Your Logic Is Correct Against an Assumed Contract; They Don't Prove the Real Dependency Honors That Contract

§50.8 already flagged the risk directly: a fake repository can diverge from what the real database actually enforces (a unique constraint, a specific isolation-level behavior, companion §27) — no amount of fake-based unit testing can catch a bug that only manifests against the real system's actual behavior. **Integration tests**, run against a genuinely real (if disposable) instance of the actual dependency, are the only way to validate that assumption itself, closing exactly the gap unit tests against fakes structurally cannot close.

### 51.2 Engineering Constraint: A Shared, Persistent Test Database Is a Recurring Source of Flaky, Order-Dependent Tests

Running integration tests against a long-lived, shared test database (one database instance that every developer's test run and every CI run reuses) reintroduces companion §117.7's exact shared-mutable-state flaky-test risk at the infrastructure level — one test's leftover data affecting another test's results depending on run order, or two CI jobs running concurrently against the same shared database corrupting each other's test data entirely. This is a genuine, recurring, and avoidable operational problem, not a hypothetical one.

### 51.3 Python Mechanism: Testcontainers — A Fresh, Real Database Instance Per Test Run (or Per Test)

**Testcontainers** (the `testcontainers` Python library) programmatically starts a real, disposable instance of a dependency (PostgreSQL, Redis, RabbitMQ) inside a Docker container specifically for the duration of a test session, and tears it down afterward — every test run gets a genuinely fresh, isolated, real instance of the actual dependency, structurally eliminating §51.2's shared-state risk entirely, since there is no shared, persistent instance to begin with. This is the standard, current-best-practice mechanism for integration testing against real infrastructure without paying either the flakiness cost of a shared instance or the unreliability cost of hand-mocking behavior a fake might get subtly wrong.

### 51.4 Decision Framework: Session-Scoped Container, Per-Test Transaction Rollback — Combining Speed and Isolation

Starting a fresh Testcontainers-managed PostgreSQL container *per individual test* would be correctly isolated but prohibitively slow (container startup cost paid on every single test). The practical, standard pattern (directly extending companion §49.8's fixture-scope guidance): start the container **once per test session** (a `session`-scoped fixture, §49.4), but wrap each individual test in its own database transaction that's rolled back after the test completes (companion §27's transaction mechanism, used purely as a test-isolation tool here) — every test starts from the same clean schema state and any writes it makes are invisible to every other test, at the cost of only one container startup for the entire run, not one per test.

### 51.5 Python Mechanism: Testing the Full Stack — `TestClient` Against Real Repositories Backed by a Testcontainers Database

Combining companion §49.6's `TestClient` with a real, Testcontainers-backed database (rather than a fake, §50.3) produces the strongest practical test: a real HTTP request, through real routing and dependency injection, hitting real repository code, executing real SQL, against a real (if disposable) PostgreSQL instance — the closest a test can get to production behavior while remaining fully automated, fast enough for routine CI use, and completely isolated from any other test or environment.

### 51.6 Implementation

```python
import pytest
from testcontainers.postgres import PostgresContainer
import psycopg2

@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16") as container:   # real Postgres,
        yield container                                     # started ONCE for
                                                                # the whole session
                                                                # (§51.4)


@pytest.fixture(scope="session")
def db_connection(postgres_container):
    conn = psycopg2.connect(postgres_container.get_connection_url())
    run_schema_migrations(conn)             # apply the real schema once
                                              # (companion §28)
    yield conn
    conn.close()


@pytest.fixture
def db_transaction(db_connection):
    """Per-test isolation via rollback (§51.4) -- runs for EVERY test,
    but the expensive container/connection above is shared."""
    with db_connection.cursor() as cur:
        cur.execute("BEGIN")
    yield db_connection
    db_connection.rollback()                # undoes whatever THIS test wrote


def test_book_seat_integration(db_transaction):
    seat_repository.insert_seat(db_transaction, seat_id="s-1", floor_id="f-1")
    result = booking_repository.insert_booking(
        db_transaction, seat_id="s-1", booking_date="2026-08-01", user_id="u-1"
    )
    assert result["id"] is not None    # a REAL insert, against REAL Postgres,
                                          # exercising the ACTUAL SQL (§51.1),
                                          # rolled back automatically after (§51.4)


def run_schema_migrations(conn): ...
class seat_repository: ...
class booking_repository: ...
```

`postgres_container` starts one real, disposable PostgreSQL instance for the entire test session — every subsequent test in the suite reuses it, avoiding per-test container-startup cost. `db_transaction`, by contrast, is `function`-scoped (the default, companion §49.4) and wraps every individual test in its own `BEGIN`/`rollback()` pair, meaning `test_book_seat_integration`'s real `INSERT` genuinely happens against real Postgres and is genuinely visible to that test's own subsequent queries within the same transaction, but is completely invisible to and undone before any other test runs (§51.4's combined speed-and-isolation pattern).

### 51.7 Production Considerations

Testcontainers-based integration tests require Docker (or an equivalent container runtime) available in every environment running them, including CI — this is a genuine infrastructure dependency for the test suite itself, not just the application, and CI pipeline configuration must account for it explicitly (most major CI providers support Docker-in-Docker or an equivalent natively, but it's a setup step that must actually be verified, not assumed). Integration tests are, by nature, slower than fake-backed unit tests (companion §50) even with §51.4's optimization — a healthy test suite typically runs many more fast, fake-backed unit tests than slower integration tests, using the integration tests specifically to validate the genuine boundary-crossing behavior (real SQL against a real schema) that fakes cannot validate, rather than duplicating every unit test's coverage at the integration level redundantly.

### 51.8 Debugging

**Symptoms:** Integration tests pass locally but fail intermittently in CI, or vice versa; a test suite's total runtime grows sharply as more integration tests are added, disproportionate to the number of tests. **Investigation:** For environment-specific intermittent failures, check whether tests genuinely use per-test transaction rollback (§51.4) or whether some tests write data that isn't correctly rolled back, leaking state into subsequent tests specifically under CI's different execution ordering or parallelism. For runtime growth, check whether the container-startup cost is genuinely amortized session-wide (§51.4) or whether some fixture inadvertently starts a fresh container per test. **Root cause:** Incomplete or missing transaction rollback allowing state leakage between tests; a fixture scope narrower than intended, re-paying expensive container-startup cost far more often than necessary. **Fix:** Audit every integration test's cleanup path to confirm rollback genuinely undoes all writes; correct fixture scope to share the expensive container/connection setup across the full test session while still isolating individual tests via transaction rollback.

### 51.9 Interview Thinking

"How would you test that your repository's SQL queries actually work correctly, not just that your business logic calls them correctly?" is testing whether you distinguish fake-backed unit tests (companion §50, validate logic against an assumed contract) from Testcontainers-backed integration tests (§51.1, §51.3, validate the contract itself against real infrastructure) — a strong answer explains why neither replaces the other, and both belong in a complete test suite for genuinely different reasons.

### 51.10 Mini Lab

Set up a `postgres_container` session-scoped fixture and a `db_transaction` per-test fixture as in §51.6, against a minimal real schema (a `seats` and `bookings` table). Write two integration tests: one inserting and then querying a seat, confirming the round-trip works against real Postgres; a second, separate test that queries for seats and confirms none exist (proving the first test's insert was correctly rolled back and didn't leak into this second test) — directly confirming §51.4's isolation guarantee yourself, not just trusting the pattern's description.

---
