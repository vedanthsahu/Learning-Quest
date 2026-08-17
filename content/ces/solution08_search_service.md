## Project 08: Search Service — Solution Guide

### Business Reasoning

The business need is fast, reasonably relevant keyword search over a growing document collection. The genuine engineering tension is that the write path (creating documents) and the read path (searching them) have very different performance requirements, and naively coupling them — making every write pay the cost of making that document searchable — directly threatens the write-path latency requirement.

### Requirements Analysis

The write-path latency requirement and the consistency-between-systems requirement together define the core design decision: indexing must happen without blocking document creation, and whatever mechanism decouples them must not silently lose updates. This is the same class of problem the Python Backend Engineering Handbook's own capstone confronted directly (§88's ADR-10), and this project's solution draws on that reasoning explicitly.

### Architecture

```
Create document -> [write to document store] -> [asynchronously update search index]
Search query -> [query search index directly] -> ranked results (never touches primary store)
```

### Tradeoff Discussion

**PostgreSQL full-text search vs. a dedicated search engine (Elasticsearch/OpenSearch).** A database-native `tsvector` column updates automatically and transactionally with every document write — no separate indexing step or synchronization mechanism is needed at all, since the index lives inside the same transaction as the document itself. A dedicated search engine offers meaningfully more sophisticated relevance ranking and scaling specifically for search-heavy workloads, at the cost of introducing a second data store that must be kept in sync with the primary one — reintroducing exactly the consistency risk the database-native option avoids by construction.

**Synchronous vs. asynchronous indexing (when using a separate search engine).** Synchronous indexing (updating the search engine within the same request that creates the document) guarantees immediate searchability but couples document-creation latency to the search engine's own write latency and availability. Asynchronous indexing decouples them, at the cost of a brief, bounded window where a newly created document isn't yet searchable.

### Alternative Designs Considered and Rejected

**Scanning every document at query time with no index at all.** Rejected outright for any collection beyond a trivially small size — this makes query latency scale linearly with total document count, directly violating the scalability requirement the moment the collection grows past a small size. **A dedicated search engine for a small collection with simple keyword-matching needs.** Rejected as the default choice for this project's stated scope — this is the challenge's second named trap: absorbing a second system's operational and consistency cost for a search requirement a database-native solution already satisfies.

### Chosen Design

PostgreSQL full-text search (`tsvector`/`tsquery`) as the default, chosen specifically because it eliminates the dual-write consistency risk entirely for the stated scope (keyword search, no semantic similarity, moderate scale) — with an explicit note that a dedicated search engine becomes the right choice once relevance sophistication or search-specific query volume genuinely outgrows what a database-native solution provides.

### Implementation Walkthrough

```python
from sqlalchemy import Computed, Index, text

class DocumentModel(Base):
    __tablename__ = "documents"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str]
    body: Mapped[str]
    search_vector: Mapped[str] = mapped_column(
        TSVECTOR, Computed("to_tsvector('english', title || ' ' || body)", persisted=True)
    )                                              # updates automatically, same transaction

Index("ix_documents_search_vector", DocumentModel.search_vector, postgresql_using="gin")

async def search(query: str, session: AsyncSession, limit: int = 20) -> list[DocumentModel]:
    stmt = (
        select(DocumentModel)
        .where(DocumentModel.search_vector.match(query))
        .order_by(text("ts_rank(search_vector, plainto_tsquery('english', :q)) DESC"))
        .limit(limit)
        .params(q=query)
    )
    result = await session.execute(stmt)
    return list(result.scalars())

async def create_document(title: str, body: str, session: AsyncSession) -> DocumentModel:
    doc = DocumentModel(id=uuid4(), title=title, body=body)   # search_vector computed automatically
    session.add(doc)
    await session.commit()                                    # ONE transaction, no sync step needed
    return doc
```

`search_vector` as a `Computed`, database-maintained column means there is no separate indexing step, no queue, and no possibility of drift between the document store and the search index — they are, by construction, the same transaction, directly closing the challenge's fourth named trap. `ts_rank` provides relevance ranking based on term frequency and document structure, not merely raw keyword-match count, addressing the challenge's third engineering question.

### Production Improvements

Monitor query latency specifically for search queries separately from other database query latency, since a growing GIN index adds real write-side maintenance cost (Python Backend Engineering Handbook §88.6) that's worth tracking as document volume grows. If a specific query pattern (typo tolerance, phrase proximity) genuinely requires it, evaluate PostgreSQL extensions (`pg_trgm` for fuzzy matching) before jumping to a dedicated search engine, as an intermediate step that stays within the same consistency-safe architecture.

### Scaling Path

If search-specific query volume or relevance requirements eventually outgrow PostgreSQL full-text search (this project's own stated "revisit when" condition, mirroring Python Backend Engineering Handbook §88.3's ADR-10), migrate to a dedicated search engine using the Outbox pattern (§46.7) to keep the two systems in sync reliably — never a direct dual-write with no consistency mechanism.

### Interview Discussion

See Python Backend Engineering Handbook §95.2 for this exact system walked through the five-phase interview framework, and §88 for a fully-implemented version embedded in the handbook's own Fieldnote capstone, including the identical PostgreSQL-vs-dedicated-engine ADR this solution guide's Tradeoff Discussion draws from directly.

### Lessons Learned

The core lesson is that the "obvious" solution (a dedicated search engine) isn't automatically the right one — matching the storage/indexing mechanism to the actual stated scale and relevance requirements, rather than defaulting to the most powerful available tool, is the same proportionality discipline this series has already exercised in Project 04's storage-tier decision and will exercise again in Project 15 (Enterprise RAG Platform), where the stakes for getting this specific tradeoff right are considerably higher.

---
