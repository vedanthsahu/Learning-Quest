## 5. Mental Model: Vector Databases

### 5.1 The Problem: Storing and Searching Millions of Embeddings Efficiently

§4.3 flagged that comparing a query embedding against every document embedding one at a time doesn't scale. A **vector database** is purpose-built storage and query infrastructure solving exactly this problem: storing large numbers of embeddings durably, indexing them for fast approximate similarity search (§4.3's ANN algorithms, developed mechanically in §21), and — in most real products — storing metadata alongside each vector so results can be filtered (only search this user's documents, only this date range) as well as ranked by similarity.

### 5.2 Why This Isn't "Just Use a Regular Database"

A conventional relational or document database is built around exact-match and range queries on structured fields (the companion handbook's §6-7) — it has no native concept of "find the vectors closest to this one" at the scale and speed a real product needs, for exactly the same reason a conventional B-Tree index (companion handbook §31.2) doesn't help you find approximately similar high-dimensional points. This is a direct, specific instance of the companion handbook's broader point (§21 there) that fuzzy relevance and similarity search require fundamentally different indexing structures than exact-match querying — a vector database is that specialized indexing structure, purpose-built for the embeddings use case specifically.

### 5.3 What a Vector Database Actually Does, End to End

```
Ingestion (once, or continuously as content is added):
   Document -> Chunk (§4.5) -> Embed (§3) -> Store vector +
   metadata in the vector database's index

Query (every request):
   User query -> Embed -> ANN search against the index (§21) ->
   top-K nearest vectors, optionally filtered by metadata ->
   return the corresponding original chunks/documents
```

### 5.4 The Real Engineering Choice: Which Vector Database, and Why That's a Smaller Decision Than It Feels

A large and growing number of vector database products exist (FAISS, Milvus, Qdrant, Pinecone, Weaviate, Chroma, pgvector, and others, cataloged with concrete tradeoffs in §22), and it is tempting to treat "which vector database" as the central architectural decision in a RAG system. It usually isn't. The mechanism — embed, index approximately, search, filter — is nearly identical across all of them, and the actual decision criteria are the same operational questions the companion handbook asks of any data store: do you want a fully-managed service or self-hosted infrastructure (companion §13.4), how large is your corpus and how fast is it growing, do you need it alongside an existing relational database you already operate (favoring pgvector, an extension to Postgres, over standing up an entirely separate system), and what filtering/metadata capabilities does your product actually need. Treating this as a smaller, later decision — after the retrieval architecture and chunking strategy are validated — rather than the first decision made, is directly consistent with this handbook's ordering discipline (§0.1.1): architecture and data model before specific technology.

### 5.5 Engineering Intuition

> **How do I know if I need a dedicated vector database at all?** At small corpus sizes (a few thousand documents), even a simple, brute-force exact similarity search held in memory can be fast enough — a dedicated vector database earns its operational cost once corpus size and query volume genuinely require approximate, indexed search (§21) to stay fast.
>
> **What symptoms indicate the wrong vector database was chosen for the actual requirement?** Needing complex metadata filtering that the chosen product handles poorly or slowly; needing a self-hosted, fully-controlled deployment while using a managed-only product (or vice versa, paying for managed convenience nobody needed).
>
> **What would over-engineering look like here?** Evaluating and choosing a vector database before validating, with a small prototype, that retrieval-augmented generation is even the right architecture for the product's actual requirement (§6) — the vector database is an implementation detail of a decision that should come first.

### 5.6 Decision Tree: Which Vector Database Category Fits?

```
Do you already run PostgreSQL for other application data, and
is your vector search volume moderate (not extreme scale)?
  YES -> pgvector (§22) -- avoids operating an entirely separate
         database system for a moderate need.
  NO  -> Do you want a fully-managed service with no
         infrastructure to operate?
    YES -> Pinecone or a similar managed offering (§22).
    NO  -> Do you need to embed vector search directly INSIDE
           an application process (no separate server at all)?
      YES -> FAISS (a library, not a server, §22).
      NO  -> Self-hosted, dedicated vector database (Milvus,
             Qdrant, Weaviate, Chroma, §22) -- compare on
             metadata filtering needs, scale, and operational
             maturity for your specific requirement.
```

### 5.7 Python Snippet: The Core Mechanism, Without Any Specific Vector Database

```python
# Demonstrates §5.3's full loop using nothing but a plain
# in-memory list -- exactly what a vector database automates
# and makes fast/scalable/durable, but the CORE MECHANISM is
# identical, and worth seeing without a specific product's API.

import numpy as np

# "index": a list of (vector, metadata) pairs -- what a vector
# DB stores and makes fast to search at scale
index = [
    (np.array([0.9, 0.1, 0.0]), {"text": "refund policy", "user": "A"}),
    (np.array([0.1, 0.9, 0.0]), {"text": "store hours", "user": "A"}),
    (np.array([0.85, 0.15, 0.0]), {"text": "how to return an item", "user": "B"}),
]

def cosine_sim(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def search(query_vector, top_k=2, filter_user=None):
    candidates = index
    if filter_user:  # metadata filtering, §5.1/§5.3
        candidates = [c for c in candidates if c[1]["user"] == filter_user]
    scored = [(cosine_sim(query_vector, vec), meta) for vec, meta in candidates]
    scored.sort(key=lambda x: -x[0])
    return scored[:top_k]

query = np.array([0.88, 0.12, 0.0])  # embedding of "get my money back"
results = search(query, top_k=2, filter_user="A")
for score, meta in results:
    print(f"{score:.3f}  {meta['text']}")
```

### 5.8 Further Reading

- Malkov & Yashunin, "HNSW" (2016) — already cited in the companion handbook's §54.10; the algorithm underlying most modern vector databases' indexing, developed mechanically in §21.
- Each vector database's own "when to choose us" documentation (Pinecone, Qdrant, Weaviate, Milvus) — read comparatively, not individually, per §5.4's guidance.

---
