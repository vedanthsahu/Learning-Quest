## 37. Celery, Scheduled Work, Object Storage & Search Engines

### 37.1 The Problem: §36's Broker Mechanics Need a Python-Native Task Framework Wrapped Around Them, Plus Two Unrelated but Common Needs

§36 developed message brokers at the protocol level — real Python backends rarely interact with RabbitMQ/Kafka that directly for ordinary task-queue needs, instead using a task framework that wraps broker mechanics behind a much simpler decorator-based API. This closing Part V chapter covers that framework (Celery), the related-but-distinct need for time-based (not event-triggered) scheduled work, and two entirely separate external-system needs common enough to belong in this Part: storing large binary files outside the database, and full-text/relevance search beyond what a relational database's exact-match queries naturally provide.

### 37.2 Python Mechanism: Celery Wraps §36's Broker Mechanics Behind `@app.task`

**Celery** is a distributed task queue framework that uses a message broker (commonly RabbitMQ or Redis, §35/§36) underneath, but exposes task definition and invocation as ordinary-looking Python: `@app.task` decorates a function (directly companion §2's decorator mechanism, applied here) making it callable either normally (runs immediately, in-process) or via `.delay()`/`.apply_async()` (serializes the call and its arguments, publishes it to the broker, and returns immediately — a genuinely separate Celery worker process picks it up and executes it later, independently). This is precisely the tool the actual Seat Management backend's architecture would reach for if it needed reliable, retriable background job processing beyond FastAPI's own `BackgroundTasks` (§22.3).

### 37.3 Decision Framework: Celery's Retry and Result-Backend Features Address §36's Idempotency Discipline at the Framework Level

Celery tasks support declarative retry configuration (`@app.task(max_retries=3, default_retry_delay=30)`) directly on the task definition, and an optional **result backend** for storing a task's return value or failure state for later retrieval — meaning much of §32.4's manual retry-loop code and §36.4's manual ack/nack logic can be expressed declaratively rather than hand-written, at the cost of learning Celery's specific configuration surface and operational model (worker processes, a broker, optionally a result backend, each with their own monitoring and capacity-planning needs, directly extending §36.5's operational-cost tradeoff).

### 37.4 Python Mechanism: Scheduled (Cron-Style) Work Is a Different Trigger Than Event-Driven Work

Everything in §36-37.3 so far triggers on an *event* (a booking was created, publish a message). Some backend work instead needs to run on a *schedule*, regardless of any specific event (a nightly report generation, a periodic cleanup of expired sessions — directly the actual backend's `purge_expired_refresh_tokens`/`purge_expired_sessions` functions called at startup and, in a more complete production setup, on an ongoing schedule). **Celery Beat** (a companion scheduler process) or a simpler standalone scheduler can trigger Celery tasks (or any callable) at configured intervals or cron-style times — the key engineering distinction from event-driven work is that scheduled work must itself handle the case where a previous run is still in progress when the next scheduled time arrives (directly reusing §35.5's distributed lock to ensure only one instance of a scheduled job runs at a time across a multi-worker deployment).

### 37.5 Engineering Constraint: Large Binary Files Don't Belong in a Relational Database

A relational database is optimized for structured, queryable rows — storing a large binary file (an uploaded floor-layout SVG, a profile photo) directly as a database column (a `BYTEA`/`BLOB`) works technically but bloats the database's storage and backup size disproportionately, and doesn't benefit from the database's actual strengths (relational queries, transactions) for what is, at that point, just an opaque blob. **Object storage** (S3, Azure Blob Storage, Google Cloud Storage) is purpose-built for this: the database stores only a reference (a URL or object key, directly the actual backend's `floor_layouts.layout_file_url` column) while the actual file content lives in object storage, optimized specifically for storing and serving large binary objects at scale.

### 37.6 Engineering Constraint: Relational `WHERE` Clauses Don't Naturally Express "Relevance"

Companion AI Systems Handbook §4 and §21 developed BM25/dense retrieval as genuinely different problems from an exact-match `WHERE` clause — finding "the most relevant" results for a fuzzy text query (searching guest names, searching floor layout notes) isn't naturally expressed as a SQL condition, since SQL's `LIKE`/`ILIKE` only matches literal substrings, with no concept of relevance ranking, typo tolerance, or semantic similarity. **Elasticsearch** and **OpenSearch** are purpose-built full-text search engines implementing exactly the inverted-index and relevance-scoring mechanics (companion AI Systems Handbook §21.2's BM25) that a relational database's query engine was never designed to provide — the correct tool specifically once search quality (not just filtering) becomes a genuine product requirement, distinct from PostgreSQL's own limited full-text search extension, which can suffice for simpler needs at smaller scale.

### 37.7 Implementation

```python
from celery import Celery

celery_app = Celery("seat_management", broker="redis://localhost:6379/0")

@celery_app.task(max_retries=3, default_retry_delay=30)
def send_booking_confirmation_email(booking_id: str, email: str) -> None:
    try:
        _actually_send_email(email, f"Booking {booking_id} confirmed")
    except ConnectionError as exc:
        raise send_booking_confirmation_email.retry(exc=exc)  # declarative
                                                                  # retry (§37.3)

# Called from a route handler -- returns IMMEDIATELY, work happens in a
# separate Celery worker process, reliably, even across restarts (§37.2):
# send_booking_confirmation_email.delay(booking_id="b-1", email="a@x.com")


import boto3

s3_client = boto3.client("s3")

def upload_floor_layout(file_bytes: bytes, layout_id: str) -> str:
    key = f"floor-layouts/{layout_id}.svg"
    s3_client.put_object(Bucket="seat-mgmt-layouts", Key=key, Body=file_bytes)
    return f"https://seat-mgmt-layouts.s3.amazonaws.com/{key}"   # THIS url is
                                                                   # what gets
                                                                   # stored in
                                                                   # the DB row
                                                                   # (§37.5),
                                                                   # not the
                                                                   # file itself


def _actually_send_email(to, subject): ...
```

`send_booking_confirmation_email.delay(...)` publishes the task to Celery's configured broker and returns instantly — the actual email-sending happens in a separate worker process, entirely decoupled from the request/response cycle, with Celery's declarative retry (`max_retries=3`) handling transient failures automatically per §37.3. `upload_floor_layout` stores the actual file bytes in S3 and returns only a URL — exactly what the actual Seat Management backend's `floor_layouts.layout_file_url` column holds, directly confirming §37.5's storage-separation principle as the real, already-adopted pattern in this specific codebase.

### 37.8 Production Considerations

Celery workers must be monitored and scaled independently of the FastAPI application itself (companion §56's capacity planning applies to workers as their own distinct pool of capacity) — a spike in task volume that outpaces available worker capacity produces a growing task backlog in the broker, directly the same backpressure/capacity-mismatch concern companion §15.6 developed generally, now specifically requiring worker-count monitoring and autoscaling as its own operational concern separate from web-request capacity. Object storage URLs stored in the database (§37.5) should generally be treated as internal references requiring an access-control check before being served to a client, rather than fully public URLs, unless the content is genuinely meant to be public — companion §62's secure-file-handling chapter develops signed, time-limited URLs as the standard mechanism for serving otherwise-private object-storage content safely.

### 37.9 Debugging

**Symptoms:** Background tasks (emails, notifications) accumulate a growing delay under load despite the API itself remaining fast; a file upload succeeds but the stored reference later returns a broken link. **Investigation:** For growing task delay, check Celery worker count and per-task processing time against actual task arrival rate (§37.8's capacity-mismatch diagnostic). For broken file references, check whether the object-storage URL construction matches the actual bucket/key naming convention used at upload time, and whether the object storage bucket's access policy actually permits the access pattern the application expects. **Root cause:** Insufficient worker capacity relative to task volume; a mismatch between the URL stored and the object's actual location or access permissions. **Fix:** Scale Celery worker count to match sustained task arrival rate, monitoring queue depth as the leading indicator; verify and correct the object-storage key/URL construction and bucket access policy.

### 37.10 Interview Thinking

"How would you handle sending a confirmation email after a booking is created, reliably?" is testing whether you distinguish §22.3's `BackgroundTasks` (fine for best-effort work) from a genuine task queue like Celery (§37.2, appropriate when reliable delivery matters) — a strong answer explicitly states which category the specific requirement falls into before naming a tool, rather than reaching for the most sophisticated-sounding option by default.

### 37.11 Mini Lab

Set up a minimal Celery application with a Redis broker as in §37.7, define a task that simulates sending an email (a print statement with a deliberate, occasional simulated failure), and call it via `.delay(...)` from a small script. Confirm the calling script returns immediately while the actual task executes (visible via the worker process's own console output) in a separate process. Then deliberately trigger the simulated failure path and confirm Celery's retry mechanism attempts the task again automatically per the configured `max_retries`.

---
