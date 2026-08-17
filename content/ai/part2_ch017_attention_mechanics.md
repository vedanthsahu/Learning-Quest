## 17. Attention Mechanics: Self/Cross/Multi-Head Attention, Positional Encoding, RoPE

### 17.1 The Problem: How Does a Model Know Which Earlier Words Matter for the Next One?

§2.2 introduced attention conceptually as "letting the model weigh which earlier tokens matter most." This chapter develops the actual mechanism — not to derive the underlying linear algebra from scratch (outside this handbook's scope, §0.1), but to explain precisely enough that the engineering consequences already referenced throughout Part I (quadratic scaling, §15.6; KV cache, §18.4; Flash Attention, §18.5) become concrete rather than assumed.

### 17.2 Queries, Keys, and Values: The Mechanism in Plain Engineering Terms

For every token, the model computes three vectors: a **query** (what this token is "looking for" in the rest of the sequence), a **key** (what this token "offers" to others looking for it), and a **value** (the actual content this token contributes if attended to). Attention for a given token compares its query against every other token's key (via a dot product, producing a similarity score — the same underlying operation as embedding similarity, §3.3), turns those scores into weights (via softmax, ensuring they sum to 1), and produces that token's output as a weighted sum of every token's value vector, weighted by those attention scores. The direct engineering consequence: every token's output computation involves every other token — a full quadratic all-pairs comparison, and precisely the source of §15.6's quadratic-scaling warning.

### 17.3 Self-Attention vs. Cross-Attention: Attending Within vs. Across Sequences

**Self-attention** computes queries, keys, and values all from the same sequence — every token attends to every other token within the same input, the mechanism underlying every decoder-only LLM's core operation (§18.2). **Cross-attention** computes queries from one sequence but keys and values from a *different* sequence — the mechanism underlying encoder-decoder architectures (§18.2), where, for example, a translation model's decoder queries attend over the encoder's already-processed representation of the source-language input. Modern general-purpose LLMs (GPT-family, Claude, Llama) are overwhelmingly decoder-only, using self-attention exclusively — cross-attention remains relevant primarily in specialized encoder-decoder architectures and certain multimodal designs.

### 17.4 Multi-Head Attention: Running Several Attention Patterns in Parallel

Rather than computing one single attention pattern, **multi-head attention** splits the query/key/value vectors into several smaller "heads," each computing its own independent attention pattern in parallel, with results concatenated afterward — allowing different heads to specialize in different kinds of relationships (one head might learn to track subject-verb agreement, another might track long-range topical relevance) without any single head being forced to represent every kind of relationship at once. The engineering consequence is primarily one of model quality and expressiveness rather than direct cost — head count is a fixed architectural choice, not a runtime lever an application engineer adjusts.

### 17.5 Why Self-Attention Scales Poorly: Making §15.6 Concrete

Every token attending to every other token means attention's core computation grows with the *square* of sequence length: doubling context length roughly quadruples this specific computation. This is precisely why context windows did not simply grow indefinitely as hardware improved — architectural innovations (KV caching to avoid recomputation, §18.4; Flash Attention to reduce memory overhead, §18.5; sparse/local attention variants that deliberately don't compute every pair) were specifically engineered to fight this scaling wall, and long-context models (§19.7) rely on some combination of these techniques rather than "just" more raw compute.

### 17.6 Positional Encoding: Why Attention Alone Doesn't Know Word Order

The attention mechanism as described in §17.2 is inherently **order-agnostic** — computing similarity between queries and keys says nothing about which token came first. Without additional information, "the dog bit the man" and "the man bit the dog" would look identical to raw attention. **Positional encoding** injects order information directly into the token representations before or during attention, so the model can distinguish position-dependent meaning — a small but architecturally essential addition without which transformers could not represent sequential language correctly at all.

### 17.7 RoPE: The Dominant Modern Positional Encoding Approach

**RoPE (Rotary Positional Embeddings)**, used by most current major LLMs, encodes position by rotating each token's query and key vectors by an angle proportional to that token's position in the sequence — a mathematically elegant approach whose key engineering advantage is that the *relative* distance between two tokens' positions is preserved naturally within the rotation itself, rather than needing to be learned indirectly. This property is directly why RoPE-based models tend to extrapolate more gracefully to longer contexts than earlier fixed/learned positional-encoding schemes, since relative position (which is what actually matters for most linguistic relationships) is baked into the mechanism's geometry rather than memorized from training-time sequence lengths alone.

### 17.8 Engineering Intuition

> **Why can't I just "add more context" indefinitely without cost consequences?** Because attention's cost is quadratic (§17.5), not linear, in context length — a fact hidden by every "context window" marketing number, which states a ceiling, not a cost curve.

> **Why do some models handle very long documents better than others despite similar parameter counts?** Differences in positional encoding scheme (RoPE-based models, §17.7, generally extrapolate better) and in the specific attention-optimization techniques (§18.5) used during training and serving — "long context support" is an engineering property of several combined design choices, not a single switch.

> **What would over-engineering look like here?** An application engineer implementing custom attention variants — this is model-architecture-level engineering, decided by the model provider; the application-level lever is choosing a model whose documented context-length behavior fits your use case, not reimplementing attention.

### 17.9 Decision Tree: Is an Attention-Related Concept Actually My Problem to Solve?

```
Is latency or cost scaling worse than linearly as your typical
context length grows?
  YES -> This is attention's quadratic cost (§17.5) showing up
         directly -- the application-level fix is REDUCING
         context (§24.5, better retrieval §21) or using prompt
         caching (§24.6), not "faster attention" (that's the
         model provider's/serving framework's job, §18.5).
Is quality degrading noticeably for very long inputs specifically?
  YES -> Check the model's DOCUMENTED effective context length
         (often shorter than its advertised maximum) -- this is
         a positional-encoding/training-data limitation (§17.7),
         addressed by choosing a model with better long-context
         support, not a prompting fix.
```

### 17.10 Python Snippet: A Minimal, Illustrative Self-Attention Computation

```python
# Demonstrates §17.2's core mechanism in its simplest possible
# form -- NOT production code, purely for building the mental
# model of query/key/value/softmax.

import numpy as np

def self_attention(X):
    d = X.shape[1]  # embedding dimension
    # In a real model, Q/K/V come from learned weight matrices;
    # here we use X itself directly to isolate the mechanism.
    Q, K, V = X, X, X

    scores = Q @ K.T / np.sqrt(d)          # query-key similarity,
                                            # scaled to stabilize
                                            # softmax (§17.2)
    weights = np.exp(scores) / np.exp(scores).sum(axis=1, keepdims=True)
                                            # softmax: weights sum to 1
    output = weights @ V                    # weighted sum of values

    return output, weights

X = np.array([[1.0, 0.0], [0.0, 1.0], [0.9, 0.1]])  # 3 toy tokens
output, weights = self_attention(X)
print("Attention weights (each row sums to 1):\n", weights.round(2))
# Note: this computes ALL pairwise similarities (3x3 here) --
# the quadratic cost from §17.5, visible directly in the shape
# of the `weights` matrix (sequence_length x sequence_length).
```

### 17.11 Further Reading

- Vaswani et al., "Attention Is All You Need" (2017) — the foundational transformer paper; read for conceptual grounding on §17.2-17.4, not full mathematical derivation (outside this handbook's scope, §0.1).
- Su et al., "RoFormer: Enhanced Transformer with Rotary Position Embedding" (2021) — the primary source for §17.7.

---
