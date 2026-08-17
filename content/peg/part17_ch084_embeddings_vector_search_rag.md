## §84. Embeddings, Vector Search, and RAG in One Page

### 1. The Vocabulary

- **Embedding** — a numeric vector representing a piece of text's meaning, such that
  semantically similar text produces vectors that are close together.
- **Vector search** — finding the stored embeddings closest to a query's embedding, i.e. "find
  content with similar meaning," not just matching keywords.
- **RAG (Retrieval-Augmented Generation)** — retrieving relevant content (via vector search or
  otherwise) and including it in the prompt, so the model answers grounded in that specific
  content instead of relying purely on what it learned during training.
- **Chunking** — splitting a large document into smaller pieces before embedding, since embedding
  and retrieval work better on focused chunks than one giant document.

### 2. Where It Sits, and Why Teams Use It

RAG exists specifically to answer questions grounded in your own, current, private data — an LLM
alone only knows what it was trained on, which is neither current nor specific to your content.

### 3. What Actually Breaks

- **Retrieval finding the wrong (or no) relevant chunk** — if the chunking strategy splits related
  information across chunks awkwardly, or the embedding model doesn't capture the right
  similarity for the domain, retrieval can miss the actually-relevant content even though it
  exists in the data — the direct cause of "the RAG answer is wrong even though the document
  exists" (see §108).
- **Chunks too large or too small** — too large dilutes relevance (a chunk about many topics
  matches a query about one of them weakly); too small loses necessary surrounding context.
- **No reranking after initial retrieval** — vector search alone can return results that are
  topically similar but not the *most* relevant; a reranking step (a separate, often more
  precise pass over retrieved candidates) can meaningfully improve final relevance.
- **Confusing RAG with fine-tuning** — RAG grounds answers in retrieved content at query time and
  can be updated instantly by changing the underlying data; fine-tuning bakes information into
  model weights and requires retraining to update — they solve different problems and aren't
  interchangeable.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Embeddings capture semantic similarity, not keyword matching — vector search finds content
  that means something similar, even with completely different wording."
- "RAG's actual failure mode is almost always retrieval, not generation — if the wrong or no
  chunk gets retrieved, the model can't answer correctly regardless of how good it is."
- "RAG and fine-tuning solve different problems — RAG for current, specific, easily-updatable
  knowledge; fine-tuning for baked-in behavior or style that doesn't need to change per-query."

### 5. Interview-Ready Answer

> "RAG grounds a model's answer in your own retrieved content instead of relying purely on what it
> learned during training, which is what makes it work for current or private data. The part that
> actually determines quality is retrieval, not generation — embeddings capture semantic
> similarity, and if chunking or the embedding model doesn't surface the truly relevant piece of
> content, the model can sound confident while being wrong, because it never actually saw the
> right context. That's why I treat 'RAG gave a wrong answer' as a retrieval debugging problem
> first, not a model quality problem."

### 6. Go Deeper

companion AI Systems Handbook's §6 (Mental Model: RAG) chapter and companion AI Systems
Handbook's §23 (RAG Architectures Deep Dive) chapter (chunking strategies, reranking, hybrid
search in full depth).

---
