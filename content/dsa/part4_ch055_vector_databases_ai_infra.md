## §55. Vector Databases & AI Infra: FAISS, pgvector, Pinecone & HNSW in Production

### 1. Decision Snapshot

Vector databases (FAISS as a library, Pinecone/Milvus as managed services, pgvector as a
Postgres extension) exist specifically to serve the HNSW/ANN nearest-neighbor search from §27 at
production scale, over the embeddings modern AI systems produce — this chapter is the direct
payoff of §27's structural chapter.

### 2. The Problem This System Had to Solve

Modern AI systems (RAG pipelines, recommendation engines, semantic search) represent text,
images, or other content as high-dimensional embedding vectors, and need to answer "which stored
vectors are most similar to this query vector" over potentially hundreds of millions of vectors,
in milliseconds — exactly the problem §27 introduces the KD-Tree/HNSW tradeoff to solve, now at
real production scale and integrated with real databases.

### 3. Which Structures It Uses, and Why

**FAISS** (a library, not a standalone database) provides several ANN index types, most notably
HNSW (§27) and IVF (inverted-file indexes, which cluster vectors first and only search within the
most relevant clusters) — the choice between them is a direct accuracy/speed/memory tradeoff,
with HNSW generally favored when memory is available and top-tier recall matters most. **pgvector**
integrates a vector column type and ANN index (HNSW, in modern versions) directly into
PostgreSQL, letting a single query combine a normal relational `WHERE` filter with a vector
similarity search — an increasingly common real pattern ("find similar products, but only ones
in stock and under $50"), which pure vector-only databases historically handled less naturally.
**Pinecone/Milvus** are managed or self-hosted services built specifically around ANN indexing at
scale, handling sharding, replication, and index maintenance as first-class concerns, in the same
way a managed relational database handles those concerns for B+Tree-indexed data (§45-46).

### 4. Simplified Architecture Diagram

```
RAG pipeline query flow:

  User query: "How do I reset my password?"
        |
        v
  Embedding model -> query_vector [0.12, -0.44, 0.08, ... ]  (e.g. 768 dimensions)
        |
        v
  Vector index (HNSW, §27) search over millions of stored document-chunk embeddings
        |
        v
  Top-K most similar chunks returned (approximate nearest neighbors)
        |
        v
  Retrieved chunks fed into an LLM prompt as context -> generated answer

pgvector variant: same search, but combined in one SQL query:
  SELECT content FROM docs WHERE category = 'support'
  ORDER BY embedding <-> query_vector LIMIT 5;    -- ANN search + relational filter, together
```

### 5. What This Teaches You in General

This chapter is the clearest illustration in the book of a structural chapter (§27) directly
paying off in a fast-moving, high-relevance production domain — the "when to use it" answer for
HNSW isn't hypothetical, it's "whenever you're building the retrieval half of a RAG system,"
which is now one of the most common pieces of infrastructure being built in the industry.
Combining a specialized index (vector/ANN) with a traditional relational filter (pgvector's
approach) is itself a recurring pattern — a specialized structure layered onto, not replacing, an
existing well-understood system, echoing Postgres's own B+Tree-plus-heap composition (§45).

### 6. Interview Questions This Connects To

"How would you build the retrieval component of a RAG system" is directly answered by naming a
vector database/index (FAISS/pgvector/Pinecone) backed by HNSW (§27). "Why not just use a
relational database with a distance function computed per row" tests understanding that brute-
force distance computation is O(n) per query — exactly the problem ANN indexing exists to avoid,
per §27. "pgvector vs. a dedicated vector database like Pinecone" is a genuinely current systems-
design tradeoff question — dedicated services scale ANN search independently but add
operational/integration overhead; pgvector keeps everything in one system at the cost of scaling
alongside the rest of the relational workload.

### 7. Key Takeaways

- FAISS, pgvector, and Pinecone/Milvus are all production vehicles for the HNSW/ANN structure
  taught abstractly in §27 — this chapter is that chapter's direct real-world payoff.
- pgvector's ability to combine relational filters with vector similarity search in one query is
  an increasingly important real pattern for production AI applications, not just a toy example.
- The RAG-pipeline retrieval step — embed the query, ANN-search the vector index, feed results to
  an LLM — is the single most common production use of this entire chapter's content today.
- Brute-force distance computation over every stored vector is the direct alternative this
  chapter (and §27) exists to avoid at any meaningful scale.

---
