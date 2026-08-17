## 88. Stage 10: Search

### 88.1 Stage Goal

Since §84, note content has been indexed into a placeholder Redis token set — a stand-in explicitly scoped to "move indexing off the request path," never intended as a real search implementation (§84.3's ADR-6 said so directly). This stage builds the actual search capability that placeholder was always meant to be replaced by.

### 88.2 New Requirements

Functional: `GET /search?q=...` returning notes matching a query, restricted to spaces the requester belongs to, ranked by relevance rather than returned in arbitrary order. Non-functional: search must respect the exact same authorization boundary as direct note access (companion §81.2) — a matching note in a space the requester doesn't belong to must never appear in results, an easy boundary to accidentally weaken when introducing a new, separate query path.

### 88.3 ADR-10: PostgreSQL Full-Text Search vs. a Dedicated Search Engine

**(1) Deciding:** Should search be implemented using PostgreSQL's built-in full-text search (`tsvector`/`tsquery`, companion §37.7) or a dedicated search engine (Elasticsearch/OpenSearch, companion §37.7's alternative)? **(2) Options considered:** (a) PostgreSQL full-text search, using a `tsvector` column and a GIN index on existing note data; (b) a dedicated search engine, requiring notes to be duplicated into a separate, purpose-built index. **(3) Tradeoffs:** PostgreSQL full-text search requires no new infrastructure and keeps search data transactionally consistent with the notes themselves (a note update and its search-index update can happen in one transaction), but its relevance-ranking and query-feature set (fuzzy matching, faceted search) are meaningfully less sophisticated than a dedicated engine's; a dedicated search engine offers superior ranking and scaling for search specifically, at the cost of a second data store that must be kept in sync with PostgreSQL — precisely the dual-write consistency problem companion §46.7's Outbox pattern exists to solve, a real, ongoing operational cost. **(4) Chosen:** PostgreSQL full-text search — Fieldnote's stated requirement (§88.2) is straightforward keyword matching within an authorization boundary, not advanced relevance tuning or search-specific scaling, and companion §108.10's proportionality principle argues against absorbing a dedicated search engine's sync-consistency cost for a requirement this modest. **(5) Revisit when:** Search relevance quality becomes a genuine, stated product concern, or search query volume grows large enough to compete meaningfully with transactional query load on the same database — at that point, the Outbox-pattern-mediated sync to a dedicated engine (companion §46.7) becomes the concrete migration path.

### 88.4 Implementation

```python
from sqlalchemy import Computed, Index, text, select

class NoteModel(Base):
    # ... existing columns from §82.4 ...
    search_vector: Mapped[str] = mapped_column(
        TSVECTOR, Computed("to_tsvector('english', title || ' ' || body)", persisted=True)
    )

Index("ix_notes_search_vector", NoteModel.search_vector, postgresql_using="gin")  # companion §30.2

@app.get("/search", response_model=list[Note])
async def search_notes(
    q: str,
    requester: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Note]:
    member_space_ids = await get_member_space_ids(requester, session)   # reuses §83's cached lookup
    stmt = (
        select(NoteModel)
        .where(NoteModel.space_id.in_(member_space_ids))                 # authorization FIRST (§88.2)
        .where(NoteModel.search_vector.match(q))
        .order_by(text("ts_rank(search_vector, plainto_tsquery('english', :q)) DESC"))
        .params(q=q)
    )
    results = await session.execute(stmt)
    return [Note.model_validate(n) for n in results.scalars()]
```

`search_vector` as a `Computed`, database-maintained column means the search index updates automatically and transactionally with every note write — no separate indexing task is needed at all for the authoritative search data, quietly retiring §84's placeholder Redis-token approach entirely rather than needing an explicit migration step. The `.where(NoteModel.space_id.in_(member_space_ids))` clause is applied *before* the text-match clause and is structurally impossible to bypass, since it's part of the same query rather than a separate, later filtering step — directly satisfying §88.2's authorization-boundary requirement at the query level rather than trusting a post-query filter to catch every case.

### 88.5 What Changed in the Architecture

`index_note_task` (§85.4) and its Redis token-set write are now dead code and should be deleted, not merely left in place — an explicit, honest acknowledgment that companion §78.6's "no artificial reasons to add technology" principle cuts both ways: a mechanism introduced for a real, stated reason at one stage can become genuinely obsolete at a later stage, and leaving obsolete code in place would misrepresent the system's actual current architecture to any future reader.

### 88.6 Production Considerations

The GIN index on `search_vector` adds real write-side cost to every note insert/update (companion §30's general index-maintenance tradeoff) — an explicit, worthwhile cost given search is now a stated, required feature, but worth monitoring as note-write volume grows, since it's the concrete mechanism by which ADR-10's "search query volume grows large" revisit trigger would actually manifest as a measurable symptom.

### 88.7 Debugging

**Symptoms:** A newly created note doesn't appear in search results even seconds after creation, despite `search_vector` being a `Computed` column that should update immediately on write. **Investigation:** Confirm the query's `member_space_ids` actually includes the note's space — since this failure mode is indistinguishable, from the requester's point of view, between "the index hasn't updated" and "you don't have access to this note," exactly as §88.2's authorization design intends; this ambiguity is a deliberate, accepted tradeoff of the identical-404-style discretion (companion §81.4) applied here to search results rather than a bug to fix.

### 88.8 Mini Lab

Delete the now-dead `index_note_task` and its Redis token-set code entirely, confirm the test suite (companion §51) still passes without it, and update the deployment-readiness checklist (companion §69.4) to remove the Celery indexing-queue monitoring item that no longer applies — practicing the equally important, often-neglected discipline of retiring architecture, not only adding it.

---
