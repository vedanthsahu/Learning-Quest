## 89. Stage 11: AI Integration

### 89.1 Stage Goal

§78.2 named natural-language question-answering over a user's own notes as Fieldnote's eventual capstone feature. Every prior stage has been building toward this moment: real persistence (§82), authorization (§81), and search (§88) are the exact prerequisites a retrieval-augmented generation (RAG) feature needs, and this stage assembles them into one.

### 89.2 New Requirements

Functional: `POST /ask` accepting a natural-language question, returning an answer grounded in the requester's own accessible notes, along with which notes it was drawn from. Non-functional: the same authorization boundary as search (§88.2) applies without exception — a question must never be answered using content from a space the requester doesn't belong to, now a substantially higher-stakes requirement than for keyword search, since a generated answer can synthesize and restate content in ways that make an authorization leak far less obvious to notice than a leaked search result would be.

### 89.3 ADR-11: Retrieve-Then-Generate vs. Sending All Notes to the Model

**(1) Deciding:** Should answering a question retrieve a small, relevant subset of the requester's notes to include in a model prompt, or should the model be given the requester's entire note collection every time? **(2) Options considered:** (a) retrieve the top-k most relevant notes (via §88's full-text search, or a vector-similarity search) and include only those in the prompt; (b) include every note the requester has access to in every prompt, regardless of relevance. **(3) Tradeoffs:** Sending everything guarantees the model never misses a relevant note due to imperfect retrieval, but is bounded by the model's context window (a hard technical ceiling once note count grows) and multiplies both cost and latency with total note volume, most of which is irrelevant to any single question; retrieval bounds cost and latency to a fixed, small number of notes regardless of total collection size, at the cost of depending on retrieval quality — a genuinely relevant note that retrieval fails to surface simply won't inform the answer. **(4) Chosen:** Retrieve-then-generate using §88's existing full-text search as the retrieval mechanism — reusing infrastructure already built and already authorization-scoped correctly (§88.4's query-level filter), rather than introducing a separate vector database and embedding pipeline whose own authorization scoping would need to be built and verified independently, a real, avoidable risk given how much more silently an authorization gap fails in a generated-answer context (§89.2). **(5) Revisit when:** Full-text keyword retrieval's relevance quality is measurably insufficient for the kinds of questions users actually ask (a conceptual, non-keyword-matching question a keyword search structurally cannot retrieve for) — at that point, adding embedding-based vector retrieval alongside, not replacing, the existing search infrastructure is the concrete next step, with the same authorization-at-the-query-level discipline applied to it from day one.

### 89.4 Implementation

```python
@app.post("/ask")
async def ask(
    question: str,
    requester: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    member_space_ids = await get_member_space_ids(requester, session)

    # Retrieval reuses §88's authorization-scoped search query directly -- not a new,
    # separately-verified code path (ADR-11's core risk-reduction choice).
    stmt = (
        select(NoteModel)
        .where(NoteModel.space_id.in_(member_space_ids))
        .where(NoteModel.search_vector.match(question))
        .order_by(text("ts_rank(search_vector, plainto_tsquery('english', :q)) DESC"))
        .limit(5)                                            # bounded retrieval (ADR-11)
        .params(q=question)
    )
    results = await session.execute(stmt)
    retrieved_notes = list(results.scalars())

    if not retrieved_notes:
        return {"answer": "I couldn't find anything relevant in your notes.", "sources": []}

    context = "\n\n".join(f"[{n.id}] {n.title}\n{n.body}" for n in retrieved_notes)
    prompt = (
        "Answer the question using ONLY the notes below. If the notes don't contain "
        f"the answer, say so.\n\nNotes:\n{context}\n\nQuestion: {question}"
    )
    answer = await llm_client.complete(prompt)                # companion §32's async HTTP client

    return {"answer": answer, "sources": [str(n.id) for n in retrieved_notes]}
```

The retrieval query is textually identical in its authorization clause to §88.4's `search_notes` — not merely similar, but the *same* filter expression, minimizing the chance that a future edit to one query's authorization logic silently diverges from the other's, exactly the risk ADR-11 flagged as uniquely dangerous for this feature (§89.2). The prompt's explicit instruction to answer "using ONLY the notes below" is a real, if imperfect, mitigation against the model fabricating an answer beyond the retrieved, authorization-scoped context — a mitigation, not a guarantee, and stated as such rather than overclaiming reliability the mechanism doesn't actually provide.

### 89.5 What Changed in the Architecture

A new `llm_client` external dependency joins PostgreSQL, Redis, the Celery broker, and object storage — following the identical timeout/retry discipline (companion §32.4-32.5) every other external dependency in this capstone has followed since §82, rather than treating an AI provider call as somehow exempt from the resilience practices already established for every other outbound call.

### 89.6 Production Considerations

`sources` is returned alongside every answer specifically so a user can verify which of their own notes actually informed a given answer (companion AI Systems Handbook's grounding/traceability principle) — a feature-level design choice, not an incidental implementation detail, directly serving the trust requirement any RAG feature over personal, authorization-sensitive data implicitly carries.

### 89.7 Debugging

**Symptoms:** An answer references information that doesn't appear in any of the notes listed in `sources`. **Investigation:** This is model fabrication (hallucination) despite the prompt's explicit instruction (§89.4) — instruction-following is a real mitigation but never a hard guarantee; verify by checking whether the fabricated content is at least topically plausible given the retrieved notes (suggesting the model over-extended beyond its grounding) or entirely unrelated (suggesting a more severe prompt-construction or retrieval bug). **Fix:** Consider post-hoc verification (checking the answer's claims against the retrieved notes programmatically) for higher-stakes deployments, an explicit escalation beyond what this stage's implementation provides, appropriately scoped as a stated limitation rather than silently ignored.

### 89.8 Mini Lab

Deliberately ask a question whose answer exists only in a note belonging to a space the requester is *not* a member of, and confirm the response is the same "I couldn't find anything relevant" fallback a genuinely unanswerable question would produce — directly verifying that ADR-11's authorization-boundary reuse actually holds under this feature's higher-stakes requirement (§89.2), not just under search's original, lower-stakes one.

---
