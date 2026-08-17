## 84. Stage 6: Background Workers

### 84.1 Stage Goal

A new requirement arrives: every note should be indexed for full-text search (search itself arrives properly in §88, but the indexing pipeline needs to exist first). Indexing a note's text is slow enough — and unrelated enough to the actual "did the write succeed" question — that doing it synchronously inside `create_note`/`update_note` would directly reintroduce the request-latency problem this handbook diagnosed generically in §70. This stage moves indexing to a background worker.

### 84.2 New Requirements

Non-functional: creating or updating a note must not wait on search-index construction to complete; a note becoming searchable within a few seconds of being saved is acceptable — being searchable *instantly* is not a stated requirement.

### 84.3 ADR-6: FastAPI `BackgroundTasks` vs. a Real Task Queue for Indexing

**(1) Deciding:** Should note indexing run via FastAPI's built-in `BackgroundTasks` (companion §22.5) or a genuine external task queue (Celery, companion §37.2)? **(2) Options considered:** (a) `BackgroundTasks`, running the indexing function in-process after the response is sent; (b) Celery with a Redis or RabbitMQ broker, running indexing in a fully separate worker process. **(3) Tradeoffs:** `BackgroundTasks` requires zero new infrastructure and is trivial to add, but the task runs in the same process and is lost entirely if that process crashes or restarts before the task completes (companion §22.5's explicit "not for critical work" caveat); Celery survives a web-process restart (the task is durably recorded in the broker) and can be scaled independently of the web tier, at the cost of running and monitoring a genuinely separate worker fleet. **(4) Chosen:** `BackgroundTasks` for now — a missed index update is self-healing (the note still exists and can be re-indexed on its next update, or by a periodic reconciliation job) rather than a permanent data-loss risk, meaning the durability gap `BackgroundTasks` accepts is tolerable specifically for *this* task, even though it would not be tolerable for §86's notification delivery. **(5) Revisit when:** Indexing work becomes heavy enough to compete with the web tier for resources, or a durability requirement (never silently skipping an index update, even across a crash) is explicitly stated — at that point, migrate specifically the indexing task to Celery (§85 introduces the queue infrastructure this migration would use).

### 84.4 Implementation

```python
from fastapi import BackgroundTasks

async def index_note(note_id: UUID, title: str, body: str) -> None:
    # Stage 6: a placeholder indexing step; §88 replaces this with real search-engine writes
    tokens = f"{title} {body}".lower().split()
    await redis_client.sadd(f"note:{note_id}:tokens", *tokens)

@app.post("/notes", response_model=Note, status_code=201)
async def create_note(
    payload: NoteIn,
    background_tasks: BackgroundTasks,
    space_id: UUID,
    requester: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Note:
    await require_space_member(space_id, requester, session)
    model = NoteModel(id=uuid4(), space_id=space_id, **payload.model_dump())
    session.add(model)
    await session.commit()
    background_tasks.add_task(index_note, model.id, model.title, model.body)  # §22.5
    return Note.model_validate(model)
```

`background_tasks.add_task` schedules `index_note` to run *after* the response is already sent to the client (companion §22.5) — the client sees a fast response reflecting only the actual write, exactly matching §84.2's non-functional requirement, without the response waiting on indexing at all. The placeholder token-set approach is deliberately simple; §84.3's ADR explicitly scoped this stage to *moving indexing off the request path*, not to building the final search implementation, which is §88's separate, later concern.

### 84.5 What Changed in the Architecture

`create_note` (and, symmetrically, `update_note`, not shown) now accepts a `BackgroundTasks` parameter and calls `add_task` rather than performing indexing inline — a small, additive change to the route signature, but it establishes background work as a first-class pattern in the codebase that §85-86 build directly on top of.

### 84.6 Production Considerations

`BackgroundTasks` runs within the same worker process and shares its resource budget (companion §22.5) — a sudden spike in note creation could mean indexing work competes with request-handling for the same process's CPU and I/O capacity, a coupling ADR-6 accepted deliberately but that should be watched (§84.7) as usage grows, since it's exactly the kind of assumption ADR-6's "revisit when" clause anticipates outgrowing.

### 84.7 Debugging

**Symptoms:** Under a burst of note creation, overall request latency (including for routes unrelated to notes) rises noticeably. **Investigation:** Check whether the background indexing tasks, running in the same process (§84.6), are consuming enough CPU or blocking enough I/O to visibly compete with foreground request handling — this is the concrete, measurable version of ADR-6's accepted risk actually materializing. **Root cause:** `BackgroundTasks`' in-process execution model, functioning exactly as designed but under a load level ADR-6 didn't originally anticipate. **Fix:** This is precisely ADR-6's own stated revisit trigger — migrate indexing to Celery (§85's queue infrastructure) rather than attempting to tune `BackgroundTasks` further, since the tool itself, not its configuration, is the limiting factor here.

### 84.8 Mini Lab

Simulate a burst of concurrent note creations locally and measure whether unrelated routes' latency (e.g., `GET /spaces`) degrades measurably during the burst — directly testing whether ADR-6's accepted in-process-competition risk is still tolerable at your test load, or whether you've already reached the "revisit when" condition §84.3 describes.

---
