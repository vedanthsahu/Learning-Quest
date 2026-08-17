## §44. Idempotent Consumers & the Duplicate Delivery Problem

### 1. The Vocabulary

- **At-least-once delivery** — the standard guarantee most queues (SQS, RabbitMQ default config)
  actually provide: a message might be delivered more than once, but never zero times.
- **Exactly-once delivery** — delivered exactly one time, no duplicates, ever — genuinely hard to
  guarantee end-to-end, and many systems that claim it actually mean "effectively-once" via
  idempotency on top of at-least-once, not a true protocol-level guarantee.
- **Idempotent consumer** — a message handler that produces the same end result whether it
  processes a given message once or multiple times.
- **Message deduplication ID** — an identifier the consumer uses to recognize "I've already
  handled this exact message" and skip reprocessing.

### 2. Where It Sits, and Why Teams Use It

This is §22's idempotency concept applied specifically to queue consumers — the practical
consequence of accepting at-least-once delivery as the normal, expected behavior of a queue
system rather than an edge case to be surprised by.

### 3. What Actually Breaks

- **A background job that sends an email, runs twice** — the customer gets two copies of the same
  notification email, a low-severity but very visible and embarrassing bug that traces directly
  back to non-idempotent message handling.
- **A job that increments a balance or counter, processed twice** — unlike an email, this is a
  real correctness bug with financial or data-integrity consequences, not just a cosmetic
  annoyance.
- **Assuming "the queue only delivers once because it usually does"** — duplicate delivery is
  often rare enough in testing/low traffic to go unnoticed, then shows up under real production
  load or during specific failure/retry scenarios (a consumer crashing after processing but before
  acknowledging, for instance).
- **Deduplication logic itself not being atomic** — checking "have I seen this ID" and then acting
  on it as two separate steps has the same race condition as any other check-then-act pattern; it
  needs a proper atomic operation (often a unique constraint) underneath.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I write every queue consumer assuming at-least-once delivery — duplicate messages are normal,
  expected behavior, not a bug in the queue."
- "Anything with a real side effect (charging money, sending a notification, mutating a balance)
  gets deduplicated using the message's own ID, with an atomic uniqueness check."
- "A consumer crashing after doing the work but before acknowledging the message is exactly the
  scenario that produces a duplicate — it's not a rare edge case, it's the expected failure mode
  the whole idempotency design exists for."

### 5. Interview-Ready Answer

> "I treat at-least-once delivery as the default assumption for any queue-based system, which
> means every consumer needs to be idempotent against its own message ID, not just hope
> duplicates won't happen. The scenario that actually produces duplicates in practice is a
> consumer finishing the real work but crashing or losing connectivity before it acknowledges the
> message — the queue, having no confirmation, redelivers it. Designing for that from the start is
> much cheaper than debugging a duplicate-side-effect bug in production later."

### 6. Go Deeper

This book's own §22 (Idempotency) covers the general API-level version of this same problem;
companion Software Systems Handbook's §40 (Message Queue Mechanics: delivery guarantees, ordering,
DLQs) chapter (delivery guarantees in full).

---
