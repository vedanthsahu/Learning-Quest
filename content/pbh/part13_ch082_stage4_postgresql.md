## 82. Stage 4: PostgreSQL Integration

### 82.1 Stage Goal

Three stages of deliberate deferral (§79.3, reaffirmed at §80.6) end here: Fieldnote migrates from in-memory dictionaries to PostgreSQL, the point at which restarting the server no longer destroys every user's data — the single largest gap between what exists so far and anything resembling a real product.

### 82.2 New Requirements

Functional: none new from the user's perspective — this stage is a pure infrastructure migration, deliberately delivering zero new user-visible behavior, a legitimate and common category of real backend work. Non-functional: data survives process restarts; concurrent writes from multiple users no longer race against each other unsafely (companion §27's isolation-level concerns, newly relevant the moment concurrent access to shared, persistent state exists).

### 82.3 ADR-4: SQLAlchemy ORM vs. Raw SQL for This Migration

**(1) Deciding:** Should the migration from in-memory dicts to PostgreSQL go through SQLAlchemy's ORM (companion §25) or through raw parameterized SQL (companion §24.2)? **(2) Options considered:** (a) raw SQL via an async driver directly; (b) SQLAlchemy Core (query builder, no object mapping); (c) full SQLAlchemy ORM with mapped model classes. **(3) Tradeoffs:** Raw SQL is maximally explicit about exactly what query runs, at the cost of hand-writing every query and losing automatic relationship loading; the full ORM provides relationship traversal (`note.space`) and a more direct mapping from Fieldnote's existing Pydantic-shaped `Note`/`Space` concepts, at the cost of the N+1 risk (companion §30.5) and lazy-loading hazards (companion §73.2) this handbook has already spent two full chapters warning about. **(4) Chosen:** Full SQLAlchemy ORM, specifically because Fieldnote's data model (notes belonging to spaces, spaces having members) is genuinely relational and benefits from relationship traversal, and because the N+1/lazy-loading risks are manageable *given that this handbook's reader already has the diagnostic tools* (§30, §73) to catch them — a choice that would be less defensible for a reader without that background. **(5) Revisit when:** A specific query path shows measured N+1 behavior that eager-loading (companion §29.6) can't cleanly resolve — at that point, dropping to Core or raw SQL for that specific path, not the whole application, is the correct scope for reopening this ADR.

### 82.4 Implementation

```python
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

class Base(DeclarativeBase):
    pass

class SpaceModel(Base):
    __tablename__ = "spaces"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200))
    notes: Mapped[list["NoteModel"]] = relationship(back_populates="space")

class NoteModel(Base):
    __tablename__ = "notes"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str]
    space_id: Mapped[UUID] = mapped_column(ForeignKey("spaces.id"))
    space: Mapped["SpaceModel"] = relationship(back_populates="notes")

engine = create_async_engine(settings.database_url, pool_size=10, max_overflow=5)  # §26.3
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_session():                    # companion §26.6's yield-based pattern
    async with SessionLocal() as session:
        yield session

@app.get("/notes/{note_id}", response_model=Note)
async def get_note(
    note_id: UUID,
    requester: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Note:
    note = await session.get(NoteModel, note_id, options=[selectinload(NoteModel.space)])
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    require_space_member(note, requester)    # unchanged from §81.4
    return note
```

`selectinload(NoteModel.space)` (companion §29.6) eagerly loads the `space` relationship in the same query pattern rather than risking an implicit lazy-load — applying §82.3's own acknowledged risk mitigation from the first line of ORM code written, not retrofitted after a problem appears. `get_session` follows the identical `yield`-based, guaranteed-cleanup dependency pattern (companion §26.6, §72.5's leak-prevention discipline) established generically much earlier in this handbook, now applied concretely for the first time in the capstone.

### 82.5 What Changed in the Architecture

Every route touching `_notes` or `_spaces` now takes a `session: AsyncSession = Depends(get_session)` parameter and awaits real queries — a mechanical but pervasive change touching every route written in Stages 1-3, the direct, felt cost of §79.3's deliberate deferral finally coming due, exactly as that ADR's "revisit when" clause predicted it would.

### 82.6 Production Considerations

A real migration tool (Alembic, companion §28) is required from this point forward for any future schema change — Stage 4 itself is the *initial* migration establishing the schema, and every later stage that changes the data model (§81's earlier `space_id` addition would, in a real project, have been an Alembic migration rather than a silent in-memory field change) must go through the same versioned-migration discipline from here on.

### 82.7 Debugging

**Symptoms:** Immediately after this migration, request latency for `GET /notes` (listing all of a space's notes) is noticeably higher than the equivalent in-memory version was. **Investigation:** Check for N+1 (companion §30.8) — a naive port of the in-memory list-comprehension logic to the ORM often iterates notes and accesses `.space.name` per note without an eager-load hint, generating one additional query per note exactly as companion §30.5 predicts. **Fix:** Add `selectinload` (or a joined load) to the list query, identical to §82.4's single-note fix.

### 82.8 Mini Lab

Using `EXPLAIN ANALYZE` (companion §30.2), compare the query plan for listing a space's notes with and without `selectinload`, and record the actual query count difference — directly connecting this stage's abstract ADR-4 discussion to a measured, concrete cost, rather than trusting the tradeoff analysis in §82.3 as a purely theoretical claim.

---
