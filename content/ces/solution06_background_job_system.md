## Project 06: Background Job System — Solution Guide

### Business Reasoning

The business need is offloading slow work from the request path while guaranteeing it still completes reliably. The central engineering tension is between throughput (keep processing jobs fast) and durability (never silently lose one) — and, as this solution shows, these pull in the same direction more than they conflict, once acknowledgment timing is handled correctly.

### Requirements Analysis

The durability requirement ("a crashed worker must not lose a job") and the no-duplicate-side-effects requirement together define this project's central design tension: a job must be retried if a worker dies before finishing it, but that same retry must not double-charge a customer or double-send an email if the job's actual work already happened once. This is resolved not by preventing retries, but by requiring job handlers to tolerate them (at-least-once delivery, idempotent handlers).

### Architecture

```
Submit -> Durable Queue (broker) -> Worker pulls job (NOT yet removed) -> executes
        -> on success: worker ACKs -> job removed from queue
        -> on crash/timeout without ACK: job becomes visible again -> retried by another worker
        -> on exceeding max retries: moved to Dead-Letter Queue, isolated from main queue
```

### Tradeoff Discussion

**Acknowledge-on-pickup vs. acknowledge-on-completion.** Acknowledging on pickup (removing the job from the queue the moment a worker starts it) is simpler but loses the job entirely if the worker crashes before finishing — a durability violation. Acknowledging only on completion means a crashed worker's job automatically becomes available for another worker after a visibility timeout, at the cost of the job's queue "true" state being briefly ambiguous (is it running, or did the worker crash?) during that timeout window.

**Global vs. per-job-type retry policy.** A single global retry policy is simpler to configure but treats a payment job (where retrying too aggressively risks duplicate charges even with idempotency keys as a backstop) the same as a report-generation job (where aggressive retry has no such risk) — per-job-type policies add configuration surface but let retry aggressiveness match each job's actual risk profile.

### Alternative Designs Considered and Rejected

**Acknowledge-on-pickup with a separate "completed" flag checked afterward.** Rejected — this reintroduces the exact durability gap acknowledge-on-completion is designed to close; a crash between pickup and setting the flag loses the job just as surely as never tracking a flag at all. **No dead-letter queue, relying on unlimited retries for permanently-failing jobs.** Rejected — this is the challenge's third named trap made concrete: a poison-pill job retried forever consumes worker capacity indefinitely and, depending on queue ordering, can starve unrelated jobs behind it.

### Chosen Design

A durable broker (Celery with a Redis or RabbitMQ backend) with acknowledge-on-completion semantics, per-job-type retry policies with exponential backoff, and a dead-letter queue for jobs exceeding their retry limit — directly implementing the four hint-system concepts (visibility timeout, backoff, dead-letter isolation, at-least-once-tolerant handlers) as one integrated design.

### Implementation Walkthrough

```python
@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def generate_report_task(self, report_id: str):
    try:
        report = build_report(report_id)          # must be safe to run more than once (idempotent
        save_report_result(report_id, report)      # by re-deriving from report_id, not accumulating)
    except TransientError as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)   # exponential backoff

@celery_app.task(bind=True, max_retries=5)
def charge_customer_task(self, order_id: str, idempotency_key: str):
    try:
        payment_provider.charge(order_id, idempotency_key=idempotency_key)   # provider-side dedup
    except TransientError as exc:
        raise self.retry(exc=exc)

# Celery's own broker acknowledges only after successful task completion (acks_late=True),
# so a worker crash mid-task leaves the job unacknowledged and it becomes available again.
celery_app.conf.task_acks_late = True
celery_app.conf.task_reject_on_worker_lost = True   # explicit requeue on worker crash
```

`task_acks_late = True` is the single configuration line implementing acknowledge-on-completion rather than acknowledge-on-pickup — directly closing the challenge's first named trap. `build_report` is written to be safe under re-execution (re-deriving the report from `report_id` rather than assuming it starts from a partial, prior attempt's state), and `charge_customer_task` passes an `idempotency_key` to the payment provider specifically so a genuine retry-after-ambiguous-failure doesn't produce a duplicate charge — both are concrete instances of "job handlers must tolerate at-least-once delivery," the challenge's fourth engineering question answered in code.

### Production Improvements

Monitor queue depth over time (not just current depth) as the leading indicator of whether workers are keeping up — a queue that's merely large but shrinking is healthy; one that's growing indicates genuine capacity shortfall (Python Backend Engineering Handbook §85.6's queue-depth-versus-worker-capacity reasoning). Add structured logging with the job ID as a correlation key so a job's full retry history can be traced across multiple worker attempts.

### Scaling Path

Worker pool size scales independently of whatever submits jobs, based on queue depth and per-job processing time — exactly the independent-tier-scaling reasoning this series' Project 05 (Notification Service) and the Python Backend Engineering Handbook's capstone (§91.3) both apply.

### Interview Discussion

See Python Backend Engineering Handbook §94.4 for this exact system walked through the five-phase interview framework — the deep-dive phase almost always centers on the acknowledge-on-pickup-versus-completion distinction discussed here.

### Lessons Learned

The core lesson is that "durable" and "no duplicates" are not automatically compatible — achieving both requires acknowledge-on-completion (for durability) *plus* idempotent handlers (to make the resulting at-least-once retries safe), and neither alone is sufficient. This exact combination — durability mechanism plus idempotency discipline — recurs directly in Project 05's notification delivery and Project 13's booking-confirmation flow.

---
