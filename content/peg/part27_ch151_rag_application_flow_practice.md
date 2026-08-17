## §151. RAG Application Flow in Practice

### 1. The Vocabulary

- **The full pipeline** — Ingestion → Chunking → Embedding → Vector storage → Retrieval →
  (optional) Reranking → Prompt assembly → Generation → Citations — the concrete sequence of
  stages behind "we built RAG over our documents."
- **Chunking** — splitting source documents into smaller pieces before embedding, since retrieval
  works better on focused passages than whole documents, and pieces must fit in the context window
  alongside everything else.
- **Reranking** — a second-pass model that re-scores the initial vector-search results for
  relevance, since raw vector similarity alone often surfaces some marginally-relevant results
  alongside the genuinely useful ones.
- **Citations** — surfacing which source chunks the answer was actually built from, both so users
  can verify the answer and so the interviewer's implicit question ("how do you know it's not just
  making this up") has a concrete, demonstrable answer.

### 2. Where It Sits, and Why Teams Use It

RAG (retrieval-augmented generation) exists to ground a model's answers in specific, current,
private data it wasn't trained on — internal documentation, a company's own knowledge base,
recent content — without retraining the model itself. The engineering is almost entirely in the
pipeline stages before generation: bad chunking, stale indexes, or bad retrieval produce a bad
answer even from a perfectly capable model, which is why "the RAG answer was wrong" is very rarely
actually a model-quality problem (see §108's specific incident writeup).

### 3. What Actually Breaks

- **Chunks that are too large or too small** — chunks too large dilute relevance (a chunk about
  five different topics rarely matches a specific query well); chunks too small lose necessary
  surrounding context for the model to use them correctly.
- **A stale index** — the vector store isn't automatically updated when source documents change;
  without an explicit re-ingestion pipeline, RAG confidently answers from outdated information
  (the exact incident in §108).
- **Wrong access-control scoping in retrieval** — retrieval that doesn't respect the same
  permissions as the source documents can surface content to a user who shouldn't have access to
  it at all — a real security bug, not just a quality one.
- **No reranking on a system indexed at meaningful scale** — pure vector similarity search can
  return technically-similar-but-not-actually-useful chunks; a reranking step measurably improves
  answer quality once retrieval volume grows past a small demo scale.
- **No citations, so hallucination is undetectable** — without surfacing which chunks an answer
  came from, there's no way for a user (or a reviewer) to tell whether the model actually used the
  retrieved content or invented something adjacent to it.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "When a RAG answer is wrong, I check the pipeline before the model — is the index stale, are
  chunks the right size, is retrieval actually returning the relevant passage at all."
- "I make sure retrieval respects the same access controls as the underlying documents, since
  that's a security issue, not just a relevance one."
- "I surface citations so wrong or ungrounded answers are visible and checkable, not silently
  trusted."

### 5. Interview-Ready Answer

> "RAG is a pipeline, and most real problems live before the model call: ingestion and chunking
> strategy, whether the index actually gets refreshed when source documents change, and whether
> retrieval is returning genuinely relevant passages — I'd check all of that before assuming a bad
> answer means the model itself is at fault. I also make sure retrieval respects the same access
> controls as the source documents, since ungated retrieval is a real security gap, not just a
> quality one, and I surface citations so a wrong or ungrounded answer is visible rather than
> silently trusted."

### 6. Go Deeper

companion AI Systems Handbook's §23 (RAG Architectures Deep Dive) chapter and companion AI
Systems Handbook's §21 (Retrieval Mechanics: BM25, ANN, rerankers, ColBERT) chapter for full
chunking-strategy and reranking implementation details; this book's §84 (embeddings/vector search/
RAG) and §108 (AI/time/encoding mysteries, including the stale-RAG-index incident) for the
adjacent concept-level and incident-level coverage.

---
