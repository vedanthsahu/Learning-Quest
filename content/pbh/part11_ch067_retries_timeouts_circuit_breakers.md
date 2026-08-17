## 67. Retries, Timeouts & Circuit Breakers

### 67.1 The Problem: §32's Retry Logic Handles Transient Failures Well; It Has No Answer for a Sustained Outage

Companion §32.7 flagged the gap directly: retry-with-backoff (companion §32.4-32.6) is the right response to a brief, transient failure, but applied against a dependency that's genuinely, sustainedly down, every single request still attempts the full retry sequence before failing — multiplying load against an already-struggling dependency, and adding the full retry-and-backoff latency to every single caller during the entire outage window. A **circuit breaker** is the missing piece: a mechanism that stops attempting calls at all, quickly and cheaply, once a dependency has clearly, sustainedly failed.

### 67.2 Python Mechanism: The Three Circuit Breaker States

A circuit breaker is a state machine with three states: **closed** (normal operation — calls pass through to the real dependency, failures are counted); **open** (the dependency has failed enough times recently to be presumed down — calls fail immediately, without even attempting the real dependency, for a cooldown period); **half-open** (after the cooldown, a single trial call is allowed through to test whether the dependency has recovered — success transitions back to closed, failure transitions back to open for another cooldown period). This is precisely companion §120.6's lab exercise, now given its full, explained implementation in this chapter.

### 67.3 Decision Framework: Circuit Breakers Complement Retries; They Don't Replace Them

A retry (companion §32.4) handles "this one specific call might succeed on a second attempt" — appropriate when failures are expected to be independent and transient. A circuit breaker handles "this dependency has been failing repeatedly and consistently — stop trying for a while" — appropriate specifically once a pattern of sustained failure, not just an isolated one, has been observed. A mature resilience strategy layers both: retry a small number of times with backoff for genuine transient blips, but have the circuit breaker open and stop *even attempting* retries once the underlying dependency has clearly moved from "occasionally flaky" to "sustainedly down" — the two mechanisms operate at different time-scales and answer different questions, and a system with only one or the other is missing real protection the other specifically provides.

### 67.4 Engineering Constraint: Circuit Breaker State Must Be Coordinated Across Instances for Real Effectiveness at Scale

A circuit breaker's state, if kept purely in-process (companion §16.8's per-process-memory constraint), means each of your application's many instances independently discovers the same downstream outage and independently opens its own circuit — functionally workable, but with redundant, uncoordinated failure-detection overhead across the fleet, and no shared, fleet-wide view of a dependency's actual health. For a genuinely production-scale deployment, sharing circuit-breaker state via Redis (§35's exact distributed-coordination mechanism, applied here) lets the *first* instance to detect a sustained failure open the circuit fleet-wide, sparing every other instance from independently rediscovering the same outage through their own repeated failed attempts.

### 67.5 Tradeoff: Threshold and Cooldown Tuning Directly Trade False Positives Against Slow Detection

A circuit breaker that opens after too few failures (a low failure-count threshold) risks opening in response to genuinely isolated, unrelated failures rather than a real sustained outage — a false positive that unnecessarily blocks calls to a dependency that was actually fine. A threshold set too high, or a cooldown period too long, delays real protection during a genuine sustained outage, or delays recovery detection once the dependency genuinely comes back. This tuning, like every other resilience-parameter tuning in this handbook (rate-limit thresholds, companion §61.7; timeout values, companion §32.4), should be informed by the specific dependency's actual observed failure patterns (companion §65's metrics) rather than a generic, unexamined default applied uniformly to every dependency regardless of its real behavior.

### 67.6 Implementation

```python
import time
from enum import Enum, auto

class CircuitState(Enum):
    CLOSED = auto()
    OPEN = auto()
    HALF_OPEN = auto()


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, cooldown_seconds: float = 30):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.opened_at: float | None = None

    def _should_attempt(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if time.monotonic() - self.opened_at >= self.cooldown_seconds:
                self.state = CircuitState.HALF_OPEN   # §67.2: cooldown
                return True                              # elapsed, allow ONE
            return False                                  # trial call
        return True   # HALF_OPEN: allow the trial call through

    async def call(self, func, *args, **kwargs):
        if not self._should_attempt():
            raise CircuitOpenError("Circuit is open -- failing fast, not calling dependency")

        try:
            result = await func(*args, **kwargs)
        except Exception:
            self.failure_count += 1
            if self.state == CircuitState.HALF_OPEN or self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN            # trial failed, OR
                self.opened_at = time.monotonic()           # threshold exceeded
                self.failure_count = 0
            raise
        else:
            self.state = CircuitState.CLOSED               # success -- fully
            self.failure_count = 0                            # reset (§67.2)
            return result


class CircuitOpenError(Exception): ...


# Usage: layered with retry (§67.3), NOT a replacement for it
booking_api_breaker = CircuitBreaker(failure_threshold=5, cooldown_seconds=30)

async def call_downstream_with_resilience(payload: dict):
    return await booking_api_breaker.call(call_with_retry, url="...", json_payload=payload)

async def call_with_retry(url, json_payload): ...
```

`_should_attempt` implements §67.2's three-state logic directly: `CLOSED` always attempts; `OPEN` fails immediately unless the cooldown has elapsed, in which case it transitions to `HALF_OPEN` and allows exactly one trial call; `HALF_OPEN`'s single trial call's outcome (in `call`'s except/else branches) decides whether to return fully to `CLOSED` (success) or back to `OPEN` for another full cooldown (failure). `call_downstream_with_resilience` demonstrates §67.3's layering explicitly — `booking_api_breaker.call` wraps `call_with_retry` (companion §32.6's retry-with-backoff function), meaning a call must exhaust its retries *and* the circuit must still be closed for it to reach the actual dependency at all; once the circuit opens, it stops even attempting the retry sequence entirely, failing fast instead.

### 67.7 Production Considerations

A circuit breaker's `open` state should have an associated, clearly user-facing fallback behavior at the calling code's boundary — failing fast with `CircuitOpenError` internally is correct, but the API layer (companion §46.2's centralized exception handling) should translate this into a clear, honest response to the end user (a "service temporarily degraded" message, or a cached/default result if one exists and is appropriate) rather than a generic 500 error indistinguishable from a genuine, unexpected bug. Circuit breaker state transitions (open, half-open, closed) should themselves be logged and emitted as metrics (companion §64-65) — an operator should be able to see, at a glance, which specific dependencies have open circuits right now and how frequently a given circuit has been opening recently, since a circuit opening repeatedly is itself a strong, actionable signal about that dependency's actual reliability trend.

### 67.8 Debugging

**Symptoms:** A downstream dependency's outage causes cascading slowness across many unrelated features that happen to call it, well beyond the outage's own direct scope; a circuit breaker seems to never open despite a dependency being genuinely, observably down. **Investigation:** For cascading slowness, check whether a circuit breaker exists at all for that specific dependency, or whether every call is still attempting the full retry-and-timeout sequence during the outage (§67.1's exact unmitigated scenario). For a circuit that never opens, check the configured failure threshold and cooldown against the dependency's actual failure rate and pattern — a threshold set too high relative to actual traffic volume may simply never be reached within any reasonable time window. **Root cause:** Missing circuit-breaker protection, allowing an outage's cost to compound across every caller for the outage's full duration; a threshold/cooldown configuration mismatched to the dependency's actual failure characteristics. **Fix:** Add circuit-breaker protection (§67.6) layered around the existing retry logic for any dependency whose sustained failure could otherwise cascade; re-tune threshold and cooldown based on the dependency's actual observed failure patterns (§67.5, §67.7's metrics).

### 67.9 Interview Thinking

"Your service calls a downstream API that occasionally goes down for extended periods — how do you prevent this from degrading your entire service?" is testing whether the circuit breaker pattern (§67.2) is your answer, specifically distinguished from retry logic alone (§67.3) — a strong answer explains why retries alone are insufficient for a *sustained* outage (they still pay the full retry-and-timeout cost on every single call throughout the outage) and describes the three-state mechanism precisely, not just the pattern's name.

### 67.10 Mini Lab

Implement `CircuitBreaker` as in §67.6, wrapping a simulated dependency function that can be toggled to always fail or always succeed (a simple flag your test controls). Confirm the circuit opens after the configured failure threshold is reached, correctly fails fast (raising `CircuitOpenError` without even attempting the underlying function) while open, transitions to half-open after the cooldown elapses, and correctly closes again once a trial call succeeds — walk through all three state transitions explicitly and confirm each one via a direct test assertion on `breaker.state`.

---
