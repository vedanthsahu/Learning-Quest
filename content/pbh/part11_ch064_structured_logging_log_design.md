## 64. Structured Logging & Log Design

### 64.1 The Problem: §8's Structured-Logging Mechanism Needs a Production-Scale Design Discipline

Companion §8.4 established structured logging's mechanism (key-value fields via `extra={...}`). At production scale — many concurrent requests, many log-emitting components, high log volume — the mechanism alone isn't enough; a genuine *design discipline* is needed for what to log, at what level, with what correlation identifiers, so that the resulting logs are actually usable for real investigation rather than an undifferentiated, unsearchable flood.

### 64.2 Engineering Constraint: A Request-Scoped Correlation ID Is What Makes Concurrent Logs Reconstructable

Under real concurrent load, log lines from many simultaneous requests interleave in whatever order they're actually emitted — without a shared identifier threading every log line belonging to *one specific request* together, reconstructing what happened during any single request's lifecycle from the raw log stream is effectively impossible once more than one request is in flight at a time. Companion §19.5's request-ID-attaching middleware is precisely this mechanism; this chapter's job is ensuring that identifier actually reaches *every* log line emitted anywhere during that request's handling, not just the ones in the middleware itself.

### 64.3 Python Mechanism: `contextvars` — Propagating a Correlation ID Through an Async Call Chain Without Explicit Threading

Passing a `request_id` as an explicit parameter through every single function call in a request's handling chain (route handler → service → repository) is possible but invasive — every function signature in the chain needs to accept and forward it, whether or not that function has any other reason to know about request-scoped context at all. Python's `contextvars` module provides **context-local** storage that automatically propagates correctly through an async call chain (including across `await` points, and correctly isolated per concurrent task, avoiding companion §14's shared-state race entirely) — a `request_id` set once, at the very start of request handling (in middleware, companion §19.5), becomes transparently accessible to any logging code anywhere in that request's call chain, with no explicit parameter-threading required.

### 64.4 Decision Framework: Log Level Discipline — What Belongs at DEBUG vs. INFO vs. WARNING vs. ERROR

Companion §8.2 introduced the level hierarchy mechanically; the actual discipline matters more: **DEBUG** for detail useful only during active, deliberate investigation (verbose enough that it would be noise in normal operation, disabled by default in production); **INFO** for normal, expected business events worth a permanent record (a booking created, a user logged in) — the level that should tell a story of what the system did, readable by someone who wasn't there when it happened; **WARNING** for something unexpected but recovered from automatically (a retry succeeded on the second attempt, companion §32.4); **ERROR** for something that genuinely failed and needs human attention, distinct from WARNING specifically because it represents a failure that wasn't automatically resolved. A codebase where every log statement defaults to INFO regardless of actual severity, or where ERROR is used for routine, expected conditions, defeats the entire purpose of having levels at all — companion §65's alerting depends directly on this discipline being followed consistently.

### 64.5 Engineering Constraint: What Must Never Appear in a Log Line, Even Accidentally

Companion §44.4's `SecretStr` protects configuration secrets from accidental logging; the equivalent discipline for *request/response data* flowing through log statements is a deliberate, reviewed allowlist (or, more practically, an explicit denylist of known-sensitive field names — passwords, tokens, full credit card numbers, and, depending on the organization's data-handling policy, potentially PII like full names or emails in some contexts) that logging code actively redacts before a log line is ever emitted, rather than logging entire request/response objects wholesale and hoping nothing sensitive happens to be present in them.

### 64.6 Implementation

```python
import contextvars
import logging
import json

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

class ContextualFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "message": record.getMessage(),
            "request_id": request_id_var.get(),   # §64.3: automatically
        }                                            # available here, with
        return json.dumps(payload)                    # NO explicit passing
                                                          # required anywhere
                                                          # in between


# Middleware sets it ONCE, at request start:
async def request_id_middleware(request, call_next):
    token = request_id_var.set(str(uuid.uuid4()))
    try:
        return await call_next(request)
    finally:
        request_id_var.reset(token)   # cleans up correctly, per-request,
                                        # even under concurrent requests


# ANY code, ANYWHERE in the call chain, automatically includes the
# correct request_id -- no parameter threading needed at all:
logger = logging.getLogger("bookings")

def create_booking_service(seat_id, user_id):
    logger.info("creating booking", extra={"seat_id": seat_id})   # request_id
    # ... deep in some OTHER function, several calls away: ...      # is present
    logger.warning("seat conflict detected, retrying")               # automatically,
                                                                        # via the
                                                                        # formatter


SENSITIVE_FIELDS = {"password", "token", "authorization", "ssn"}

def redact_sensitive(data: dict) -> dict:
    return {
        k: ("***REDACTED***" if k.lower() in SENSITIVE_FIELDS else v)
        for k, v in data.items()
    }

import uuid
```

`request_id_var` is set exactly once, in middleware, at the very start of request handling — `ContextualFormatter.format` reads it automatically for *every* log line emitted anywhere during that request's processing, including deep inside service or repository functions that have no explicit awareness of `request_id` at all (§64.3's transparent propagation). Because `contextvars` is genuinely context-local (not a plain global variable, which would be shared and racy across concurrent requests, companion §14.1's exact concern), two concurrent requests being handled simultaneously each see only their own correct `request_id`, never each other's.

### 64.7 Production Considerations

Log volume itself has a real, direct cost at production scale (storage, ingestion/processing cost for whatever log-aggregation system consumes it, companion §71 of the Software Systems Handbook's cardinality-and-cost discussion applies directly) — DEBUG-level logging left enabled in production, or excessive INFO-level logging for genuinely high-frequency, low-value events, is a real, ongoing cost worth actively managing, not a "more logging is always better" default. The correlation-ID pattern (§64.2-64.3) should extend *beyond* a single service, into any downstream service calls (companion §32's HTTP client calls should forward the request ID as a header) — otherwise the correlation trail breaks exactly at the service boundary, precisely where a multi-service incident investigation most needs it to continue (directly foreshadowing §65's distributed tracing, which formalizes this cross-service propagation further).

### 64.8 Debugging

**Symptoms:** During an incident investigation, log lines relevant to one specific problematic request are scattered and difficult to distinguish from unrelated, concurrent requests' log lines; a security or compliance review discovers a sensitive field value present in application logs. **Investigation:** For the scattered-logs case, confirm whether a request-scoped correlation ID (§64.2-64.3) is genuinely present and correctly propagated through every logging call site involved, or whether some code paths log without it. For the sensitive-data exposure, trace the specific log statement and check whether it logs a raw object/dict wholesale rather than through an explicit redaction step (§64.5-64.6). **Root cause:** Missing or incompletely-propagated correlation ID; a log statement logging unredacted, sensitive data directly. **Fix:** Adopt `contextvars`-based correlation ID propagation consistently across every logging call site (§64.6); add explicit redaction (§64.6's `redact_sensitive` pattern) to any logging code path that might include sensitive fields, and audit existing logs retroactively for the specific exposure found.

### 64.9 Interview Thinking

"How would you make it possible to trace everything that happened during one specific user's request, across a system handling thousands of concurrent requests?" is testing whether request-scoped correlation IDs propagated via `contextvars` (§64.2-64.3) are your default answer — a strong answer explains why `contextvars` specifically (not a plain global variable, which would be racy under real concurrency, companion §14.1) is the correct mechanism for this in an async Python application.

### 64.10 Mini Lab

Implement `request_id_var`, `ContextualFormatter`, and the middleware pattern from §64.6 in a small FastAPI application, with logging calls in at least two different functions several calls deep from the route handler. Fire two genuinely concurrent requests (using `asyncio.gather` against a `TestClient`, or two separate simultaneous real requests) and confirm, by inspecting the actual log output, that every log line correctly shows its own request's `request_id`, with no cross-contamination between the two concurrent requests' correlation IDs.

---
