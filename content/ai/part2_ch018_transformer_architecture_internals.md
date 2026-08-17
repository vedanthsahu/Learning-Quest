## 18. Transformer Architecture Internals: Decoder-Only vs. Encoder-Only vs. Encoder-Decoder, Embedding Matrix, KV Cache, Flash Attention, MoE, Speculative Decoding

### 18.1 The Problem: Understanding the Specific Architecture Family You're Actually Deploying

§2.7 introduced the three transformer architecture families at a conceptual level. This chapter develops the engineering-relevant internals of each, plus four mechanisms (embedding matrix, KV cache, Flash Attention, Mixture-of-Experts, speculative decoding) that directly explain memory footprint, latency, and throughput numbers referenced throughout Part I — the difference between knowing "this is a decoder-only model" and knowing why that fact determines your serving architecture's memory and latency profile.

### 18.2 Decoder-Only, Encoder-Only, and Encoder-Decoder: What Each Is Actually Built For

A **decoder-only** architecture (GPT-family, Claude, Llama) processes text left-to-right, each token only attending to itself and earlier tokens (causal/masked self-attention, §17.3) — the natural architecture for open-ended generation, since it's trained to predict "what comes next" given everything so far, which is exactly the task of generating a response. An **encoder-only** architecture (BERT-family) processes the entire input bidirectionally at once, every token attending to every other token including ones *after* it — well suited to producing a rich representation of a complete, already-known input (classification, embeddings, §3, §20), but structurally unsuited to open-ended generation since it has no notion of "predict what comes next." An **encoder-decoder** architecture (T5-family, many translation and some retrieval-augmented models) combines both: an encoder fully processes an input sequence, and a decoder generates output token-by-token while cross-attending (§17.3) to the encoder's output — well suited to tasks with a clear, distinct input-to-output transformation, like translation or summarization, where the entire input should be understood before any output generation begins.

### 18.3 The Embedding Matrix and Output (Unembedding) Layer: Where Vocabulary Size Costs Memory

§15.4 introduced the embedding matrix as the lookup table converting token IDs to vectors; its size is vocabulary_size × embedding_dimension, directly connecting §16.6's vocabulary-size tradeoff to real memory cost. Decoder-only models also need an **output layer** (often called the "unembedding" or "language modeling head") converting the model's final internal representation back into a probability distribution over the entire vocabulary at every generation step — frequently the *same* matrix as the embedding layer, reused in both directions (a technique called weight tying) specifically to avoid doubling this parameter cost. This output layer's size directly affects decode-phase latency (§15.7), since a probability distribution over the full vocabulary must be computed for every single output token generated.

### 18.4 KV Cache: Avoiding Redundant Recomputation During Generation

Without optimization, generating each new token would require recomputing key and value vectors (§17.2) for *every* preceding token all over again — wasteful, since those vectors don't change once computed. The **KV cache** (companion §55.3) stores each token's key and value vectors the first time they're computed, so subsequent generation steps only compute query/key/value for the *new* token and reuse cached values for everything before it — turning what would be quadratic recomputation across the entire generation into linear, incremental work per new token. The direct cost of this optimization is memory (§11.3, §15.8): KV cache size grows with sequence length and the number of concurrent requests being served, frequently becoming the actual binding constraint on how many simultaneous requests a GPU can serve, well before raw compute becomes the bottleneck.

### 18.5 Flash Attention: An Exact, Memory-Efficient Reimplementation, Not an Approximation

**Flash Attention** does not change attention's mathematical result at all — it is mathematically exact, producing identical output to standard attention — but restructures *how* the computation is performed to dramatically reduce memory movement between a GPU's fast on-chip memory and its slower main memory (the actual bottleneck in practice is frequently memory bandwidth, not raw compute capacity). This distinction matters directly for an application engineer: adopting a serving framework with Flash Attention support (§27) is a pure latency/throughput win with no quality tradeoff whatsoever, unlike genuinely lossy optimizations like quantization (§10.6) or aggressive context truncation (§24.5).

### 18.6 Mixture-of-Experts (MoE): Scaling Parameter Count Without Proportionally Scaling Compute

A standard ("dense") transformer uses every one of its parameters for every single token processed. A **Mixture-of-Experts** architecture instead contains many parallel "expert" sub-networks (typically within the feed-forward layers), with a learned routing mechanism selecting only a small subset (often just one or two) of experts to actually process each specific token — meaning the model can have a very large *total* parameter count (and correspondingly large knowledge/capacity) while the *active* compute cost per token remains far smaller than a comparably-sized dense model would require. The direct engineering consequence: an MoE model's memory footprint (all experts must be loaded, §11.3) is much larger than its effective per-token compute cost — a genuinely different scaling tradeoff than a dense model, where memory and per-token compute scale together.

### 18.7 Speculative Decoding: Trading Extra Compute for Reduced Latency

Ordinary decoding generates exactly one token per forward pass through the full model — inherently sequential and latency-bound by that single large model's per-step speed. **Speculative decoding** uses a small, fast "draft" model to quickly generate several candidate tokens ahead, then verifies all of them in a *single* forward pass of the full, accurate model — accepting the draft tokens that match what the full model would have generated anyway, and only falling back to standard one-at-a-time generation when the draft diverges. Because verification of several tokens at once is cheaper than generating them one at a time sequentially, this can meaningfully reduce total generation latency (§15.7) at the cost of extra compute for the draft model — a genuine latency-for-compute tradeoff, valuable specifically when latency, not raw GPU cost, is the binding constraint.

### 18.8 Engineering Intuition

> **Why does my self-hosted model run out of GPU memory only under concurrent load, not with a single request?** KV cache (§18.4) memory scales with the number of *simultaneous* requests and their context lengths — a single-request test never reveals this; load-test with realistic concurrency before trusting a memory-capacity conclusion.

> **Why would I choose an MoE model over a dense model of similar quality?** When you need the knowledge capacity of a very large model but want inference cost closer to a much smaller one (§18.6) — the tradeoff is a larger memory footprint even though per-token compute stays low.

> **What would over-engineering look like here?** An application engineer implementing custom KV-cache management or Flash Attention themselves — these are serving-framework-level concerns (§27); the application-level decision is selecting a serving framework that already implements them well, not reimplementing them.

### 18.9 Decision Tree: Which Architecture-Level Concern Actually Applies to My Situation?

```
Are you choosing a MODEL (not building a serving stack)?
  -> Decoder-only (§18.2) for open-ended generation/chat/agents
     (the overwhelming majority of product use cases in this
     handbook). Encoder-only for classification/embeddings only
     (§20). Encoder-decoder mainly for translation-shaped,
     fixed input-to-output tasks.
Are you choosing/evaluating a SERVING FRAMEWORK (§27)?
  -> Confirm it implements KV caching (§18.4) and Flash Attention
     (§18.5) -- both are now baseline expectations, not advanced
     features; their ABSENCE is the red flag, not their presence.
Is LATENCY (not cost/throughput) your primary constraint for a
specific high-value, latency-sensitive feature?
  -> Speculative decoding (§18.7) support is worth checking for
     specifically -- it trades extra compute for latency, the
     right tradeoff only when latency is what actually matters.
Do you need very large model capacity at a constrained per-token
compute budget?
  -> An MoE model (§18.6) may fit -- but verify your GPU memory
     budget (§11.3) can hold ALL experts, not just the active ones.
```

### 18.10 Python Snippet: Illustrating KV Cache Savings Conceptually

```python
# Demonstrates §18.4's core saving: WITHOUT a cache, generating
# N tokens recomputes attention over all preceding tokens EVERY
# step; WITH a cache, each step only processes the new token.

def cost_without_kv_cache(seq_len_at_each_step):
    # recomputes full attention over the ENTIRE sequence so far,
    # at every single generation step
    return sum(n * n for n in seq_len_at_each_step)  # quadratic, §17.5

def cost_with_kv_cache(seq_len_at_each_step):
    # only the NEW token's query attends over cached keys/values;
    # cost per step is linear in current sequence length, not quadratic
    return sum(n for n in seq_len_at_each_step)

steps = list(range(1, 501))  # generating 500 tokens one at a time
no_cache = cost_without_kv_cache(steps)
with_cache = cost_with_kv_cache(steps)

print(f"Relative cost WITHOUT KV cache: {no_cache:,}")
print(f"Relative cost WITH KV cache:    {with_cache:,}")
print(f"Speedup factor: {no_cache / with_cache:.1f}x")
# The gap widens further as generated sequence length grows --
# directly why KV caching is considered architecturally
# mandatory, not optional, for any real serving system.
```

### 18.11 Further Reading

- Shazeer et al., "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer" (2017) — foundational MoE paper underlying §18.6.
- Dao et al., "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness" (2022) — the primary source for §18.5.
- Leviathan et al., "Fast Inference from Transformers via Speculative Decoding" (2023) — the primary source for §18.7.

---
