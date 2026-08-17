## 52. Contract, Performance & Load Testing

### 52.1 The Problem: §49-51 Confirmed Correctness; This Chapter Confirms Compatibility and Capacity

Companion §118.2 and §118.5 established *why* contract testing and load/performance testing matter generally. This chapter provides the Python-specific mechanisms for both: verifying your API's actual contract against what real consumers depend on, and verifying your application can actually sustain its expected real-world traffic before that traffic ever arrives in production.

### 52.2 Python Mechanism: Consumer-Driven Contract Testing With Pact

The `pact-python` library implements companion §118.2's consumer-driven contract pattern concretely: a **consumer test** (written by, or on behalf of, the team consuming your API) generates a **pact file** — a precise, machine-readable record of the exact requests it makes and the exact responses it expects — and a separate **provider verification test**, run against your actual FastAPI application (using `TestClient`, companion §49.6), replays every recorded interaction from that pact file and confirms your real API still produces a response matching what the consumer actually depends on. This closes the exact gap companion §118.2 identified: your own test suite can now fail *specifically* when a change breaks a real, documented consumer expectation, not only when it breaks your own internal assumptions about your API's shape.

### 52.3 Decision Framework: When Contract Testing Is Worth Its Setup Cost

Contract testing's value scales directly with the number of independently-deployed consumers depending on your API's exact shape — for a backend with one tightly-coupled frontend deployed in lockstep with it, the coordination cost contract testing solves may not yet exist as a real problem (companion §108.10's proportionality principle, again); for a backend serving multiple independent consumers (several frontend clients, partner integrations, other internal services) that deploy on their own separate schedules, contract testing becomes a genuinely high-leverage investment, directly preventing the class of silent-breakage incident companion §118.2 describes.

### 52.4 Python Mechanism: Locust — Simulating Real, Concurrent User Load

**Locust** defines simulated user behavior as Python code (a class describing a sequence of requests a "user" makes, with realistic think-time between them) and then runs many simulated users concurrently against a target application, measuring actual response times and failure rates under that load — directly implementing companion §118.5's "testing in production... in a controlled way" principle, but applied to a staging or dedicated load-testing environment specifically for the purpose of finding capacity limits *before* real production traffic does.

### 52.5 Decision Framework: What Load Profile Actually Answers Your Real Capacity Question

A flat, constant load test (simulate exactly 100 concurrent users, indefinitely) answers "can the system sustain this specific, steady load" — useful, but doesn't answer the arguably more common real question: what happens as load *increases*, and specifically where does the system's behavior start to degrade. A **ramping load test** (gradually increasing simulated user count over the test's duration) is generally more informative for genuine capacity planning (companion §56, applied here with actual measured data rather than pure theoretical estimation) — it directly reveals the specific point (a specific concurrent-user count, a specific requests-per-second rate) where latency starts climbing sharply or error rates start rising, which is the number that actually matters for capacity planning, not just confirmation that one arbitrarily-chosen load level happens to work.

### 52.6 Implementation

```python
# Contract test (provider side) -- pact_python, simplified illustration
from pact import Verifier

def test_verify_booking_api_against_consumer_contracts():
    verifier = Verifier(
        provider="seat-management-api",
        provider_base_url="http://localhost:8000",
    )
    # Replays every interaction recorded in the consumer's pact file against
    # the REAL running application (§52.2) -- fails if the actual response
    # no longer matches what the consumer genuinely depends on.
    success, _ = verifier.verify_pacts("./pacts/frontend-seat-management-api.json")
    assert success


# Load test -- Locust
from locust import HttpUser, task, between

class BookingUser(HttpUser):
    wait_time = between(1, 3)          # realistic "think time" between
                                          # actions, not back-to-back
                                          # requests with zero pause

    def on_start(self):
        response = self.client.post("/auth/login", json={"user": "test", "pass": "test"})
        self.token = response.json()["access_token"]

    @task(3)                            # weighted: this action happens
    def view_available_seats(self):      # 3x more often than book_a_seat
        self.client.get(
            "/floors/1/seats?start_date=2026-08-01&end_date=2026-08-01",
            headers={"Authorization": f"Bearer {self.token}"},
        )

    @task(1)
    def book_a_seat(self):
        self.client.post(
            "/bookings",
            json={"seat_id": "s-1", "booking_date": "2026-08-01"},
            headers={"Authorization": f"Bearer {self.token}"},
        )

# Run with: locust -f this_file.py --host=http://localhost:8000
# --users 500 --spawn-rate 10  (ramps up to 500 concurrent simulated users,
# 10 new ones per second -- a ramping load profile, §52.5)
```

`test_verify_booking_api_against_consumer_contracts` replays a real consumer's recorded expectations against your actual running application — this test genuinely fails the moment a backend change breaks something a real frontend team depends on, closing companion §118.2's exact gap concretely. `BookingUser`'s `@task(3)`/`@task(1)` weighting and `wait_time = between(1, 3)` together simulate a realistic traffic mix (viewing seats happening more often than booking one, with human-like pauses between actions) rather than an unrealistic, maximally-aggressive hammering of every endpoint equally and continuously — a more informative, production-representative load profile than a naive uniform stress test would produce.

### 52.7 Production Considerations

Contract tests should run in CI on every backend change, specifically *before* deployment (companion §46's versioning discipline, and companion Software Systems Handbook §118.2's guidance both apply directly) — a contract violation caught in CI, before a broken deployment ever reaches production, is dramatically cheaper to fix than the same violation discovered by an actual consumer's own production incident. Load tests should be run against an environment genuinely representative of production capacity (the same instance sizing, the same database tier) — a load test run against a smaller, cheaper staging environment will find a lower capacity ceiling than production actually has, which can be either falsely alarming or, worse, falsely reassuring if staging happens to be *larger* than production for unrelated cost reasons, making environment-parity (companion §118.4) just as relevant here as for correctness-focused integration testing.

### 52.8 Debugging

**Symptoms:** A backend deployment that passed all its own tests breaks a specific frontend or partner integration in production; a load test shows acceptable average response times but production still experiences real capacity-related incidents under comparable traffic. **Investigation:** For the broken-integration case, check whether a contract test exists for that specific consumer, and if not, this is the actual gap (companion §118.2's exact diagnosis) — add one going forward rather than only fixing this one instance reactively. For the load-test-vs-production mismatch, check whether the load test measured percentile latencies (companion §54, §58) or only averages, and whether the load profile's request mix (§52.5's weighting) genuinely matched production's actual traffic pattern rather than an arbitrary, unrepresentative simulation. **Root cause:** A missing contract test for the specific broken consumer relationship; a load test whose profile or metrics didn't actually represent the real production traffic pattern that later caused an incident. **Fix:** Add a contract test for every genuinely independent consumer relationship, run in CI before every deployment; redesign the load test's user behavior and measured metrics (percentiles, not just averages) to more accurately mirror real production traffic characteristics.

### 52.9 Interview Thinking

"How would you find out how much traffic your API can actually handle before it degrades?" is testing whether ramping load testing (§52.4-52.5) with percentile-based measurement is your default approach, rather than a single fixed-load test or, worse, purely theoretical capacity estimation with no actual measured data behind it — a strong answer explicitly names the specific signal (the load level where p95/p99 latency or error rate begins climbing sharply) as the actual, useful output of this exercise.

### 52.10 Mini Lab

Write a minimal Locust `HttpUser` class targeting a small local FastAPI application (any endpoint from an earlier chapter works), with at least two weighted tasks and a realistic `wait_time`. Run it with a ramping `--users`/`--spawn-rate` configuration against your local application and observe Locust's own reporting (response time percentiles, requests per second, failure rate) as simulated load increases — identify, from the actual data Locust produces, the approximate point where your local application's response times begin degrading noticeably.

---
