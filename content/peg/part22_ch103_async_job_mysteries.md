## §103. Async & Background Job Mysteries

*Format: Symptom → What's Actually Going On → The Fix → What to Say About It.*

### "Background job ran twice."

- **What's actually going on**: The queue (or scheduler) only guarantees at-least-once delivery
  — a consumer that finished the work but crashed or lost connectivity before acknowledging the
  message gets redelivered.
- **The fix**: Make the job idempotent against its own message/execution ID, so processing it
  twice produces the same end result as processing it once.
- **What to say**: "At-least-once delivery is the normal, expected guarantee — the fix is making
  the consumer idempotent, not trying to eliminate duplicates at the queue level."
- **See also**: §44.

### "Queue keeps growing."

- **What's actually going on**: Consumers aren't keeping up with producers — either consumer
  throughput dropped (a slow dependency, an error causing retries), or producer volume increased
  faster than consumer capacity scales.
- **The fix**: Check consumer error rates and processing time first; scale consumers if it's
  genuinely a throughput problem, not a stuck/failing one.
- **What to say**: "Growing backlog means consumers aren't keeping pace — I'd check whether
  they're failing/retrying or just under-provisioned before assuming it's pure volume."
- **See also**: §42, §43.

### "Cron job ran at the wrong time."

- **What's actually going on**: Almost always a timezone mismatch — the schedule was written
  assuming one timezone while the server/scheduler actually runs in another (often UTC).
- **The fix**: Write and verify cron schedules with an explicit timezone, and confirm what
  timezone the actual execution environment uses.
- **What to say**: "This is almost always a timezone mismatch between when the schedule was
  written and where it actually runs."
- **See also**: §46, §90.

### "Webhook provider sent duplicate events."

- **What's actually going on**: Most webhook providers explicitly guarantee at-least-once
  delivery, same root cause as the duplicate job case above, just from an external source.
- **The fix**: Deduplicate incoming webhook events by their provider-supplied event ID before
  processing.
- **What to say**: "Webhook handlers need the same idempotency treatment as any other at-least-
  once consumer — I'd dedupe by the event's own ID."
- **See also**: §26, §44.

---
