## 58. Reverse Engineering AI Search & Research Systems: Perplexity and Deep Research Systems

### 58.1 The Purpose and Method of This Chapter

Following §57's convention, every claim here is marked **[Documented]** (stated by the provider) or **[Inference]** (a reasonable deduction from this handbook's frameworks, not a confirmed internal detail). AI search systems like Perplexity, and "deep research" agentic systems published by several major AI labs, are analyzed through §21's retrieval mechanics and §23's RAG architecture catalog specifically, since search-grounded generation is these products' defining characteristic.

### 58.2 Core Architecture: What's Documented

**[Documented]** Perplexity and similar AI search products describe their core function as combining live web search/retrieval with LLM-generated, cited answers — directly an instance of RAG (§6, §23) where the retrieval corpus is the live web rather than a static, pre-indexed private corpus. **[Documented]** These products explicitly present citations linking claims to specific sources, directly the grounding/citation practice §23.9 establishes as a universal RAG requirement, here surfaced as a core, user-facing product feature rather than an internal quality mechanism.

### 58.3 Retrieval Architecture: Documented Behavior and Reasonable Inference

**[Documented]** Live web search requires real-time retrieval rather than a static pre-built index (§21), since the corpus (the current state of the web) changes continuously — a fundamentally different retrieval infrastructure challenge than the RAG systems built earlier in this handbook (§47's Nova, indexing a static or slowly-changing document corpus). **[Inference]** Given the latency and quality demands of showing a cited answer quickly, it is reasonable to infer these products employ some combination of a traditional web search index (BM25-like lexical retrieval, §21.2, likely augmented with their own or a partner's search infrastructure) plus a reranking stage (§21.7) to select and prioritize the most relevant pages before generation — but the specific search infrastructure and reranking approach used is not publicly documented in technical detail.

### 58.4 "Deep Research" Agentic Systems: Documented Behavior and Reasonable Inference

**[Documented]** Several major AI labs have published "deep research" agent products explicitly described as autonomously performing multi-step web research — searching, reading, synthesizing across many sources — over an extended time period (documented as taking minutes rather than seconds, a deliberate design choice these providers state explicitly) before producing a comprehensive report. **[Inference]** This directly matches this handbook's Agentic RAG pattern (§23.6) — treating retrieval as a tool the model invokes repeatedly and adaptively, deciding when to search further versus when sufficient information has been gathered — and the extended, multi-minute runtime is consistent with §36's agent-reliability discussion, where a genuinely open-ended research task requires many sequential tool-use and reflection (§25.4) steps rather than a single retrieval pass; the specific step-limiting, planning, and reflection mechanisms used are not publicly documented in technical detail.

### 58.5 Evaluation and Quality: What's Documented

**[Documented]** Providers of these systems have published quality/accuracy evaluations (comparing citation accuracy, comprehensiveness, and correctness against competitors or against human research), directly the faithfulness/groundedness evaluation practice (§29.6, RAGAS) this handbook develops, here applied specifically to web-retrieval-grounded generation rather than a private corpus.

### 58.6 Applying This Handbook's Frameworks: What This Comparison Teaches

The clearest lesson from AI search and deep-research systems is that **Agentic RAG (§23.6) and Adaptive RAG (§23.5) are not merely theoretical variants in this handbook's catalog — they are the documented, real architecture underlying an entire, commercially significant product category.** The multi-minute runtime of deep-research products is a direct, real-world confirmation of §23.6's stated tradeoff (agentic retrieval's flexibility and multi-hop capability at the cost of higher and less predictable latency) — a tradeoff these products deliberately accept and communicate to users explicitly, rather than hide, since the alternative (a fast but shallow single-pass answer) would fail the product's actual value proposition.

### 58.7 Engineering Intuition

> **When should my own RAG system consider an agentic, multi-minute research pattern like these products?** When the value of a comprehensive, multi-source-synthesized answer clearly outweighs users' tolerance for waiting — exactly the tradeoff these products made explicitly and communicate through their UX (showing research progress) rather than hiding.

> **What's the risk of assuming these products' retrieval infrastructure matches a specific technique from §21 exactly?** The **[Inference]** labels in §58.3-58.4 exist precisely because the actual infrastructure is undisclosed — build your own system's retrieval choices from your own evaluated requirements (§21.8), not from an assumption about what a specific named competitor product does internally.

### 58.8 Further Reading

- Published documentation and technical blog posts from Perplexity and major AI labs' "deep research" product announcements — the primary [Documented] sources underlying this chapter.

---
