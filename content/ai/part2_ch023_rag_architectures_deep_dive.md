## 23. RAG Architectures Deep Dive: Naive/Advanced/Corrective/Adaptive/Agentic/Graph/Self-RAG

### 23.1 The Problem: Naive RAG Has Known, Specific Failure Modes, Each With a Named Architectural Fix

§6 introduced the naive RAG pipeline (retrieve, then generate) as the baseline mental model. In production, naive RAG has well-documented, specific failure modes — irrelevant retrieval, no correction when retrieval fails, no adaptation to query type, no reasoning across multiple documents — and the RAG variants in this chapter each exist specifically to fix one or more of these named failures, not as generically "more advanced" alternatives to reach for by default. Choosing among them should be driven by which specific failure mode you actually observe (§34), not by architectural sophistication for its own sake.

### 23.2 Naive RAG: The Baseline, and Its Specific Weaknesses

**Naive RAG** embeds the query, retrieves the top-k most similar chunks (§21.3), and generates an answer conditioned on them — a single retrieval pass, no verification of retrieval quality, no adaptation based on the query, and no ability to recover if the initial retrieval was poor. Its specific, well-documented weaknesses: irrelevant or incomplete retrieval passed silently into generation with no check at all; no mechanism to recognize when retrieval simply failed; identical handling for every query type regardless of whether it's a simple factual lookup or a complex multi-hop question requiring several pieces of information combined together.

### 23.3 Advanced RAG: Fixing Retrieval Quality Directly, Before and After Retrieval

**Advanced RAG** adds concrete engineering around the same core retrieve-then-generate structure: **pre-retrieval** techniques (query rewriting/expansion — reformulating a vague or poorly-phrased user query into a better search query before retrieval even runs) and **post-retrieval** techniques (the reranking from §21.7, and context compression — trimming retrieved chunks down to only their most relevant portions before they consume context window budget, §15.5, §24.5). This is the natural, lowest-additional-complexity upgrade from naive RAG, and directly addresses §23.2's "irrelevant or incomplete retrieval" weakness without introducing any new control-flow complexity (still a single retrieval-then-generate pass, just a better-engineered one).

### 23.4 Corrective RAG: Explicitly Checking and Recovering from Bad Retrieval

**Corrective RAG (CRAG)** adds an explicit evaluation step after retrieval, before generation: a lightweight grading step (often a smaller/cheaper model call, or a trained classifier) assesses whether retrieved documents are actually relevant and sufficient, and if not, triggers a corrective action — a broader or reformulated search, or falling back to a general web search when the internal corpus genuinely lacks the answer — rather than silently generating from poor context the way naive RAG (§23.2) does. This directly targets the "no mechanism to recognize retrieval failure" weakness, at the cost of the extra latency and expense of the grading step itself.

### 23.5 Adaptive RAG: Routing Different Query Types to Different Strategies

**Adaptive RAG** adds a routing/classification step before retrieval: a simple factual query might be answered directly by the model with no retrieval at all (avoiding unnecessary retrieval latency and cost, §15.10); a query needing one document might use naive single-pass retrieval (§23.2); a genuinely complex, multi-hop query might be routed to a more expensive iterative or agentic strategy (§23.6). This directly targets naive RAG's "identical handling regardless of query complexity" weakness, and is a direct cost/latency optimization as much as a quality one — the majority of a system's real query traffic is often simpler than its most complex queries, and routing avoids paying agentic RAG's cost (§23.6) on queries that don't need it.

### 23.6 Agentic RAG: Retrieval as One Tool Among Several, Under Model Control

**Agentic RAG** treats retrieval not as a single fixed pipeline stage but as a **tool** (§8.2, §25) the model can invoke, potentially multiple times, deciding for itself when to retrieve, what to search for, and when it has gathered enough information to answer — directly enabling multi-hop reasoning (retrieving one piece of information, then using it to formulate a follow-up retrieval) that a single fixed retrieval pass structurally cannot support. This is the most flexible and most capable variant covered here, and also the most expensive and least predictable in latency (companion §36's agent-reliability concerns apply directly, since an agentic RAG loop can, like any agent, fail to terminate correctly, §36) — appropriate specifically for complex, open-ended research-style queries, not as a default replacement for simpler RAG variants on straightforward queries.

### 23.7 Graph RAG: Retrieval Over Explicit Relationships, Not Just Similarity

**Graph RAG** builds and retrieves from an explicit knowledge graph (entities and their relationships, extracted from source documents in advance) rather than relying purely on chunk-level vector similarity — directly valuable when answering a query genuinely requires traversing relationships between entities (e.g., "which suppliers does Company X depend on that are also used by Company Y") that plain vector similarity between text chunks cannot represent at all, since similarity search finds *similar* text, not *related* entities. The cost is a substantial upfront investment in the graph-construction pipeline itself (extracting entities and relationships reliably from unstructured source documents is a genuinely hard, error-prone problem), making Graph RAG worthwhile specifically when relationship-traversal queries are a demonstrated, common requirement, not a default first architecture.

### 23.8 Self-RAG: The Model Trained to Decide When and What to Retrieve

**Self-RAG** trains the underlying model itself (via fine-tuning, §9, §26) to generate special reflection tokens deciding, at generation time, whether retrieval is even needed for a given part of its response, and to critique its own output's groundedness against retrieved content directly, as part of the model's native generation behavior — distinguishing it from Corrective RAG (§23.4) and Agentic RAG (§23.6), which add this decision-making as external orchestration logic around an unmodified model, rather than training the capability into the model itself. This requires access to fine-tune the underlying model (§9.7's "when NOT to fine-tune" tradeoffs apply directly) and is consequently far less commonly deployed in practice than the orchestration-based variants, which work with any closed or open model unmodified.

### 23.9 Grounding, Citation, and Hallucination Mitigation Across All Variants

Regardless of which RAG variant is used, two engineering concerns apply universally: **grounding** — structuring the prompt (§24.3) so the model is explicitly instructed to answer only from provided context, and structuring retrieved content so the model can clearly attribute claims to specific sources — and **citation** — having the model explicitly reference which retrieved chunk supports each claim, both making hallucination detectable (§35) after the fact and giving users a direct way to verify claims themselves. No RAG architecture, however sophisticated, eliminates hallucination risk entirely (§6.5's original limit still applies) — every variant in this chapter improves the *odds* of good grounding by fixing a specific failure mode, none provides a guarantee.

### 23.10 Engineering Intuition

> **How do I choose among these RAG variants for a new feature?** Start with naive RAG (§23.2) plus the low-cost Advanced RAG additions (§23.3, reranking and query rewriting) — only add Corrective, Adaptive, Agentic, or Graph RAG in direct response to a specific, *observed* failure mode from evaluation (§21.8, §34), not preemptively.

> **Why does my RAG system fail specifically on questions requiring information from two different documents combined?** This is naive/advanced RAG's structural single-pass limitation (§23.2) — Agentic RAG's multi-hop retrieval (§23.6) or Graph RAG's relationship traversal (§23.7) directly address this, depending on whether the need is sequential lookups or explicit entity relationships.

> **What would over-engineering look like here?** Building Agentic or Graph RAG (§23.6-23.7) for a corpus of straightforward, single-document FAQ-style content that naive or advanced RAG already answers correctly and far more cheaply and predictably.

### 23.11 Decision Tree: Which RAG Architecture Actually Fixes My Observed Problem?

```
Has evaluation (§21.8, §34) shown retrieval is frequently
irrelevant or incomplete?
  YES -> Advanced RAG first (§23.3: query rewriting, reranking) --
         cheapest fix for this specific symptom.
Does retrieval sometimes fail COMPLETELY (nothing relevant
exists in the corpus for a given query)?
  YES -> Corrective RAG (§23.4) -- add explicit grading and a
         fallback strategy.
Is query complexity highly variable across your real traffic
(mostly simple, occasionally very complex)?
  YES -> Adaptive RAG (§23.5) -- route by complexity to control
         cost/latency.
Do queries require MULTI-HOP reasoning (retrieve, then retrieve
again based on what was found)?
  YES -> Agentic RAG (§23.6) -- accept higher latency/cost
         variability (companion §36 applies).
Do queries require traversing EXPLICIT RELATIONSHIPS between
entities, not just text similarity?
  YES -> Graph RAG (§23.7) -- budget for the graph-construction
         pipeline's upfront cost.
In all cases: grounding and citation (§23.9) are a baseline
requirement, not an advanced feature -- add them regardless of
which variant above you choose.
```

### 23.12 Python Snippet: A Minimal Corrective RAG Grading Step

```python
# Demonstrates §23.4's core addition over naive RAG: an explicit
# check BEFORE generation, with a fallback if retrieval failed.

def corrective_rag_answer(query, retrieve_fn, grade_fn, generate_fn,
                            fallback_search_fn):
    retrieved_docs = retrieve_fn(query)                # §21.3

    relevance_grade = grade_fn(query, retrieved_docs)   # cheap model
                                                          # call or
                                                          # classifier
    if relevance_grade < 0.5:                            # threshold:
                                                          # retrieval
                                                          # judged
                                                          # insufficient
        retrieved_docs = fallback_search_fn(query)       # e.g. broader
                                                          # web search,
                                                          # §23.4

    return generate_fn(query, retrieved_docs)            # §6.4, with
                                                          # grounding
                                                          # instructions
                                                          # (§23.9)
```

### 23.13 Further Reading

- Yan et al., "Corrective Retrieval Augmented Generation" (2024) — the primary source for §23.4.
- Jeong et al., "Adaptive-RAG: Learning to Adapt Retrieval-Augmented Large Language Models through Question Complexity" (2024) — the primary source for §23.5.
- Asai et al., "Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection" (2023) — the primary source for §23.8.
- Edge et al., "From Local to Global: A Graph RAG Approach to Query-Focused Summarization" (2024) — the primary source for §23.7.

---
