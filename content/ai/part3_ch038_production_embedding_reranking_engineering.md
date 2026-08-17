## 38. Production Embedding & Reranking Engineering: "Why Did Switching Embedding Models Reduce Quality?" / "Why Is Reranking Helping/Hurting Latency?"

### 38.1 The Problem: Embedding and Reranking Changes Have Effects That Are Easy to Get Backwards

§20.7 warned that embedding drift silently degrades quality without raising errors; §21.7 established reranking's speed/accuracy tradeoff. This chapter treats the two most common, specifically named production incidents in this space — a well-intentioned embedding model upgrade making things worse, and reranking's actual latency/quality effect being the opposite of what was expected — as distinct diagnosable failures with their own investigation paths.

### 38.2 Symptoms: Embedding Model Switch

Retrieval recall/precision (§21.8) drops immediately following an embedding model change, even though the new model has a better general benchmark reputation (§20.7); quality drops specifically for previously-well-performing queries, not uniformly; the drop is most visible on the existing indexed corpus's older content specifically, while newly-indexed content performs fine.

### 38.3 Symptoms: Reranking Latency/Quality

Reranking was added expecting an accuracy improvement, but overall answer quality didn't improve or got worse; reranking was added and end-to-end latency increased far more than expected for the number of candidates being reranked; reranking helps for some query types but visibly hurts others.

### 38.4 Possible Causes: Embedding Model Switch

Existing corpus content was not re-embedded with the new model (§20.7) — old embeddings from the previous model and new query embeddings from the new model are being compared as if they were in the same vector space, when they are not remotely comparable; the new embedding model's expected similarity metric (§20.6) differs from the old one (e.g., the old model guaranteed unit-length output suitable for dot product, the new one doesn't), and the vector database's configured metric wasn't updated to match; the new model's general benchmark strength doesn't transfer to your specific domain (§20.7's "test on your own queries" warning, not heeded before switching).

### 38.5 Possible Causes: Reranking

The candidate set fed into the reranker (from the first-stage retrieval, §21.7) is already so poor that no amount of reranking can recover a good final answer — reranking cannot help if the truly relevant document was never in the candidate set to begin with; the reranker itself is a general-purpose model not validated against your specific domain/query types (the same "benchmark doesn't transfer" risk as §38.4, applied to rerankers); candidate-set size (top_k fed to the reranker) is too large, adding substantial cross-encoder latency (§21.7) for marginal accuracy gain, or too small, missing genuinely relevant documents that would have been promoted by reranking had they been included in the candidate set at all.

### 38.6 Metrics

For embedding switches: retrieval recall/precision (§21.8) computed separately for content re-embedded with the new model vs. content still holding old embeddings — a direct way to detect a partial or incomplete re-embed; embedding-model version explicitly logged and tracked per indexed item (§31.3), not just at the system level. For reranking: end-to-end latency broken into first-stage retrieval time and reranking time as separate spans (§31.2); recall/precision before and after the reranking stage specifically, isolating reranking's actual marginal contribution rather than judging the combined pipeline only.

### 38.7 Investigation

For embedding issues: check first, immediately, whether every indexed item has been re-embedded with the current model version (§20.7) — this single check resolves the majority of embedding-switch incidents; if re-embedding is confirmed complete, verify the similarity metric configured in the vector database (§20.6, §22) matches what the new embedding model actually requires. For reranking issues: measure recall of the first-stage candidate set alone (§21.8) before reranking — if first-stage recall is already poor, the reranker cannot be the fix and the actual problem is upstream (§34); if first-stage recall is good, evaluate the reranker specifically on your own golden dataset (§29.2) rather than trusting its general reputation.

### 38.8 Root Cause

Frequently: an embedding model switch performed without a full corpus re-embed, sometimes because the re-embed job failed partially or silently for a subset of content (§38.4); a reranker validated only on general benchmarks, never on the specific domain's actual query/document characteristics, producing a real but domain-specific accuracy regression invisible until measured directly (§38.5); a reranking candidate-set size chosen arbitrarily rather than tuned against the actual tradeoff between first-stage recall and cross-encoder latency cost.

### 38.9 Mitigation

Complete or re-run the corpus re-embed, and add an explicit verification step confirming zero old-embedding-version items remain before considering the migration complete; correct the vector database's similarity metric configuration to match the new embedding model's requirements (§20.6); if the reranker underperforms on your domain, either replace it with one evaluated as effective for your specific query/document characteristics, or remove it if first-stage retrieval and reranking together don't outperform first-stage retrieval alone; tune candidate-set size specifically against the recall/latency tradeoff curve (§38.12) rather than an arbitrary default.

### 38.10 Tradeoffs

A full corpus re-embed has real, one-time compute cost and requires careful migration sequencing (avoiding a window where queries hit a partially-migrated, inconsistent index, directly the companion handbook's zero-downtime-migration concern, companion §34, applied to vector re-indexing); replacing a reranker with a domain-validated alternative may mean giving up general-benchmark-leading accuracy for genuinely better performance on your actual traffic — the correct tradeoff, but one that requires trusting your own evaluation over a public benchmark; a larger reranking candidate set improves the ceiling on achievable accuracy at direct additional latency cost per request.

### 38.11 Prevention

Treat embedding model version as a tracked, versioned property of every indexed item (§31.3), with automated verification that recall/precision (§21.8) hasn't degraded before considering any embedding migration complete; require domain-specific evaluation (§29.2) — not general benchmark reputation — as a gate before adopting a new embedding model or reranker in production; regression-test the reranking stage's marginal contribution (recall/precision with vs. without reranking) on every change to either the first-stage retriever or the reranker itself.

### 38.12 Engineering Intuition

> **How do I quickly tell if a post-embedding-switch quality drop is a re-embedding gap?** Check whether the drop is concentrated on older, previously-indexed content while new content performs fine (§38.2) — this pattern is close to diagnostic on its own for an incomplete re-embed, before any deeper investigation.

> **Why did adding a reranker make my system slower without improving quality?** Measure first-stage recall alone (§38.7) — if it's already poor, no reranker can fix what was never retrieved into the candidate set in the first place; the fix belongs in first-stage retrieval (§34), not the reranker.

> **What would over-engineering look like here?** Building a custom-trained reranker from scratch before evaluating whether an existing, off-the-shelf reranker — properly validated on your own domain (§38.9) rather than dismissed based on one bad initial result — already performs adequately.

### 38.13 Decision Tree: Diagnosing an Embedding or Reranking Regression

```
Did quality drop immediately after an EMBEDDING MODEL change?
  YES -> Verify 100% of corpus content was re-embedded (§20.7)
         FIRST -- check for a partial/failed re-embed job.
    Fully re-embedded and still poor? -> Check similarity metric
         configuration matches the new model's requirements (§20.6).
Did quality/latency change after adding/changing a RERANKER?
  YES -> Measure first-stage recall ALONE (§21.8) -- if already
         poor, fix upstream retrieval (§34), not the reranker.
    First-stage recall is good but reranked quality is still
    poor? -> Evaluate the reranker specifically on YOUR domain
         (§29.2), not its general benchmark reputation.
    Latency increased more than expected? -> Tune candidate-set
         size (top_k fed to reranker) against the recall/latency
         tradeoff curve.
```

### 38.14 Python Snippet: Verifying Complete Re-Embedding Before Trusting a Migration

```python
# Demonstrates §38.7/§38.11: the single highest-value check after
# any embedding model migration -- confirming ZERO stale-version
# items remain, before trusting recall metrics at all.

def verify_reembed_complete(vector_db_client, current_model_version):
    stale_items = vector_db_client.query_by_metadata(
        filter={"embedding_model_version": {"$ne": current_model_version}}
    )

    if stale_items:
        print(f"MIGRATION INCOMPLETE: {len(stale_items)} items still "
              f"hold embeddings from a prior model version. "
              f"Recall/precision metrics are UNRELIABLE until this "
              f"is resolved (§38.4).")
        return False

    print("Migration verified complete -- all items use current "
          "embedding model version.")
    return True
```

### 38.15 Further Reading

- §20.7 (Embedding Drift), §21.7 (Rerankers/ColBERT) — the primary mechanisms this chapter's two diagnostic paths depend on.
- The companion handbook's §34 (Zero-Downtime Migration) — the general migration-consistency discipline applied here to vector re-embedding.

---
