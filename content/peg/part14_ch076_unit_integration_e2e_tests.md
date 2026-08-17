## §76. Unit, Integration, and End-to-End Tests

### 1. The Vocabulary

- **Unit test** — tests one small piece of code (a function, a class) in isolation.
- **Integration test** — tests multiple pieces working together (a service talking to a real
  database).
- **End-to-end (E2E) test** — tests the whole system as a user would actually experience it, often
  through the real UI or API surface.
- **Test pyramid** — the general guideline of having many fast unit tests, fewer integration
  tests, and few, slower E2E tests — because cost and flakiness increase as you go up the
  pyramid.

### 2. Where It Sits, and Why Teams Use It

Each layer catches a different class of bug and has a different cost profile — unit tests are
cheap and fast but can't catch integration issues; E2E tests catch real issues but are slow,
brittle, and expensive to maintain. A healthy test suite is deliberately shaped, not just "as many
tests as possible."

### 3. What Actually Breaks

- **An inverted test pyramid (mostly E2E, few unit tests)** — slow test suites, flaky failures
  that are hard to diagnose (was it a real bug, or a timing issue in the E2E test itself?), and
  long CI feedback loops.
- **Unit tests that mock so much they don't actually test anything meaningful** — a unit test with
  every dependency mocked can pass even when the real integration between those pieces is
  completely broken; it's testing the mocks' behavior, not the code's.
- **No integration tests at all** — unit tests pass, E2E tests are too slow/rare to run often, and
  the gap in between (does this code actually work with a real database, a real external API) goes
  uncovered until it breaks in a later environment.
- **Treating 100% code coverage as the goal** — coverage measures whether a line executed, not
  whether it was meaningfully tested; chasing the number can produce tests that pad coverage
  without actually verifying behavior.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I aim for a healthy pyramid shape — lots of fast unit tests, a meaningful layer of integration
  tests, and a smaller, more selective set of E2E tests for critical user flows."
- "I'm suspicious of a unit test that mocks so much it's not really testing the interaction
  between real pieces anymore."
- "Code coverage is a useful signal, not a target — I care whether behavior is actually verified,
  not just whether a line executed."

### 5. Interview-Ready Answer

> "I think about tests in terms of the pyramid: lots of fast, cheap unit tests for individual
> logic, a solid layer of integration tests for how pieces actually work together — especially
> against a real database — and a smaller, selective set of end-to-end tests for the critical
> user flows that are worth the slower, more expensive coverage. An inverted pyramid, mostly E2E
> and few unit tests, is a common anti-pattern that leads to slow, flaky CI."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §49 (Testing Philosophy & pytest Fundamentals)
chapter and companion Python Backend Engineering Handbook's §51 (Integration, API & Database
Testing) chapter (pytest-specific patterns in full).

---
