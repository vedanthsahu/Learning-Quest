## 4. Mental Model: Search and Retrieval

### 4.1 The Problem: Embeddings Alone Don't Make a Search System

§3 established that embeddings let you measure semantic similarity between two pieces of text. That alone does not yet answer a practically essential question: given a corpus of a million documents, how do you find the handful most similar to a query *quickly*, without comparing the query against all million documents one at a time? And separately: is pure semantic similarity even the right signal to rank on, or does exact keyword relevance still matter? This chapter builds the conceptual map connecting classical keyword search, modern semantic search, and the hybrid combination of both — the mental model needed before any specific algorithm (§21) or vector database (§22) makes sense.

### 4.2 BM25: Keyword Search, Done Rigorously

**BM25** is the modern, refined descendant of classical keyword search — scoring a document highly for a query if the query's terms appear frequently *in that document* but are rare *across the whole corpus* (a term appearing in every document, like "the," contributes little; a term appearing often in one document but rarely elsewhere is a strong signal), with diminishing returns for extreme term frequency and normalization for document length. It requires no embeddings, no model inference at query time, and remains extremely fast and effective specifically for queries dominated by exact or near-exact keyword matches — precisely the strength §3.4 identified for sparse representations generally.

### 4.3 Dense Retrieval: Semantic Search at the Corpus Level

**Dense retrieval** applies §3's embeddings to this problem directly: embed every document in the corpus once, in advance, and store those embeddings; at query time, embed the query and find the documents whose embeddings are closest to it. The engineering-critical detail this mental-model chapter must flag, even before any algorithm is named: comparing a query embedding against a million document embeddings one at a time, exactly, is too slow for real-time use at real corpus sizes — which is exactly why **approximate nearest-neighbor (ANN)** search exists, trading a small, controlled amount of accuracy for a very large speed improvement, developed in full mechanical detail in §21.

### 4.4 Hybrid Search: Combining Both, Deliberately

**Hybrid search** runs both BM25 (§4.2) and dense retrieval (§4.3) against the same query and combines their results — typically via a weighted score combination or a re-ranking step (§4.6) — specifically because, per §3.4's complementary-weakness argument, keyword search catches exact-term matches semantic search can miss, while semantic search catches paraphrased, intent-based matches keyword search can miss. This is not a compromise or a "best of both worlds" marketing claim — it is a direct, deliberate engineering response to the fact that neither individual method's failure mode is acceptable alone for most real-world query distributions.

### 4.5 Chunking: You Rarely Search Whole Documents

A crucial, easy-to-overlook practical reality: you almost never embed and search entire documents directly — a 50-page PDF embedded as one single vector loses far too much specific detail to be useful for finding a precise answer buried on page 30. Instead, documents are split into smaller **chunks** before embedding, and it's each chunk, not the whole document, that's actually searched and retrieved. Choosing how to chunk — by fixed size, by semantic boundary (paragraph, section), or hierarchically (small chunks for precise matching, linked back to their larger parent section for full context) — is a genuine, consequential engineering decision, not a mechanical preprocessing afterthought, and it is developed in full in §21 specifically because poor chunking is one of the most common, and most under-diagnosed, causes of poor real-world retrieval quality.

### 4.6 Reranking: A Second, More Expensive, More Accurate Pass

Initial retrieval (BM25, dense, or hybrid) is optimized for speed across a huge corpus, which means it necessarily uses a cheaper, less precise similarity computation. A **reranker** takes the initial retrieval's top candidates (a much smaller set — say, the top 50) and re-scores them using a slower, more computationally expensive, but significantly more accurate model that directly compares the query and each candidate document together (rather than comparing pre-computed, independent embeddings) — trading the speed that made initial retrieval practical for meaningfully better final ranking accuracy on a now-small candidate set. This two-stage "retrieve cheaply, then rerank expensively" pattern is one of the most consistently high-value additions to a real-world retrieval pipeline, developed mechanically (cross-encoders vs. bi-encoders, ColBERT) in §21.

### 4.7 Engineering Intuition

> **How do I know if my retrieval quality problem is a chunking problem or a search-algorithm problem?** Manually inspect what was actually retrieved for a failing query — if the right *document* was found but the specific relevant detail was diluted across too large a chunk (or split across two chunks), it's a chunking problem (§4.5); if the wrong documents were retrieved entirely, it's a search-algorithm or embedding-quality problem (§3.5-3.6).
>
> **What symptoms indicate you need reranking?** Initial retrieval frequently returns the right document somewhere in its top 20-50 results, but not reliably in the top 3-5 that actually get used — reranking (§4.6) specifically fixes this "right document, wrong rank" failure mode.
>
> **What would over-engineering look like here?** Adding a reranking stage before confirming, by manual inspection, that initial retrieval's ranking (not its recall) is actually the bottleneck — reranking adds real latency (§4.6, developed further in §38) and is wasted cost if initial retrieval simply isn't finding the right documents at all.

### 4.8 Decision Tree: Do I Need Hybrid Search and Reranking?

```
Inspect real failing queries manually. Is the RIGHT document
being retrieved at all, anywhere in the initial top-K results?
  NO  -> The problem is retrieval/embedding quality (§3.5-3.6)
         or chunking (§4.5) -- fix this first. Reranking cannot
         help if the right document was never even found.
  YES, but not ranked highly enough to be used
    -> Add reranking (§4.6).
  Are queries failing specifically on EXACT keyword/term matches
  (product codes, names) that semantic search alone misses?
    YES -> Add hybrid search (§4.4), not just reranking.
```

### 4.9 Python Snippet: A Minimal Hybrid Retrieval Combination

```python
# Demonstrates §4.4: combining a BM25 score and a dense
# similarity score into one final ranking, the core mechanic
# of hybrid search (real systems use a proper vector DB, §22,
# but the SCORING IDEA is exactly this).

from rank_bm25 import BM25Okapi

corpus = [
    "How to request a refund for a damaged item",
    "Store hours and holiday closures",
    "Getting your money back after a return",
]
tokenized_corpus = [doc.lower().split() for doc in corpus]
bm25 = BM25Okapi(tokenized_corpus)

query = "get money back"
bm25_scores = bm25.get_scores(query.lower().split())

# dense_scores would come from cosine similarity (§3.8) against
# the same corpus's embeddings -- illustrated here as pre-computed
dense_scores = [0.41, 0.05, 0.78]  # doc 2 ("money back") scores
                                    # highest on MEANING despite
                                    # low keyword overlap with doc 0

alpha = 0.5  # weighting between keyword and semantic signal
final_scores = [alpha * b + (1 - alpha) * d
                for b, d in zip(bm25_scores, dense_scores)]

ranked = sorted(zip(corpus, final_scores), key=lambda x: -x[1])
for doc, score in ranked:
    print(f"{score:.3f}  {doc}")
```

### 4.10 Further Reading

- Robertson & Zaragoza, "The Probabilistic Relevance Framework: BM25 and Beyond" — the definitive reference on BM25, also cited in the companion handbook's §54.10.
- Karpukhin et al., "Dense Passage Retrieval for Open-Domain Question Answering" (2020) — the influential paper establishing modern dense retrieval as a practical alternative/complement to keyword search.

---
