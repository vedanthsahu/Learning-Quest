## §46. Scheduled Jobs, Cron & the Outbox Pattern

### 1. The Vocabulary

- **Cron** — a schedule expression (`0 2 * * *` = every day at 2am) describing when a job should
  run.
- **Scheduled job** — work triggered by time rather than by an event or user action.
- **Outbox pattern** — writing "I need to send this event" into the *same database transaction* as
  the business change it relates to, then a separate process reliably publishes from that outbox
  table — avoiding the gap between "database was updated" and "event was published" ever being
  inconsistent.

### 2. Where It Sits, and Why Teams Use It

Time-triggered work (nightly reports, cleanup jobs, reminder emails) and the "update the database
and also notify something else" pattern both show up constantly, and both have a specific,
well-known failure mode worth knowing by name.

### 3. What Actually Breaks

- **Cron ran at the wrong time** — usually a timezone mismatch: the cron schedule was written
  assuming one timezone (often the developer's local one) while the server actually runs in UTC
  or a different zone entirely (see §90).
- **A scheduled job that isn't idempotent, running twice due to a scheduler hiccup or manual
  re-trigger** — same underlying issue as §44, just triggered by a clock instead of a queue.
- **Updating the database, then separately publishing an event, with no transaction tying them
  together** — if the process crashes between the two steps, you can end up with a database
  change and no event (or an event with no matching database change), which is exactly the
  inconsistency the outbox pattern exists to prevent.
- **No overlap protection on a long-running scheduled job** — if a job sometimes takes longer than
  its own schedule interval, the next scheduled run can start while the previous one is still
  running, doubling up work or corrupting shared state.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I write cron schedules with an explicit timezone in mind, and verify what timezone the actual
  server/scheduler runs in — I don't assume it matches my local one."
- "Scheduled jobs get the same idempotency treatment as queue consumers, since they can also run
  more than once."
- "When a change needs to both update the database and notify another system, I use the outbox
  pattern — write both in the same transaction — rather than doing them as two separate,
  independently-failable steps."

### 5. Interview-Ready Answer

> "Cron and scheduled jobs need the same idempotency discipline as any other trigger, because they
> can run more than once — a scheduler hiccup, a manual re-trigger, or overlapping runs if a job
> takes longer than its own interval. The other thing I watch for is timezone mismatches, since
> 'cron ran at the wrong time' is almost always the schedule being written for one timezone while
> the server actually runs in another. And for anything that needs to update a database and
> publish an event together, I use the outbox pattern specifically to avoid the two ever getting
> out of sync if the process crashes between them."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §48 (Background Workers, Scheduling &
Event-Driven Backends) chapter; this book's own §90 (Time & Timezones).

---
