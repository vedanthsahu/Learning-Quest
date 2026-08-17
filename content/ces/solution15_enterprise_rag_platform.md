## Project 15: Enterprise RAG Platform — Solution Guide

### Business Reasoning

The business need is making the organization's own knowledge queryable in natural language, without ever letting that convenience become an authorization bypass. This project's stakes are explicitly higher than Project 14's document search: a generated answer can synthesize and paraphrase restricted content in a way that's far less obviously traceable back to its source than a plain search result listing a document title would be — the challenge's own Non-Functional Requirements state this directly, and it should shape every subsequent decision.

### Requirements Analysis

The authorization requirement here isn't merely important — it's the design's organizing constraint, ahead of even answer quality. This immediately suggests reusing an already-correct, already-tested authorization-scoped retrieval mechanism rather than building a new one specifically for this feature, since a second, independent implementation of the same access-control logic is a second place for it to be subtly wrong.

### Architecture

```
Question -> [retrieve top-k relevant chunks, authorization-scoped AT THE QUERY LEVEL]
         -> [construct prompt: retrieved chunks + explicit "answer ONLY from these" instruction]
         -> Language model generates answer
         -> Return answer + cited source chunks/documents
```

### Tradeoff Discussion

**Authorization-before-retrieval vs. retrieve-then-filter.** Filtering after retrieval (fetch broadly, then check access on each result before use) requires the filtering step to be applied correctly and completely on every single code path that touches retrieved content — any gap, anywhere, is a leak. Authorization-before-retrieval (scoping the retrieval query itself so unauthorized content is never fetched at all) makes the leak structurally impossible rather than dependent on remembering a separate step — the same "authorization inside the query" principle this series already established in Project 13's admin search and Project 14's document search, now applied at meaningfully higher stakes.

**Reusing existing authorization-scoped search vs. building a new retrieval-specific authorization layer.** Building a new, RAG-specific authorization mechanism might be tailored more precisely to retrieval's specific needs (e.g., chunk-level rather than document-level filtering), but creates a second implementation of access-control logic that must independently stay correct and in sync with the primary system's permission model — a real, ongoing maintenance and correctness risk. Reusing the existing, already-tested search authorization mechanism (as built in Project 14) means retrieval inherits a permission model that's already been verified correct for the higher-traffic, already-scrutinized search feature, at the modest cost of possibly coarser-grained (document-level, not chunk-level) filtering.

### Alternative Designs Considered and Rejected

**Retrieving relevant content broadly, then filtering for authorization before including it in the prompt.** Rejected outright — this is the challenge's first named trap, and given the project's explicitly stated highest-stakes authorization requirement, an approach relying on a separate, skippable filtering step is an unacceptable risk here specifically, even though it might be tolerable in a lower-stakes feature. **A separate, independently-built authorization system just for RAG retrieval.** Rejected — this is the challenge's second named trap: two independent implementations of the same underlying access-control logic are two places for it to diverge, and divergence here means either an incorrect leak or an incorrect over-restriction, both real problems.

### Chosen Design

Retrieval reuses the exact authorization-scoped search query pattern from Project 14 (or Project 08's simpler version, depending on document volume), applying the access-boundary filter within the retrieval query itself; retrieved chunks are included in a prompt with an explicit "answer only from the provided context" instruction; every answer returns its source chunks/documents alongside the generated text for citation and user-side verification.

### Implementation Walkthrough

```python
async def retrieve_authorized_chunks(question: str, user_id: str, session, limit: int = 5):
    accessible_doc_ids = await get_accessible_document_ids(user_id, session)   # SAME mechanism as
                                                                                  # Project 14's search
    stmt = (
        select(ChunkModel)
        .where(ChunkModel.document_id.in_(accessible_doc_ids))   # authorization INSIDE the query
        .where(ChunkModel.search_vector.match(question))
        .order_by(text("ts_rank(search_vector, plainto_tsquery('english', :q)) DESC"))
        .limit(limit)
        .params(q=question)
    )
    result = await session.execute(stmt)
    return list(result.scalars())

async def answer_question(question: str, user_id: str, session, llm_client) -> dict:
    chunks = await retrieve_authorized_chunks(question, user_id, session)
    if not chunks:
        return {"answer": "I couldn't find anything relevant you have access to.", "sources": []}

    context = "\n\n".join(f"[{c.id}] (from: {c.document_title})\n{c.text}" for c in chunks)
    prompt = (
        "Answer the question using ONLY the context below. If the context doesn't contain "
        f"the answer, say so explicitly.\n\nContext:\n{context}\n\nQuestion: {question}"
    )
    answer = await llm_client.complete(prompt)
    return {"answer": answer, "sources": [{"id": c.id, "document": c.document_title} for c in chunks]}
```

`retrieve_authorized_chunks` calls `get_accessible_document_ids`, the *same* authorization-resolution function Project 14's search already uses — not a reimplementation — directly closing the challenge's second named trap by construction rather than by discipline. The `.where(ChunkModel.document_id.in_(accessible_doc_ids))` clause is applied before the relevance-match clause, in the same query, meaning an inaccessible document's chunks are never fetched at all, closing the first named trap. `sources` returned alongside every answer directly satisfies the citation and answer-groundedness requirements, giving the user a way to independently verify the answer rather than trusting it blindly.

### Production Improvements

Invalidate or re-index a document's chunks immediately when its access permissions change (not just when its content changes), since a permission revocation must be reflected in future retrieval immediately — an access-control update is just as retrieval-relevant as a content update. Log which chunks were retrieved for every answer (not just return them to the user) to support a post-hoc audit trail confirming no unauthorized content was ever included in any generated answer, a direct, verifiable safety net for the project's highest-stakes requirement.

### Scaling Path

Chunk storage and retrieval scale using the same full-text-search-versus-dedicated-engine tradeoff as Project 08 and Project 14, reapplied at the chunk (rather than whole-document) granularity; the language-model-call step scales independently and is typically the more expensive, more latency-sensitive component, warranting its own rate limiting (Project 02) and circuit breaker (Project 07's pattern) treatment given its dependency on an external provider.

### Interview Discussion

A RAG-system question at this level almost always tests whether a candidate treats authorization as a first-class retrieval concern or as an afterthought bolted onto a generic RAG pipeline — a strong answer states, unprompted, that retrieval must be authorization-scoped from the start and explains why post-hoc filtering is insufficient, exactly the reasoning this solution guide's Tradeoff Discussion makes explicit.

### Lessons Learned

The core lesson is that reusing an already-correct, already-battle-tested authorization mechanism is a genuine engineering safety strategy, not merely a convenience — building a second, parallel implementation of the same access-control logic for a new, exciting feature (AI-powered answers) is exactly how subtle, high-consequence authorization bugs get introduced. This same reuse-don't-reimplement discipline is the deciding factor in whether Project 16's AI Copilot Platform, built on top of this project's retrieval layer, inherits correct authorization or reintroduces the same risk at a new layer.

---
