## §43. Retries, Dead-Letter Queues, and Poison Messages

### 1. The Vocabulary

- **Retry** — attempting to process a failed message again, since many failures (a transient
  network blip, a momentarily-overloaded dependency) succeed on a second try.
- **Dead-letter queue (DLQ)** — a separate queue where messages get moved after failing too many
  times, so they stop blocking the main queue but aren't silently lost.
- **Poison message** — a message that will *never* succeed no matter how many times it's retried
  (malformed data, a permanently missing reference) — the reason a DLQ, not infinite retries, is
  the right design.
- **Visibility timeout** — how long a message is hidden from other consumers after being picked
  up, before it becomes visible again if the consumer never confirms it finished.

### 2. Where It Sits, and Why Teams Use It

Any queue-based system needs an answer to "what happens when processing a message fails" — retry
forever, give up silently, or something in between. DLQs are the practical middle ground: bounded
retries, then quarantine for investigation, never silent data loss.

### 3. What Actually Breaks

- **No DLQ at all** — a poison message either blocks the queue indefinitely (if the consumer keeps
  crashing on it and it keeps reappearing) or gets silently dropped after some retry limit, losing
  data with no record of what was lost.
- **Retrying immediately, with no backoff** — hammering a struggling dependency with immediate
  retries, at scale, can make an outage measurably worse instead of helping it recover.
- **Visibility timeout too short for the actual processing time** — the message becomes visible
  again and gets picked up by a *second* consumer while the first one is still legitimately
  working on it, causing duplicate processing that has nothing to do with the message actually
  failing.
- **Never actually looking at the DLQ** — messages accumulate there and get forgotten, defeating
  the entire purpose of quarantining them for investigation instead of silently dropping them.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I set a bounded retry count with backoff, and route to a DLQ after that — never infinite
  retries, never silent drops."
- "Visibility timeout needs to comfortably exceed actual processing time, or a still-working
  consumer's message can get picked up again by someone else."
- "A DLQ needs to actually be monitored and periodically reviewed — it's a quarantine, not a
  trash can."

### 5. Interview-Ready Answer

> "My default failure-handling design for queue consumers is: retry a bounded number of times
> with backoff, since many failures are transient, then move the message to a dead-letter queue
> rather than either retrying forever or dropping it silently. The DLQ needs to actually be
> monitored — it exists specifically so a genuinely broken ('poison') message gets investigated
> instead of either blocking the queue forever or disappearing with no trace."

### 6. Go Deeper

companion Cloud Engineering Playbook's §14 (Queues & Pub/Sub: SQS & SNS) chapter and companion
Cloud Engineering Playbook's §53 (Why Did My SQS Queue Back Up?) chapter; companion Python Backend
Engineering Handbook's §48 (Background Workers, Scheduling & Event-Driven Backends) chapter.

---
