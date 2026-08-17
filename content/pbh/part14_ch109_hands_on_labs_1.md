## 109. Hands-On Labs I

### 109.1 Purpose: Labs Larger Than a Single Chapter's Mini Lab

Every chapter in Parts I-XIII closed with a Mini Lab scoped to that chapter's specific mechanism. The labs in this chapter and §110 are deliberately larger — each draws on multiple Parts at once, closer in scope to a genuine, if small, real project than a single-concept exercise.

### 109.2 Lab 1: Add Rate Limiting to Fieldnote

Using the capstone's own codebase (§79-91) as your starting point, add rate limiting to the `/ask` endpoint (§89) specifically — this endpoint is the most expensive per-call (it invokes an LLM provider) and therefore the most important to protect against abuse. Requirements: limit each user to a small number of questions per minute; return a `429 Too Many Requests` with a `Retry-After` header on limit breach (companion §61.6); the limit must work correctly even if Fieldnote is running as multiple instances (companion §61.4's atomic Redis `INCR` pattern, not per-process in-memory counting). Write an ADR (companion §78.3's five-question format) for your choice between fixed-window and token-bucket rate limiting before implementing either, exactly as §94.2's worked interview example modeled but now for real, with actual code behind the decision.

### 109.3 Lab 2: Diagnose and Fix an Injected N+1

Deliberately introduce an N+1 query bug into Fieldnote's `list_notes` route (§82) by removing its `selectinload` call, then — without looking at the diff you just made — use `EXPLAIN ANALYZE` (companion §30.2) and a query-counting test (companion §30.10) to detect the regression as if you'd inherited it from someone else's change. This lab is deliberately structured backward (break it, then diagnose it) specifically because most real N+1 encounters happen exactly this way — inherited from someone else's code, with no advance knowledge of where the bug is.

### 109.4 Lab 3: Build a Minimal Circuit Breaker From Scratch

Without referring back to companion §67.6's implementation, build your own three-state circuit breaker (Closed, Open, Half-Open) from first principles, wrapping a deliberately-flaky external call (a function that fails a configurable percentage of the time, for testing purposes). Requirements: the breaker must transition to Open after a configurable number of consecutive failures; while Open, calls must fail immediately without attempting the real call; after a cooldown period, the breaker must transition to Half-Open and allow exactly one trial call through. Once your implementation passes a test suite covering all three state transitions, compare it against companion §67.6's version — differences are worth understanding, not necessarily worth "correcting" your own version to match.

### 109.5 Lab 4: Load Test Fieldnote's Search Endpoint

Using Locust (companion §52.5), write a load test against Fieldnote's `/search` endpoint (§88) that ramps from a small number of concurrent users to a level where you can observe a genuine performance inflection point — the load level at which p99 latency (companion §58.2) begins climbing noticeably faster than p50. Identify, using the profiling tools from Part IX, what actually saturates first at that inflection point (the database's GIN index scan, the connection pool, application CPU) — this lab directly practices companion §102.3's exercise, but against a real system you've built rather than a hypothetical scenario.

### 109.6 Lab 5: Add Structured Logging and a Correlation ID to a Pre-Existing Small Project

If you have any existing small Python backend project of your own — even one predating this handbook — retrofit it with structured JSON logging and `contextvars`-based correlation ID propagation (companion §64.2-64.3), following the same pattern companion §90.4 applied to Fieldnote. Pay specific attention to any background task or async boundary in your project, since companion §90.4's own lesson (correlation IDs don't automatically cross a process boundary) is easy to encounter for the first time exactly here, on a project where you didn't design the background-task boundaries with this concern already in mind.

### 109.7 How to Grade Your Own Work

None of these labs have a single "correct" solution to check against — instead, for each, write a short paragraph (three to five sentences) stating what you'd tell a colleague reviewing your implementation about its known limitations and what you'd do differently with more time, exactly matching companion §93.2's Phase 5 wrap-up discipline. An implementation you can honestly critique is a stronger signal of genuine understanding than one you can only defend.

---
