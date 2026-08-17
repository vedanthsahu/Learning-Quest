## §128. pytest Fluency: Fixtures, Parametrize, and Mocking

### 1. The Vocabulary

- **Fixture (`@pytest.fixture`)** — a reusable setup (and optional teardown) function that tests
  request by naming it as a parameter — a test database session, a fake client, a sample object —
  without repeating the setup code in every test.
- **`@pytest.mark.parametrize`** — runs the same test function multiple times with different input
  values, turning what would be five near-identical test functions into one function plus a table
  of cases.
- **Mock / patch (`unittest.mock`)** — replaces a real object or function with a fake one for the
  duration of a test, so a test can assert "this was called with X" without actually calling a
  real external service.
- **Fixture scope (`function`, `module`, `session`)** — controls how often a fixture is torn down
  and recreated; a `session`-scoped database connection is set up once for the whole test run
  instead of once per test.

### 2. Where It Sits, and Why Teams Use It

pytest's fixture system exists to solve test setup duplication without resorting to inheritance-
heavy test base classes. Parametrize exists so testing "does this function handle five different
edge-case inputs correctly" doesn't require five copy-pasted test functions that all drift out of
sync over time. Mocking exists so a unit test of business logic doesn't need a real database,
real network access, or a real third-party API key to run — it isolates the thing actually being
tested from everything around it.

### 3. What Actually Breaks

- **Fixtures with the wrong scope** — a `session`-scoped fixture holding mutable state that one
  test modifies leaks that state into every other test that shares it, producing order-dependent
  test failures that are miserable to debug.
- **Over-mocking** — mocking so much of a function's dependencies that the test only verifies the
  mocks were called correctly, not that the code actually does the right thing — a test that passes
  even when the real logic is broken.
- **Not parametrizing edge cases** — a single happy-path test for a function that clearly has
  several distinct branches (empty input, negative number, boundary value) leaves those branches
  completely unverified.
- **Flaky tests from real I/O or real time** — a test that hits a real external API, or asserts on
  exact timing, fails intermittently for reasons that have nothing to do with the code being
  correct or not (see §77 for the full flaky-test taxonomy).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use fixtures to share setup, not to hide what a test actually depends on — I keep fixture
  scope as narrow as correctness allows to avoid state leaking between tests."
- "I parametrize instead of copy-pasting near-identical tests for different inputs, especially for
  edge cases like empty, negative, or boundary values."
- "I mock external dependencies — network calls, third-party APIs, real time — but I'm careful not
  to mock so much that the test stops verifying real behavior."

### 5. Interview-Ready Answer

> "I lean on fixtures for shared setup and try to keep their scope as narrow as correctness allows,
> since a broadly-scoped fixture with mutable state is a common source of order-dependent test
> failures. I use `parametrize` for edge cases instead of writing near-duplicate test functions,
> and I mock real external dependencies — network calls, third-party services — specifically so
> unit tests don't depend on real infrastructure being available, while being careful not to mock
> so much of the code path that the test only checks that mocks were called, not that the logic is
> actually correct."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §49 (Testing Philosophy & pytest Fundamentals)
chapter for the full fixture/mocking patterns used across the "Fieldnote" capstone; this book's
§76-78 (testing types, flaky tests, load testing) for the surrounding testing-strategy context.

---
