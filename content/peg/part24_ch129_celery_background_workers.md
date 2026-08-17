## §129. Celery and Background Task Workers

### 1. The Vocabulary

- **Celery** — Python's most widely used distributed task queue library: an app defines "tasks"
  (plain functions decorated with `@app.task`), a broker (usually Redis or RabbitMQ) carries task
  messages, and one or more separate worker processes pick them up and execute them.
- **Broker** — the message transport between the app and the workers (see §45 for the general
  queue-technology comparison); Celery itself is the task-execution framework sitting on top.
- **Result backend** — an optional separate store (Redis, a database) where a task's return value
  or status is saved, so the caller can later check "is this done, and what did it return."
- **Beat (`celery beat`)** — Celery's scheduler process for periodic tasks — the distributed
  equivalent of cron (§46), running scheduled tasks through the same worker infrastructure.

### 2. Where It Sits, and Why Teams Use It

Celery is the standard way to move slow or unreliable work — sending an email, generating a report,
calling a slow third-party API, processing an uploaded file — out of the request/response cycle
entirely. A web request enqueues a task and returns immediately; a separate worker process (often
on separate infrastructure, scaled independently from the web servers) picks it up and does the
actual work, exactly the queue-decoupling pattern from §42, with Celery providing the Python-native
task-definition and retry machinery on top.

### 3. What Actually Breaks

- **Tasks that aren't idempotent** — Celery, like any queue-based system, can redeliver a task
  (worker crash mid-task, network blip); a non-idempotent task (charging a card, sending an email)
  run twice is a real, visible bug, not a theoretical edge case (full mechanism in §44).
- **Large objects passed directly as task arguments** — passing a full file's bytes or a huge
  object into a task call serializes all of it into the broker message; the fix is passing an ID or
  a storage location and having the task fetch the data itself.
- **No timeout or retry policy on a task calling an external service** — a task that hangs
  indefinitely on an unresponsive third-party API can quietly occupy a worker slot, starving other
  queued work behind it.
- **Running Celery workers without monitoring queue depth** — a growing backlog of unprocessed
  tasks (worker crashed, or task volume outpaced worker capacity) is invisible without explicit
  monitoring, and by the time users notice ("my report never generated"), the backlog may already
  be hours deep.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I design Celery tasks to be idempotent by default, because at-least-once delivery is the norm,
  not the exception, for any queue-backed system."
- "I pass IDs or references into tasks, not large payloads, and have the task fetch what it needs."
- "I set explicit timeouts and retry policies on tasks that call external services, so one slow
  dependency can't quietly tie up a worker indefinitely."

### 5. Interview-Ready Answer

> "I use Celery to move slow or unreliable work out of the request path — anything involving an
> external API, a large file, or a report generation. I assume tasks can be delivered more than
> once, so I design them to be idempotent rather than assuming exactly-once execution. And I
> monitor queue depth explicitly, since a growing backlog from a crashed worker or a traffic spike
> is otherwise invisible until users start noticing delayed results."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §37 (Celery, Scheduled Work, Object Storage &
Search) chapter and companion Python Backend Engineering Handbook's §48 (Background Workers,
Scheduling & Event-Driven Backends) chapter for full worker-scaling and monitoring patterns; this
book's §42-46 (why queues exist, retries/DLQs, idempotent consumers, SQS/SNS/Kafka comparison,
cron/outbox) for the general queueing concepts Celery implements.

---
