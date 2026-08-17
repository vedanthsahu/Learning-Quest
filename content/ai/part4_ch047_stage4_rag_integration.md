## 47. Nova Stage 4: RAG Integration

### 47.1 What Broke

Users increasingly ask Nova questions about their own organization's documents, product manuals, or internal knowledge — information the underlying model was never trained on and has no way to know. Nova confidently answers from general pretrained knowledge or admits ignorance, neither of which satisfies the actual need.

### 47.2 Why

A model's knowledge is fixed at training time (§1.6) and cannot include a specific organization's private, current documents — the exact gap RAG (§6, §23) exists to close, by retrieving relevant document content at query time and including it directly in the prompt rather than requiring that knowledge to be baked into model weights.

### 47.3 Candidates and Their Costs

**Option A — fine-tune Nova on the organization's documents:** Directly violates §9.7/§26.7's "when NOT to fine-tune" principle — the need here is retrievable, frequently-updated factual knowledge, exactly the case fine-tuning is the wrong tool for. **Option B — naive RAG (§23.2):** Simplest to implement — embed documents, retrieve top-k chunks, include in prompt — but with known weaknesses (irrelevant retrieval, no correction mechanism) acceptable to accept initially and address later if evaluation shows they matter. **Option C — a more sophisticated RAG variant (Corrective, Agentic, §23.4/23.6) from the start:** Premature complexity before naive RAG has even been evaluated against real Nova queries — directly the over-engineering pattern §23.10 warns against.

### 47.4 Chosen Solution

Option B: naive RAG, using a managed vector database (Pinecone or pgvector if Nova is already using Postgres, §22.9's selection framework) for document storage, semantic chunking with overlap (§21.6), a general-purpose dense embedding model (§20.2), and explicit grounding/citation instructions (§23.9) added to Nova's prompt. Critically, this RAG context is inserted into the prompt *after* the existing cacheable stable prefix (§46.4) but *before* the variable conversation-history suffix, requiring a small but important prompt-structure revision to preserve as much caching benefit as still possible.

### 47.5 What It Enabled

Nova can now answer questions grounded in an organization's actual, current documents, with citations users can verify — directly the core value proposition that differentiates Nova from a generic chatbot, and the foundation every later stage (memory, tools, agents) builds additional capability on top of.

### 47.6 The New Tradeoff This Introduced

Retrieved document context now competes directly for context-window budget (§15.5, §24.7) against conversation history (§45) and Nova's system prompt — the three-way allocation tension previewed in §45.6 is now fully realized. Retrieval also introduces an entirely new failure surface (§34's retrieval-quality diagnostics) and a new hallucination risk specifically around unfaithful use of retrieved content (§35) that didn't exist in Stages 1-3 at all — Nova's evaluation suite (deferred formally to §52, but needed informally starting now) must begin tracking retrieval recall and faithfulness from this stage forward.

### 47.7 Engineering Intuition

> **Why choose naive RAG over a more sophisticated variant immediately?** Because no evaluation data yet exists showing naive RAG is insufficient for Nova's actual query patterns (§23.10) — adding Corrective or Agentic RAG's complexity and cost before that evidence exists is premature.

### 47.8 Decision Tree: Is Naive RAG Sufficient for Nova at This Stage?

```
Has evaluation (informal at this stage, formalized in §52) shown
naive RAG's retrieval recall/precision (§21.8) is adequate for
real Nova queries?
  YES -> Stay with naive RAG -- do not add complexity preemptively.
  NO  -> Identify the SPECIFIC failure mode (§23.11's decision
         tree) before choosing a more sophisticated RAG variant.
```

### 47.9 Python Snippet: Nova's RAG-Augmented Prompt Assembly

```python
# Nova Stage 4: inserts retrieved context between the cacheable
# stable prefix (§46.4) and the variable conversation suffix.

def build_rag_augmented_prompt(system_prompt, running_summary,
                                  retrieved_chunks, recent_turns,
                                  new_user_message):
    stable_prefix = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": f"Summary of earlier conversation: "
                                       f"{running_summary}"},
    ]
    # Retrieved context is per-query, so it can't be cached the same
    # way the stable prefix can -- a direct cost of adding RAG (§47.6).
    context_block = {"role": "system",
                      "content": "Relevant documents:\n" +
                                 "\n---\n".join(retrieved_chunks) +
                                 "\nOnly answer using the above. Cite "
                                 "sources explicitly (§23.9)."}

    variable_suffix = recent_turns + [
        {"role": "user", "content": new_user_message}
    ]
    return stable_prefix + [context_block] + variable_suffix
```

### 47.10 Further Reading

- §6 (RAG Mental Model), §21 (Retrieval Mechanics), §23 (RAG Architectures) — the direct foundation of this stage.

---
