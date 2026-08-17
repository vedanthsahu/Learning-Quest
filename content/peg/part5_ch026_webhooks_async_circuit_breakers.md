## §26. Webhooks, Async Jobs, Retries & Circuit Breakers (API Level)

### 1. The Vocabulary

- **Webhook** — an HTTP callback: instead of you polling a service for updates, it calls *you*
  when something happens.
- **Long-running request vs. async job** — a request that would take too long to hold a client
  connection open for should instead kick off a background job and return immediately, with the
  client polling or subscribing for the result later.
- **Timeout** — how long a caller waits before giving up on a response.
- **Retry with backoff and jitter** — retrying a failed call, waiting progressively longer each
  time (backoff), with some randomness added (jitter) so many clients don't all retry at the
  exact same moment.
- **Circuit breaker** — after enough failures, stop calling a failing dependency for a while
  instead of continuing to hammer it.

### 2. Where It Sits, and Why Teams Use It

Any time your API depends on another service — an external webhook provider, an internal
downstream service, a slow report generator — you have to decide what happens when that
dependency is slow, down, or sends something twice. These are the standard, reusable answers.

### 3. What Actually Breaks

- **Webhook signature not verified** — accepting a webhook payload without verifying it was
  actually sent by the claimed provider (usually via an HMAC signature header) means anyone who
  finds your webhook URL can send fake events.
- **Webhook provider sends the same event twice** — most providers explicitly guarantee
  at-least-once delivery, not exactly-once; the receiving endpoint needs to be idempotent (§22)
  against the event's own ID, or duplicate events cause duplicate side effects.
- **A slow request held open instead of made async** — a client-facing endpoint that takes 30+
  seconds risks browser/load-balancer timeouts; converting it to "kick off a job, return
  immediately, let the client poll or get notified" avoids the whole problem.
- **Retrying without backoff** — an immediate, tight retry loop against a struggling dependency
  makes the outage worse, not better — this is exactly what a circuit breaker exists to prevent.
- **No jitter on retries** — if many clients all retry after exactly the same fixed delay, they
  hit the recovering service in synchronized waves instead of a spread-out trickle.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I verify webhook signatures, and I treat every webhook handler as needing to be idempotent,
  because at-least-once delivery is the normal guarantee, not exactly-once."
- "Anything that might run long gets converted to an async job with a way to check status, rather
  than holding a request open."
- "Retries need backoff and jitter, and past some failure threshold, a circuit breaker should stop
  calling a clearly-failing dependency instead of continuing to retry it."

### 5. Interview-Ready Answer

> "For anything that depends on another service, I plan for three failure modes: it's slow, it's
> down, or it sends something twice. Slow gets handled by making the operation async instead of
> holding a request open. Down gets handled by retries with backoff and jitter, and a circuit
> breaker so I stop hammering a dependency that's clearly not recovering. Sent-twice gets handled
> by making my own handling of it idempotent — webhooks in particular are usually at-least-once
> delivery by design, not exactly-once."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §67 (Retries, Timeouts & Circuit Breakers)
chapter and companion Python Backend Engineering Handbook's §48 (Background Workers, Scheduling &
Event-Driven Backends) chapter; companion Software Systems Handbook's §52 (Reliability
Engineering Deep Dive) chapter.

---
