## 50. Fixtures, Mocks, Fakes & Parameterized Tests

### 50.1 The Problem: §49 Introduced the Mechanics; This Chapter Addresses the Actual Judgment Call — Which Test Double to Use, and When

Companion §117.4's general vocabulary (stub, mock, fake) needs a Python-specific implementation home, and — more importantly — the actual engineering judgment for choosing among them, and between them and pytest's fixture composition tools, is where most of the real skill in writing maintainable tests actually lives. This chapter develops both the Python mechanism and, more importantly, that judgment.

### 50.2 Python Mechanism: `unittest.mock` — `Mock`, `MagicMock`, and `patch`

Python's standard-library `unittest.mock` module provides `Mock`/`MagicMock` objects that accept any attribute access or method call, recording how they were called for later assertion (`mock.assert_called_once_with(...)`) — directly companion §117.4's "mock" vocabulary, concretely implemented. `patch` (as a decorator or context manager) temporarily replaces a real object/function with a `Mock` for the duration of a test, automatically restoring the original afterward — the standard mechanism for isolating a unit of code from a specific dependency (an external API call, companion §32) it would otherwise genuinely invoke during a test.

### 50.3 Decision Framework: A Fake Is Usually a Better Choice Than a Mock for Anything With Real Internal Behavior

A `MagicMock` standing in for a repository accepts any call and returns another `MagicMock` by default — it doesn't actually *behave* like a repository (it won't correctly reject a duplicate booking, for instance), meaning a test using it can only verify "was this method called," not "does the code correctly react to a realistic result from this dependency." A **fake** — a real, working, simplified implementation (companion §117.4's definition; here, a Python class satisfying the same Protocol, companion §43.4, as the real repository, backed by a plain in-memory dict instead of a real database) genuinely behaves correctly for the scenarios it's built to support, letting a test exercise real logic (does `book_seat` correctly raise `SeatAlreadyBookedError` when the fake repository already has a matching entry) rather than merely confirming a method was invoked.

### 50.4 Python Mechanism: Building a Fake Repository as a Protocol-Satisfying Test Double

Directly extending companion §43.7's `BookingRepository` Protocol, a **fake repository** is a small, real Python class implementing the same method signatures against an in-memory `dict` instead of a real database connection — no database, no SQL, no `psycopg2`, but genuinely correct behavior for exactly the operations the service layer under test needs. This is the concrete mechanism that makes companion §45.9's domain-layer unit tests, and this Part's own service-layer tests, run in milliseconds with zero external dependencies while still exercising real, correct logic rather than a hollow mock's recorded-call-count alone.

### 50.5 Tradeoff: When a Mock Is Actually the Right Choice — Verifying an Interaction Happened, Not Its Correctness

A mock remains the right tool specifically when the test's actual concern is *whether a call happened at all* (did the code correctly call `send_email` after a successful booking) rather than the correctness of what that call does internally (companion §37's actual email-sending logic is tested separately, on its own) — using `patch` to replace `send_email` with a `Mock` and asserting `mock.assert_called_once_with(booking_id=...)` verifies exactly this interaction, cleanly, without needing a working fake email sender at all. The judgment: fakes for dependencies whose *behavior* the test needs to be correct (a repository whose stored-then-retrieved state the logic under test actually depends on); mocks for dependencies whose *invocation* is what matters (a notification side-effect the test only needs to confirm was triggered).

### 50.6 Python Mechanism: Fixture Composition — Fixtures Requesting Other Fixtures, and `autouse`

Fixtures can themselves request other fixtures as parameters (directly companion §20.3's dependency-chain-resolution mechanism, now within pytest) — a `booking_service` fixture can depend on a `fake_repository` fixture, letting every test needing a fully-wired `BookingService` simply request `booking_service` without re-wiring the fake repository into it manually each time. An `autouse=True` fixture runs automatically for every test in its scope without needing to be explicitly requested — useful for genuinely universal setup (resetting a global state, configuring logging for test output) but should be used sparingly, since implicit, unnamed setup a reader can't see at the individual test's parameter list is a real readability cost, worth paying only for setup that's genuinely universal and uninteresting to a reader's understanding of any *specific* test.

### 50.7 Implementation

```python
from unittest.mock import Mock, patch
import pytest

# FAKE (§50.3-50.4) -- a real, working, Protocol-satisfying implementation
class FakeBookingRepository:
    def __init__(self):
        self._bookings: dict[tuple, dict] = {}

    def get_active_booking(self, seat_id: str, date) -> dict | None:
        return self._bookings.get((seat_id, date))

    def insert_booking(self, **kwargs) -> dict:
        key = (kwargs["seat_id"], kwargs["booking_date"])
        self._bookings[key] = kwargs
        return kwargs


@pytest.fixture
def fake_repository():
    return FakeBookingRepository()

@pytest.fixture
def booking_service(fake_repository):          # fixture COMPOSITION (§50.6) --
    return BookingService(fake_repository)       # depends on another fixture


def test_book_seat_succeeds_when_available(booking_service):
    result = booking_service.book_seat(seat_id="s-1", date="2026-08-01", user_id="u-1")
    assert result["seat_id"] == "s-1"           # REAL logic exercised, via
                                                  # the FAKE's real behavior


def test_book_seat_rejects_duplicate(booking_service, fake_repository):
    booking_service.book_seat(seat_id="s-1", date="2026-08-01", user_id="u-1")
    with pytest.raises(SeatAlreadyBookedError):   # the fake's STATEFUL
        booking_service.book_seat(seat_id="s-1", date="2026-08-01", user_id="u-2")  # behavior
                                                                                        # makes this
                                                                                        # possible


# MOCK (§50.5) -- verifying an interaction happened, not its internal correctness
def test_booking_triggers_notification():
    with patch("myapp.services.notification_service.send_email") as mock_send:
        create_booking_and_notify(seat_id="s-1", date="2026-08-01")
        mock_send.assert_called_once()          # confirms it was CALLED --
                                                    # doesn't test email
                                                    # sending logic itself


class BookingService: ...
class SeatAlreadyBookedError(Exception): ...
def create_booking_and_notify(seat_id, date): ...
```

`FakeBookingRepository` is a genuine, working implementation — `test_book_seat_rejects_duplicate` works specifically because the fake actually *stores* the first booking and correctly returns it on the second `get_active_booking` call, letting the real `SeatAlreadyBookedError`-raising logic in `BookingService.book_seat` (companion §43.7, §45.5) be exercised exactly as it would against a real database, with zero database involved. `test_booking_triggers_notification`'s `patch` + `Mock` approach, by contrast, doesn't care what `send_email` actually does internally — it only confirms the code path correctly invoked it, exactly the narrower, interaction-focused verification §50.5 describes as a mock's appropriate use.

### 50.8 Production Considerations

A fake that diverges from its real counterpart's actual behavior (a fake repository that doesn't enforce a uniqueness constraint the real database schema does) provides false confidence — tests pass against the fake but the same logic could still fail against the real database in production, meaning a fake's behavior should be periodically validated against the real implementation's actual constraints (a shared, small integration test suite run against both the fake and the real repository, confirming they agree on the same set of test cases, is a genuine, worthwhile investment for any Protocol with more than trivial behavior). Overuse of `patch` on deeply internal implementation details (rather than at genuine external-dependency boundaries) produces brittle tests that break on any internal refactor even when the refactored code's actual external behavior is unchanged — `patch` at the boundary where your code calls into a genuinely external dependency (an HTTP client, an email-sending function), not at arbitrary internal function calls within your own business logic.

### 50.9 Debugging

**Symptoms:** A test suite passes consistently, but a bug the tests should have caught still reaches production; tests break frequently during routine internal refactors that don't change any externally-observable behavior. **Investigation:** For missed bugs, check whether the specific broken behavior was covered by a mock that only verified "was this called" rather than a fake that would have exercised the actual, incorrect logic (§50.3's exact gap). For refactor-fragile tests, check whether `patch` targets are aimed at genuinely external dependency boundaries or at arbitrary internal implementation details that happened to be convenient to intercept. **Root cause:** A mock used where a fake's real behavior was actually needed to catch the specific class of bug; `patch` targeting internal implementation rather than a genuine external boundary. **Fix:** Replace the relevant mock with a fake implementing genuinely correct behavior for the scenario the missed bug represents; refactor test doubles to patch only at real external-dependency boundaries, letting internal refactors pass freely as long as external behavior is preserved.

### 50.10 Interview Thinking

"When would you use a mock versus a fake in a test?" is testing whether you articulate §50.5's actual distinction precisely (verifying an interaction occurred, versus exercising genuinely correct behavior) rather than treating the two terms as interchangeable synonyms for "test double" — a strong answer gives a concrete example of each (a notification side-effect for a mock, a repository with real stored-state behavior for a fake) rather than a purely abstract definition.

### 50.11 Mini Lab

Implement `FakeBookingRepository` and the composed `booking_service` fixture as in §50.7, then write a third test case confirming that after two successful bookings for *different* seats (or different dates for the same seat), both are correctly retrievable and independent in the fake's internal state — directly exercising the fake's genuine, stateful correctness rather than just checking a call count. Separately, write a mock-based test confirming a specific side-effect function is called with the exact correct arguments after a successful booking, without implementing any real logic inside the mocked function at all.

---
