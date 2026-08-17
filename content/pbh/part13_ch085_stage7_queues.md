## 85. Stage 7: Queues

### 85.1 Stage Goal

§84's own ADR-6 named its exact revisit trigger; this stage assumes it has now been hit — indexing load has grown enough, and a second background-work need (preparing per-note activity events for §86's notifications) has appeared, that a genuine, durable task queue is now justified rather than merely anticipated.

### 85.2 New Requirements

Non-functional: background work (indexing, and soon notification dispatch) must survive a web-process crash or restart without being silently lost — the durability gap §84.3's ADR-6 explicitly accepted for indexing is no longer acceptable now that notification delivery, a user-facing correctness concern, will share the same infrastructure.

### 85.3 ADR-7: Celery vs. a Raw Redis List as a Queue

**(1) Deciding:** Now that a real queue is justified, should Fieldnote use Celery (companion §37.2) or hand-roll a simple queue directly on Redis (companion §35's list/stream primitives)? **(2) Options considered:** (a) Celery, a mature task-queue framework handling retries, scheduling, and worker management; (b) a hand-rolled `RPUSH`/`BLPOP` queue directly on the Redis instance already in use since §83. **(3) Tradeoffs:** A hand-rolled queue avoids adding a new dependency and reuses infrastructure already running, but reimplements — usually less robustly — retry logic, dead-letter handling, and worker-pool management that Celery already provides; Celery adds a genuinely new piece of infrastructure (a broker connection, worker processes, a result backend if used) and a learning-curve/operational cost, but is the correct tool once retry semantics and multiple task types (indexing, notifications, and later, §87's file processing) are all sharing one system. **(4) Chosen:** Celery, specifically because this stage's own trigger condition (§85.1) already implies more than one task type with real durability and retry requirements — exactly the point past which a hand-rolled queue's missing features (retries, backoff, dead-letter queues, companion §37.4) would need to be rebuilt anyway, at higher risk of a subtly incorrect reimplementation. **(5) Revisit when:** Task volume or latency requirements outgrow what Celery's default configuration handles well — at that point the question becomes tuning Celery (concurrency, routing, companion §37.5), not replacing it.

### 85.4 Implementation

```python
from celery import Celery

celery_app = Celery("fieldnote", broker=settings.redis_url, backend=settings.redis_url)

@celery_app.task(
    bind=True, max_retries=3, default_retry_delay=10,        # companion §37.4's retry discipline
)
def index_note_task(self, note_id: str, title: str, body: str) -> None:
    try:
        tokens = f"{title} {body}".lower().split()
        redis_sync_client.sadd(f"note:{note_id}:tokens", *tokens)
    except redis.RedisError as exc:
        raise self.retry(exc=exc)

@app.post("/notes", response_model=Note, status_code=201)
async def create_note(
    payload: NoteIn, space_id: UUID,
    requester: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Note:
    await require_space_member(space_id, requester, session)
    model = NoteModel(id=uuid4(), space_id=space_id, **payload.model_dump())
    session.add(model)
    await session.commit()
    index_note_task.delay(str(model.id), model.title, model.body)   # durable, retried (§37.2)
    return Note.model_validate(model)
```

`index_note_task.delay(...)` hands the task to Celery's broker — durably recorded there, surviving a web-process restart in a way `BackgroundTasks` (§84.4) never could, directly resolving §85.2's non-functional requirement. `max_retries=3`/`default_retry_delay=10` with an explicit `self.retry(exc=exc)` on a Redis error (companion §37.4) gives indexing genuine resilience against a transient Redis blip — a capability §84's `BackgroundTasks` version had no equivalent for at all.

### 85.5 What Changed in the Architecture

The route body is almost unchanged from §84.4 — `background_tasks.add_task(index_note, ...)` becomes `index_note_task.delay(...)`, a narrow, contained swap precisely because §84.4 already isolated background work behind a single call site rather than scattering indexing logic inline; this narrow blast radius is the direct payoff of that earlier stage's function-boundary discipline (companion §43), not a coincidence.

### 85.6 Production Considerations

Celery workers are now a genuinely separate deployable unit (companion §37.6) requiring their own health checks (companion §66.2, applied to a worker process rather than a web process — "is this worker still pulling tasks from the queue," not "is it accepting HTTP requests") and their own capacity planning, distinct from the web tier's.

### 85.7 Debugging

**Symptoms:** Notes are created successfully but never become searchable, and no error appears in the web application's own logs. **Investigation:** Check the Celery worker process's own logs, not the web application's (companion §85.6's genuinely-separate-process consequence) — a worker that isn't running at all, or has exhausted its retries (§85.4's `max_retries=3`) and moved a task to a dead-letter state, produces exactly this symptom with zero trace in the web tier's own logs. **Root cause (most common):** The Celery worker process simply isn't running in the current environment (a common gap immediately after this migration, since §84's `BackgroundTasks` needed no separate process at all, and the deployment configuration may not yet account for one).

### 85.8 Mini Lab

Stop the Celery worker process deliberately, create a note, confirm the note itself is created successfully but never becomes searchable, then restart the worker and confirm the queued task is still there waiting and gets processed — directly demonstrating the durability property (§85.2) that motivated this entire migration from §84's `BackgroundTasks`.

---
