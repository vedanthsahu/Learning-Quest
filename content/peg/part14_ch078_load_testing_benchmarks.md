## §78. Load Testing, Benchmarks, and Contract Testing

### 1. The Vocabulary

- **Load test** — deliberately sending high traffic at a system to see how it behaves under
  realistic or peak load before real users do.
- **Benchmark** — a controlled, repeatable measurement of a specific operation's performance,
  used to compare before/after or catch regressions.
- **Contract testing** — verifying that a service's actual API matches what its consumers expect,
  without needing to run the full consumer and provider together end-to-end.

### 2. Where It Sits, and Why Teams Use It

These answer questions unit and integration tests don't: does the system hold up under real
load, is a change actually faster or slower than before, and does an API still honor what its
consumers depend on — each requiring a different kind of test than "does this logic produce the
right output."

### 3. What Actually Breaks

- **Load testing against production, without warning anyone** — a load test can look
  indistinguishable from a real incident to on-call/monitoring if it's not coordinated and
  communicated ahead of time.
- **A load test that doesn't reflect real traffic patterns** — hammering one endpoint with
  identical requests tests something different from realistic, varied traffic; results from an
  unrealistic load test can be misleading about actual production readiness.
- **No benchmark baseline before a performance-sensitive change** — without a "before" number, a
  claim that a change improved performance is just an assertion, not a verified result.
- **No contract tests between services that evolve independently** — one team changes their API's
  response shape, a downstream consumer breaks, and nobody catches it until it's already deployed,
  because nothing verified the contract was actually still honored.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I coordinate and communicate load tests against shared environments, since they can look
  identical to a real incident from the outside."
- "I try to make load test traffic patterns resemble real usage, not just maximum requests against
  one endpoint."
- "For anything performance-sensitive, I benchmark before and after, rather than asserting an
  improvement without a measured baseline."
- "Between independently-evolving services, contract tests catch a broken API expectation before
  it reaches production, rather than after."

### 5. Interview-Ready Answer

> "Load testing answers 'does this hold up under real traffic,' benchmarking answers 'is this
> change actually faster or slower, measurably,' and contract testing answers 'does this API still
> honor what its consumers expect' — three different questions unit tests don't cover. The
> practical discipline for load testing specifically is coordinating it clearly, since an
> uncoordinated load test against a shared environment can look exactly like a real incident to
> whoever's on call."

### 6. Go Deeper

companion Software Systems Handbook's §50 (Performance Engineering Deep Dive) chapter
(benchmarking methodology in full).

---
