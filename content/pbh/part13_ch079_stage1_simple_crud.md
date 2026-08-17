## 79. Stage 1: Simple CRUD

### 79.1 Stage Goal

Establish Fieldnote's absolute baseline: a running FastAPI application that can create, read, update, delete, and list notes, backed initially by the simplest possible persistence that still models the real data shape correctly — proving the skeleton works end-to-end before any of the harder concerns (auth, real scale, external systems) are introduced.

### 79.2 New Requirements

Functional: `POST /notes`, `GET /notes/{id}`, `GET /notes`, `PATCH /notes/{id}`, `DELETE /notes/{id}`. A note has a title, a body, and timestamps. Non-functional: none beyond §78.5's baseline — this stage's entire purpose is proving the skeleton, not yet handling load, security, or failure modes those later stages own.

### 79.3 ADR-1: In-Memory Storage vs. a Real Database From Day One

**(1) Deciding:** What should Stage 1 use for persistence? **(2) Options considered:** (a) an in-memory Python dictionary, discarded on every restart; (b) SQLite as a zero-infrastructure file-backed database; (c) PostgreSQL from the very first line of code. **(3) Tradeoffs:** In-memory storage is trivial to write and requires zero infrastructure, but data loss on every restart makes it unsuitable for anything beyond proving the API shape; SQLite adds real persistence with still-minimal setup, but its concurrency model and feature set diverge from PostgreSQL in ways that would require a genuine migration later (companion §24's PostgreSQL-specific feature reliance in Stage 4, §82); starting with PostgreSQL directly avoids that future migration entirely but adds infrastructure (a running database) before Stage 1 strictly needs it. **(4) Chosen:** An in-memory dictionary, deliberately, specifically *because* this stage's only goal is proving the FastAPI route/schema/response shape (companion §18, §21) before any persistence concern is introduced — this is the one stage in the entire capstone where the "wrong" long-term choice is the *correct* short-term one. **(5) Revisit when:** Immediately at Stage 4 (§82), where real persistence requirements (surviving restarts, supporting concurrent access) make in-memory storage unambiguously insufficient — this ADR's own five-question format built in its own expiration from the start.

### 79.4 Implementation

```python
from uuid import UUID, uuid4
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()
_notes: dict[UUID, "Note"] = {}          # Stage 1's deliberately temporary store

class NoteIn(BaseModel):
    title: str
    body: str

class Note(NoteIn):
    id: UUID
    created_at: datetime
    updated_at: datetime

@app.post("/notes", response_model=Note, status_code=201)
def create_note(payload: NoteIn) -> Note:
    now = datetime.now(timezone.utc)
    note = Note(id=uuid4(), created_at=now, updated_at=now, **payload.model_dump())
    _notes[note.id] = note
    return note

@app.get("/notes/{note_id}", response_model=Note)
def get_note(note_id: UUID) -> Note:
    note = _notes.get(note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.get("/notes", response_model=list[Note])
def list_notes() -> list[Note]:
    return list(_notes.values())

@app.patch("/notes/{note_id}", response_model=Note)
def update_note(note_id: UUID, payload: NoteIn) -> Note:
    existing = _notes.get(note_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Note not found")
    updated = existing.model_copy(update={**payload.model_dump(), "updated_at": datetime.now(timezone.utc)})
    _notes[note_id] = updated
    return updated

@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: UUID) -> None:
    if note_id not in _notes:
        raise HTTPException(status_code=404, detail="Note not found")
    del _notes[note_id]
```

`NoteIn`/`Note` split (companion §21.5) separates what a client submits from what the API returns, already anticipating that later stages will add server-only fields (an owner ID in §80, a space ID in §81) without changing the input contract client code depends on. Every mutating route raises a real `HTTPException` (companion §7.5) rather than returning a silently-empty result on a missing ID — establishing the correct-error-handling habit from the very first line of code, not deferring it to a later "add error handling" pass.

### 79.5 What Changed in the Architecture

Nothing yet — this is the founding stage. The one architecturally significant choice already visible is the `NoteIn`/`Note` schema split (§79.4), made now specifically because retrofitting it later, once client code depends on a merged input/output shape, is meaningfully more disruptive than establishing it from the start.

### 79.6 Production Considerations

None of this stage's code is production-appropriate yet, deliberately — in-memory storage, no auth, no persistence guarantees. Stating this plainly here, rather than letting the reader assume otherwise, is itself the point: knowing precisely which stage a system's current state belongs to (companion §69.4's readiness checklist) is a real engineering skill, and Stage 1 unambiguously belongs nowhere near production traffic.

### 79.7 Mini Lab

Run this stage's application locally, exercise all five routes with a real HTTP client (`curl` or `httpx`), then deliberately restart the process and observe that all data is gone — the intended, visible consequence of ADR-1's choice. Write your own one-paragraph prediction of what will break first as this capstone continues (before reading §80), then compare it against what Stage 2 actually adds.

---
