## 81. AI Cost Engineering as a First-Class Concern

### 81.1 Why Cost Deserves Its Own Chapter, Not Just a Metric

§15's token-economics chain and §33's production cost diagnostics already taught the mechanism and the incident-response process. This chapter consolidates cost into what an experienced AI engineer actually treats it as: a design constraint considered at the *start* of every architectural decision (§61's Step 5), not a metric checked only after deployment. Every cost dimension below maps to a specific point in this handbook's mechanism catalog — this chapter's job is making the complete cost surface visible in one place, the way a systems engineer needs a complete latency budget (§61's Step 4) visible in one place before making tradeoffs.

### 81.2 The Complete Cost Surface

**Prompt (Input) Tokens** — priced per token, dominated by system prompt, conversation history (§45), and retrieved context (§47); the component most directly controllable via context management (§24.5, §24.7). **Completion (Output) Tokens** — typically priced several times higher than input tokens, reflecting decode-phase per-token compute cost (§15.7, §15.9); controllable via `max_tokens` limits and prompt instructions favoring concision where appropriate. **Reasoning Tokens** — for reasoning models (§19.7), often invisible in a naive estimate since they're not always shown to the user but are always billed; the single most common source of an underestimated cost projection (§33.6, §80.4). **Embedding Costs** — computing embeddings at ingestion time (§20) for every document, and at query time for every retrieval call; generally small per-call but multiplies across large corpora and high query volume; reducible via embedding caching (§72.3). **Retrieval Costs** — the compute and infrastructure cost of the vector database itself (§22) plus any hybrid/lexical search infrastructure (§21.2, §21.4) — a genuine infrastructure cost distinct from per-token API pricing. **Reranking Costs** — cross-encoder reranking (§21.7) is meaningfully more expensive per candidate than embedding similarity; cost scales with candidate-set size (§38.9, §77.9's Cross-Encoder Bottleneck), making top_k a direct cost lever. **GPU Time** — for self-hosted inference (§27) or fine-tuning (§26), the dominant cost driver, billed by time regardless of utilization — directly why idle GPU capacity is a continuous cost leak (§11.3, §28.8). **Storage** — vector database storage (§22), conversation/memory history (§45, §48), and prompt/evaluation logs (§31.3) all accumulate storage cost over time, generally small per-unit but worth monitoring at scale, especially for long-tenured users (§71.5's memory-compression motivation). **Inference (Serving Infrastructure)** — the amortized cost of serving frameworks, load balancers, and orchestration (§27-28) surrounding the model calls themselves, distinct from the per-token model cost. **Networking** — data transfer costs, particularly relevant for multi-region deployments (§55) where cross-region data movement has its own cost line separate from compute. **Evaluation Costs** — running golden-dataset regression tests (§29.5) on every change consumes real tokens/compute, and this cost itself must be managed at scale (§39.7's scoped/incremental evaluation runs exist specifically because evaluation cost can itself become a bottleneck). **Monitoring Costs** — logging, tracing, and observability infrastructure (§31) have their own storage and processing cost, particularly for high-volume prompt logging (§31.3) capturing full request/response content.

### 81.3 The Optimization Technique Catalog, Mapped to the Cost Surface

Every cost-optimization technique in this handbook acts on a specific point in §81.2's surface, and recognizing which point is the essential diagnostic skill (§15.10 established this principle; this section is its complete, consolidated catalog): **Prompt caching** (§24.6) reduces effective input-token cost for repeated prefixes, acting on prefill compute specifically. **Context compression** (§24.5) and better chunking (§21.6) reduce input-token volume directly. **Model routing** (§27.5, §68.4) reduces cost by matching cheaper models to simpler requests, acting on the per-token price itself rather than token volume. **Quantization** (§10.6, §27.6) reduces GPU memory/compute cost for self-hosted inference specifically, not applicable to closed-API cost at all. **Semantic/embedding caching** (§72.2-72.3) avoids redundant generation/embedding calls entirely for repeated or near-repeated requests. **`max_tokens` limits and reasoning-token budgets** (§33.7) directly cap output/reasoning-token cost per request. **Token-budget rate limiting** (§31.8, §31.13) bounds worst-case cost exposure from any single source, a risk-management technique rather than an average-cost-reduction one. **Reranking candidate-set tuning** (§38.9, §77.9) directly trades reranking cost against retrieval precision. **Batch/async processing** (§75.5's Document Intelligence pattern) shifts cost-sensitive but latency-tolerant work to cheaper, non-real-time infrastructure paths where applicable.

### 81.4 Cost Estimation Discipline: Before, Not After

§43.4 and §61's Step 5 established that AI product estimation must be token-denominated from the start. The discipline this implies concretely: for any new feature, walk §15.13's chain using *realistic* assumptions for every dimension in §81.2 that applies — not just prompt/completion tokens, but reasoning tokens if applicable, embedding/retrieval cost if RAG is involved, and GPU time if self-hosting. §33.6's most common real-world lesson is that launch estimates systematically undercount reasoning tokens and retry-driven duplication specifically — a mature cost-estimation practice explicitly budgets a margin for these commonly-undercounted dimensions rather than treating a naive linear estimate as reliable.

### 81.5 Cost as an Architectural Property, Not an Afterthought

Every one of Nova's twelve capstone stages (§44-55) made a cost tradeoff explicitly, as part of the stage's core decision, not as a separate later optimization pass — Stage 2's history-summarization choice, Stage 7-8's accepted cost-variance for agentic capability, Stage 11's per-tenant routing. This is the central lesson of this chapter: cost is a first-order design input at Step 5 of every architectural decision (§61), exactly like latency (Step 4) — a design that defers cost consideration to "we'll optimize it later" has skipped a step, not deferred a detail.

### 81.6 Engineering Intuition

> **What's the fastest way to estimate a new AI feature's cost before building it?** Walk §15.13's chain end to end with realistic, not optimistic, assumptions for every applicable dimension in §81.2 — and explicitly flag reasoning tokens and retry/agentic-loop multiplication as the two most commonly undercounted dimensions (§33.6).

> **Why is GPU time treated differently from token-based API costs in this catalog?** Because it's billed by time regardless of utilization (§11.3) — an idle self-hosted GPU costs the same as a busy one, making utilization efficiency (§28.3's bin-packing) the primary lever, whereas token-based API cost scales directly and only with actual usage.

> **What would over-engineering cost optimization look like?** Building elaborate caching and routing infrastructure (§72, §68.4) for a low-volume feature where the engineering cost of the optimization exceeds any realistic savings — every optimization in §81.3 has its own engineering cost that must be justified by actual, measured volume (§33.4's dimensional breakdown), not assumed to be worthwhile universally.

### 81.7 Decision Tree: Where Should Cost Optimization Effort Go First?

```
Walk §15.13's chain with real production data (not launch
estimates). Which dimension in §81.2 dominates actual spend?
  Prompt/input tokens dominate -> context compression (§24.5),
    better chunking (§21.6), prompt caching (§24.6).
  Completion/reasoning tokens dominate -> max_tokens limits,
    reasoning-token budgets (§33.7), model routing to a
    cheaper/non-reasoning model where acceptable (§27.5).
  Retrieval/reranking dominates -> tune candidate-set size
    (§38.9), evaluate whether hybrid/reranking complexity is
    actually earning its cost (§73's patterns).
  GPU time dominates -> check utilization/bin-packing (§28.3)
    before adding capacity; consider quantization (§27.6).
  A single user/feature/model dominates disproportionately ->
    this is likely §80.5's Runaway Cost pattern -- investigate
    that dimension specifically before optimizing broadly.
```

### 81.8 Python Snippet: A Complete Pre-Launch Cost Surface Estimator

```python
# Consolidates §81.2's full cost surface into one estimation
# function, explicitly including the commonly-undercounted
# dimensions §33.6 and §81.4 warn about.

def estimate_full_cost_surface(
    monthly_requests,
    avg_prompt_tokens, avg_completion_tokens,
    avg_reasoning_tokens=0,       # often undercounted, §33.6
    retries_multiplier=1.0,       # >1.0 if retries duplicate cost
    embedding_calls_per_request=1, avg_embedding_tokens=200,
    reranking_candidates_per_request=0,
    input_price_per_1k=0.005, output_price_per_1k=0.015,
    embedding_price_per_1k=0.0001, reranking_price_per_call=0.0001,
):
    effective_requests = monthly_requests * retries_multiplier

    prompt_cost = effective_requests * (avg_prompt_tokens / 1000) * input_price_per_1k
    completion_cost = effective_requests * \
        ((avg_completion_tokens + avg_reasoning_tokens) / 1000) * output_price_per_1k
    embedding_cost = effective_requests * embedding_calls_per_request * \
        (avg_embedding_tokens / 1000) * embedding_price_per_1k
    reranking_cost = effective_requests * reranking_candidates_per_request * \
        reranking_price_per_call

    total = prompt_cost + completion_cost + embedding_cost + reranking_cost
    print(f"Prompt: ${prompt_cost:,.2f} | Completion+Reasoning: "
          f"${completion_cost:,.2f} | Embedding: ${embedding_cost:,.2f} | "
          f"Reranking: ${reranking_cost:,.2f}")
    print(f"TOTAL monthly estimate: ${total:,.2f}")
    return total

estimate_full_cost_surface(
    monthly_requests=500_000, avg_prompt_tokens=1200,
    avg_completion_tokens=300, avg_reasoning_tokens=800,
    retries_multiplier=1.1, reranking_candidates_per_request=20,
)
```

### 81.9 Further Reading

- §15 (Token Economics Deep Dive), §33 (Production Cost Engineering), §43.4 (Capstone Estimation) — the direct mechanism foundations for this chapter's consolidated cost surface.

---
