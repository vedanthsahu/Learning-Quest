## 34. Production Retrieval Quality Engineering: "Why Is Retrieval Poor?"

### 34.1 The Problem: "The Chatbot Gave a Bad Answer" Conflates Two Genuinely Different Failure Modes

§21.9 previewed this chapter's core diagnostic split: a poor RAG answer might mean the wrong documents were retrieved, or the right documents were retrieved but the model failed to use them correctly. Without measuring retrieval quality independently (§21.8), every RAG quality complaint gets investigated as if it might be either cause, wasting engineering effort on the wrong half of the pipeline.

### 34.2 Symptoms

Answers cite or reference information not present in any retrieved document (a generation problem, not retrieval — see §35 for the hallucination-specific treatment); answers miss information that genuinely exists in the corpus (a retrieval problem); retrieval quality was acceptable at launch but has degraded over time; retrieval quality varies sharply by query type or phrasing.

### 34.3 Possible Causes

Chunking strategy (§21.6) splitting relevant information across chunk boundaries or producing chunks too large/diluted to rank well; embedding drift (§20.7) from an unnoticed model version change without re-embedding; corpus growth outgrowing an ANN index's original tuning (§21.5, recall degrading as scale increases past what HNSW/IVF parameters were set for); a query needing multi-hop reasoning or relationship traversal that naive single-pass retrieval (§23.2) structurally cannot support; missing or misconfigured metadata filtering (§13.4) causing irrelevant cross-tenant or cross-category content to compete in the ranking; absence of a reranking stage (§21.7) allowing a technically-relevant-but-not-best document to rank below better alternatives.

### 34.4 Metrics

Recall@k and Precision@k (§21.8) measured against a golden dataset of queries with known-relevant documents — the primary, generation-independent retrieval metrics; embedding-model version and last full re-embedding timestamp, tracked explicitly; ANN index configuration and corpus size over time; retrieval latency (cross-referenced with §32 if retrieval itself is also a latency contributor).

### 34.5 Investigation

Run the golden retrieval dataset (§29.2, §21.8) directly against the current retrieval pipeline, independent of generation, to get an objective recall/precision baseline; if recall is low, inspect specific failing queries' retrieved chunks manually to determine whether the relevant information exists in the corpus at all (a coverage/chunking problem) or exists but ranks too low (a scoring/reranking problem); check whether embedding model version changed without a full re-embed (§20.7) as a first, cheap check before deeper investigation.

### 34.6 Root Cause

Frequently one of: an embedding model upgrade that wasn't accompanied by re-embedding existing indexed content (§20.7) — the single most common silent cause; chunk size mismatched to the actual granularity of user queries (queries asking about specific facts against chunks sized for broad topics, or vice versa, §21.6); absence of hybrid search (§21.4) for a corpus/query mix with frequent exact-term or code/identifier queries (§20.3); an ANN index's recall-affecting parameters (companion to §21.5) never re-tuned as corpus size grew by an order of magnitude past initial testing.

### 34.7 Mitigation

Re-embed the full corpus immediately if an embedding-model-version mismatch is found (§20.7); adjust chunk size/overlap (§21.6) and re-index if chunking is the identified cause; add hybrid search (§21.4) if exact-term queries are underperforming; add or re-tune the ANN index configuration (§21.5) for current corpus scale; add a reranking stage (§21.7) if recall is acceptable but final ranking precision is poor.

### 34.8 Tradeoffs

Re-embedding a large corpus has real, one-time compute cost and downtime/consistency considerations (companion §34's migration-consistency concerns apply directly to a full re-index); smaller chunks improve precision but may lose surrounding context, requiring overlap tuning (§21.6) as a compensating adjustment; adding hybrid search and reranking (§21.4, §21.7) both add latency and infrastructure complexity that must be weighed against the measured quality gain.

### 34.9 Prevention

Automated retrieval-quality regression testing (§21.8, §29.5) on every embedding model, chunking, or indexing change — treating retrieval quality with the same CI rigor as generation quality; explicit change-management discipline requiring a full re-embed whenever the embedding model version changes, enforced as a deployment checklist item, not left to individual engineer memory; periodic re-evaluation of ANN index parameters as corpus size grows past defined thresholds.

### 34.10 Engineering Intuition

> **How do I quickly tell if a RAG quality complaint is a retrieval problem or a generation problem?** Pull the actual retrieved chunks for the failing query and check manually whether the correct information is present among them (§34.5) — if yes, the problem is generation/prompting (§35); if no, the problem is retrieval, and generation-side fixes will not help at all.

> **Why did retrieval quality degrade gradually rather than after a specific deployment?** Gradual degradation strongly suggests corpus growth outpacing ANN index tuning (§34.6) rather than a discrete code change — check corpus size trend against when the index was last tuned, not recent deployments.

> **What would over-engineering look like here?** Adding Graph RAG (§23.7) or an agentic multi-hop retrieval loop (§23.6) to fix a retrieval-quality problem that's actually caused by stale embeddings (§20.7) — always rule out the cheap, common causes before adopting a more complex RAG architecture.

### 34.11 Decision Tree: Diagnosing Poor Retrieval

```
Does the correct information EXIST in the retrieved chunks for
failing queries (checked manually, §34.5)?
  NO  -> This is a retrieval problem. Check embedding-model
         version/re-embed status (§20.7) FIRST -- cheapest,
         most common cause.
    Still poor after confirming embeddings are current?
      -> Check chunking strategy (§21.6) and whether hybrid
         search (§21.4) is needed for your query mix.
  YES (info is retrieved but answer is still wrong/incomplete)
    -> This is a GENERATION problem -- see §35 (hallucination
         diagnosis), not this chapter.
Is the top-ranked result rarely the actually-best one, even
though good candidates ARE somewhere in the retrieved set?
  YES -> Add a reranking stage (§21.7).
Did retrieval quality degrade as corpus size grew significantly?
  YES -> Re-tune ANN index parameters for current scale (§21.5).
```

### 34.12 Python Snippet: A Retrieval-Only Regression Test

```python
# Demonstrates §34.5/§34.9: measuring retrieval recall directly,
# INDEPENDENT of generation -- run this on every embedding/
# chunking/indexing change, not just periodically.

def retrieval_recall_at_k(golden_queries, retrieve_fn, k=5):
    # golden_queries: list of {"query":..., "relevant_doc_ids": set(...)}
    total_recall = 0
    for item in golden_queries:
        retrieved_ids = {doc.id for doc in retrieve_fn(item["query"], top_k=k)}
        found = len(retrieved_ids & item["relevant_doc_ids"])
        total_recall += found / len(item["relevant_doc_ids"])

    return total_recall / len(golden_queries)

# Run this BEFORE and AFTER any embedding model upgrade, chunking
# change, or ANN index re-tune -- a drop flags a regression before
# it reaches production, exactly the CI discipline §34.9 requires.
```

### 34.13 Further Reading

- §20.7 (Embedding Drift), §21.6 (Chunking), §21.8 (Retrieval Evaluation) — the primary mechanisms this chapter's diagnostic framework relies on.
- The companion handbook's §57 (Incident Response Deep Dive) — the general diagnostic discipline this chapter specializes for retrieval.

---
