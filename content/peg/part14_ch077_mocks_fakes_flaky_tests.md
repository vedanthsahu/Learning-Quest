## §77. Mocks, Fakes, and Flaky Tests

### 1. The Vocabulary

- **Mock** — a fake object that records how it was called and lets a test assert on that
  interaction, often returning canned responses.
- **Fake** — a simplified but genuinely working implementation (an in-memory database instead of
  a real one), rather than just a recorder of calls.
- **Testcontainers** — a library pattern for spinning up real, disposable dependencies (an actual
  database, an actual queue) in a container for integration tests, rather than mocking them.
- **Flaky test** — a test that sometimes passes and sometimes fails with no code change,
  undermining trust in the whole suite.

### 2. Where It Sits, and Why Teams Use It

Mocks and fakes exist to make tests fast and independent of real infrastructure; the tradeoff is
that a mock/fake that doesn't accurately reflect the real thing's behavior can make a test pass
while the real system would fail — exactly the gap integration tests and testcontainers exist to
close.

### 3. What Actually Breaks

- **Over-mocking** — mocking so many collaborators that a test mostly verifies "did I call the
  mock correctly" rather than "does the actual logic work," providing false confidence.
- **A fake that's drifted from the real implementation's actual behavior** — an in-memory fake
  database that doesn't enforce the same constraints or ordering as the real one can let bugs pass
  in tests that would fail against production data.
- **Flaky tests being ignored or auto-retried instead of fixed** — a team that gets used to
  "just rerun it, it's flaky" stops trusting the test suite's signal entirely, and a flaky test
  can be hiding a real, intermittent bug rather than being purely a test-infrastructure problem.
- **Time-dependent or order-dependent tests** — tests that rely on wall-clock time, external
  service availability, or running in a specific order are a common, avoidable source of
  flakiness.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use mocks sparingly, specifically for genuinely external or slow dependencies, not as a
  default for every collaborator."
- "For anything where the real dependency's behavior actually matters, I'd reach for a real,
  disposable instance via testcontainers rather than a fake that might drift from reality."
- "A flaky test gets investigated and fixed, not silently retried forever — it might be revealing
  a real intermittent bug."

### 5. Interview-Ready Answer

> "I use mocks and fakes deliberately, not by default — mocking every collaborator can leave a
> test verifying interactions with the mock rather than real behavior. For anything where the real
> dependency's actual behavior matters, like a database's specific constraints, I'd rather use a
> real, disposable instance via testcontainers than a fake that might not accurately reflect it.
> And a flaky test is a signal worth investigating, not something to just retry into passing — it
> might be surfacing a genuine intermittent bug."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §49 (Testing Philosophy & pytest Fundamentals)
chapter and companion Python Backend Engineering Handbook's §51 (Integration, API & Database
Testing) chapter.

---
