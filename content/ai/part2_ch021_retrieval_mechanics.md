## 21. Retrieval Mechanics: BM25, Dense Retrieval, Hybrid Search, ANN Algorithms, Chunking, Rerankers, ColBERT, Retrieval Evaluation

### 21.1 The Problem: Finding the Right Documents Is a Distinct Problem from Understanding Them

§4 introduced BM25/dense/hybrid retrieval conceptually. This chapter develops the actual algorithms and the surrounding engineering decisions — chunking, approximate search, reranking — that together determine whether a RAG system (§6, §23) is actually grounded in the right information, independent of how good the generation model itself is. Every symptom in §34 ("why is retrieval poor") traces back to a specific mechanism in this chapter.

### 21.2 BM25: The Statistical Foundation of Keyword Retrieval

**BM25** scores a document's relevance to a query based on term frequency (how often query terms appear in the document — but with diminishing returns for repeated occurrences, preventing keyword-stuffing from dominating), inverse document frequency (rare terms across the whole corpus count for more than common ones, since a rare shared term is a stronger relevance signal than a common one like "the"), and document length normalization (preventing longer documents from scoring higher purely by virtue of containing more words overall). It requires no training and no embedding model at all — a pure statistical/lexical algorithm — meaning it's fast, fully interpretable (you can always explain exactly why a document scored the way it did), and reliably strong specifically for exact-term and keyword-heavy queries, directly explaining §20.3's sparse-embedding characterization.

### 21.3 Dense Retrieval: Nearest-Neighbor Search in Embedding Space

**Dense retrieval** embeds both the query and every candidate document (§20.2) into the same vector space, then finds the documents whose embeddings are closest to the query's embedding by the similarity metric appropriate to that embedding model (§20.6). Unlike BM25, this requires the documents to already be embedded and indexed in advance (§22) and requires an embedding model to be run at query time as well — additional infrastructure and latency cost compared to BM25's pure statistical lookup, justified specifically by dense retrieval's ability to match semantically related content that shares no literal keywords with the query at all.

### 21.4 Hybrid Search: Merging Two Independently-Ranked Result Sets

Mechanically, hybrid search (§20.4) runs BM25 and dense retrieval independently against the same query, then combines their separately-ranked result lists into one final ranking — most commonly via **Reciprocal Rank Fusion (RRF)**, which scores each document by the sum of the reciprocals of its rank position in each individual list (a document ranked highly by *either* method scores well, without needing the two methods' raw scores, which live on entirely different scales, to be directly comparable). This rank-based fusion approach deliberately avoids the harder, more fragile problem of normalizing and weighting BM25 scores against embedding-similarity scores directly, which live in incompatible numeric ranges with no natural common scale.

### 21.5 Approximate Nearest Neighbor (ANN) Search: HNSW, IVF, PQ, DiskANN

Exact nearest-neighbor search (comparing a query embedding against every single stored document embedding) scales linearly with corpus size — impractical for large collections. **Approximate Nearest Neighbor (ANN)** algorithms trade a small, usually negligible amount of retrieval accuracy (recall) for dramatically faster search, and are the algorithms actually running inside every production vector database (§22). **HNSW (Hierarchical Navigable Small World)** builds a multi-layer graph structure connecting similar vectors, enabling search to navigate quickly toward the right neighborhood rather than scanning everything — currently the most widely used ANN algorithm, offering an excellent speed/accuracy tradeoff at the cost of significant index memory overhead. **IVF (Inverted File Index)** partitions the vector space into clusters ("cells") in advance, so a query only needs to search within the most relevant few clusters rather than the entire dataset — lower memory overhead than HNSW but generally somewhat lower recall for a comparable speed budget. **PQ (Product Quantization)** compresses each vector into a much smaller, approximate representation, trading some accuracy for dramatically reduced memory footprint — frequently combined *with* IVF (as "IVF-PQ") rather than used alone, addressing memory constraints specifically at very large scale. **DiskANN** is designed specifically to serve ANN search efficiently from disk rather than requiring the entire index to fit in RAM, targeting the specific constraint of very large corpora where full in-memory indexing (HNSW's typical assumption) becomes prohibitively expensive.

### 21.6 Chunking Strategies: Deciding What a "Document" Actually Means for Retrieval

Before any embedding or indexing happens, source documents must be split into **chunks** — retrieval and generation both operate on chunks, not whole documents, directly because embedding an entire long document into one vector loses too much specific detail (§20.2's pooling averages information across the whole input) and because a chunk, not a full document, is what actually gets inserted into a model's context window (§15.5). **Fixed-size chunking** (splitting every N tokens) is simple but can arbitrarily cut sentences or ideas in half. **Semantic chunking** splits at natural boundaries (paragraphs, sections, detected topic shifts) instead, generally producing more coherent, self-contained chunks at the cost of more complex preprocessing. **Chunk overlap** (including a small amount of the previous chunk's end at the start of the next) reduces the risk of a critical piece of information being split exactly across a chunk boundary and therefore never fully present in any single retrieved chunk. Chunk size itself is a genuine tradeoff: smaller chunks retrieve more precisely (less irrelevant surrounding text) but risk losing surrounding context a larger chunk would have preserved; larger chunks preserve more context but dilute retrieval precision and consume more of the context window (§15.5) per retrieved item.

### 21.7 Rerankers: Cross-Encoders, Bi-Encoders, and ColBERT

The embedding-based retrieval described in §21.3 uses a **bi-encoder** approach: query and document are embedded completely independently, and only compared afterward via a simple similarity metric — fast (documents can be pre-embedded and indexed in advance) but less accurate than it could be, since the model never directly compares the query and document together. A **cross-encoder reranker** instead takes a query and a *specific candidate document* together as joint input, producing a direct, highly accurate relevance score — far more accurate than a bi-encoder's independent-embedding approach, but far too slow to run against an entire corpus, since it requires a full model forward pass per query-document pair rather than a cheap vector comparison. The standard production pattern is therefore two-stage: use fast bi-encoder retrieval (or hybrid search, §21.4) to narrow a large corpus down to a small candidate set (tens to low hundreds of documents), then apply a cross-encoder reranker only to that small set to produce the final, high-precision ranking — combining bi-encoder speed with cross-encoder accuracy at a cost proportional only to the small candidate set, not the whole corpus. **ColBERT** offers a middle ground: it embeds query and document tokens independently (like a bi-encoder, enabling pre-indexing) but preserves per-token vectors rather than pooling to one vector each, computing a more fine-grained "late interaction" similarity at query time — meaningfully more accurate than a standard bi-encoder while remaining far cheaper than a full cross-encoder, at the cost of a larger index (storing per-token vectors rather than one vector per document).

### 21.8 Retrieval Evaluation: Measuring Whether the Right Documents Were Actually Found

§12.4 introduced RAGAS's separation of retrieval quality from generation quality; the underlying retrieval-specific metrics include **Recall@k** (of all truly relevant documents, what fraction appear somewhere in the top k retrieved) and **Precision@k** (of the top k retrieved, what fraction are actually relevant) — measured against a golden dataset of queries paired with known-relevant documents (§12.2's principle, applied specifically to retrieval), independent of whatever the generation model does with those documents afterward. This separation matters directly for diagnosis (§34): a low overall RAG quality score with high retrieval recall points to a generation/prompting problem, while low retrieval recall itself points squarely at chunking, embedding choice, or indexing — genuinely different fixes for genuinely different root causes.

### 21.9 Engineering Intuition

> **How do I know if my RAG system's problem is retrieval or generation?** Directly measure retrieval recall/precision (§21.8) against a golden dataset independent of the final generated answer — never diagnose a RAG quality problem by only looking at the final output text, since that conflates two genuinely separate failure modes (§34).

> **Should I add a reranker to my retrieval pipeline?** If your bi-encoder or hybrid retrieval's top results are frequently "roughly relevant but not quite right, with the truly best document ranked lower than it should be," a cross-encoder reranker (§21.7) directly addresses exactly this symptom — verify with retrieval evaluation before and after adding it.

> **What would over-engineering look like here?** Implementing custom ANN algorithms (§21.5) or a custom ColBERT-style late-interaction system before confirming that an off-the-shelf vector database's built-in HNSW/IVF implementation (§22) and a standard hosted reranker API don't already meet your latency and accuracy requirements.

### 21.10 Decision Tree: What Retrieval Mechanism Do I Actually Need?

```
Do real queries frequently rely on exact terms/codes/rare
keywords?
  YES -> Add BM25 or hybrid search (§21.2, §21.4), not dense
         retrieval alone.
Is your corpus large enough that exact nearest-neighbor search
is measurably too slow?
  YES -> You need an ANN index (§21.5) -- HNSW is the reasonable
         default; consider DiskANN specifically if the index
         can't fit in RAM, or IVF-PQ specifically if index
         memory footprint is the binding constraint.
Does retrieval evaluation (§21.8) show good recall (right
documents ARE being retrieved) but poor final ranking precision
(right document is retrieved but not ranked first)?
  YES -> Add a cross-encoder reranker (§21.7) as a second stage
         -- this is precisely the symptom reranking fixes.
Are chunks frequently missing needed surrounding context, or
frequently too broad/diluted?
  -> Revisit chunk size and overlap (§21.6) -- this is usually
     a higher-leverage fix than switching embedding models.
```

### 21.11 Python Snippet: A Minimal Two-Stage Retrieve-Then-Rerank Pipeline

```python
# Demonstrates §21.7's standard production pattern: cheap
# bi-encoder/BM25 retrieval narrows the corpus, then a slower,
# more accurate reranker scores only the small candidate set.

def retrieve_and_rerank(query, corpus, bi_encoder_search_fn,
                         cross_encoder_score_fn, top_k=50, final_k=5):
    # Stage 1: fast, cheap retrieval over the FULL corpus (§21.3-21.5)
    candidates = bi_encoder_search_fn(query, corpus, top_k=top_k)

    # Stage 2: slow, accurate reranking over only the SMALL
    # candidate set (§21.7) -- cost is proportional to top_k,
    # not the full corpus size
    scored = [(doc, cross_encoder_score_fn(query, doc)) for doc in candidates]
    scored.sort(key=lambda pair: pair[1], reverse=True)

    return [doc for doc, score in scored[:final_k]]

# bi_encoder_search_fn and cross_encoder_score_fn are provided by
# a vector DB client (§22) and a reranker API/model respectively --
# this function's value is purely in the TWO-STAGE STRUCTURE.
```

### 21.12 Further Reading

- Robertson & Zaragoza, "The Probabilistic Relevance Framework: BM25 and Beyond" (2009) — the definitive reference for §21.2.
- Malkov & Yashunin, "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs" (2018) — the primary source for §21.5's HNSW.
- Khattab & Zaharia, "ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT" (2020) — the primary source for §21.7's ColBERT.

---
