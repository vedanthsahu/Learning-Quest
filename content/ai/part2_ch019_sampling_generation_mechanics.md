## 19. Sampling & Generation Mechanics: Temperature, Top-k, Top-p, Beam Search, Streaming, Reasoning Models, Long-Context Models

### 19.1 The Problem: A Model Outputs a Probability Distribution, Not a Single Answer

§18.3 established that a decoder-only model's output layer produces a probability distribution over the entire vocabulary at every generation step — meaning "generating text" always requires an additional, separate decision procedure for turning that distribution into an actual chosen next token. This decision procedure is **sampling**, and the specific strategy chosen directly determines whether a model's output feels deterministic and focused or varied and creative — a product-level, not just technical, decision.

### 19.2 Greedy Decoding and Its Failure Mode

The simplest strategy, **greedy decoding**, always picks the single highest-probability token at every step. This is fully deterministic (same input always produces the same output) but has a well-known failure mode: it can get "stuck" producing repetitive, generic, or oddly stilted text, because always taking the locally-best choice at every single step does not guarantee the best *overall* sequence — a short-sighted local optimum, not a global one, in the same sense the companion handbook warns against greedy algorithms generally without a proof of correctness (companion §9.4).

### 19.3 Temperature: Controlling How "Confidently" the Model Samples

**Temperature** rescales the probability distribution before sampling: a temperature near 0 sharpens the distribution toward greedy-like, highly deterministic behavior; a temperature above 1 flattens it, giving lower-probability tokens more relative chance of being chosen, producing more varied and "creative" output at the direct cost of increased risk of incoherent or off-topic generation. There is no universally "correct" temperature — factual/deterministic tasks (structured extraction, code generation, the LLM-as-judge evaluator from §12.3) generally want low or zero temperature; creative or brainstorming tasks generally benefit from higher values — making temperature a genuine, per-use-case product decision, not a fixed default to leave untouched everywhere.

### 19.4 Top-k and Top-p (Nucleus) Sampling: Constraining the Candidate Pool Before Sampling

**Top-k sampling** restricts candidate tokens to only the k highest-probability options before sampling among them, preventing the (rare but possible) selection of a very low-probability, likely-nonsensical token. **Top-p (nucleus) sampling** instead restricts candidates to the smallest set whose cumulative probability exceeds a threshold p — a more adaptive constraint than a fixed k, since it naturally includes more candidates when the distribution is flat (many plausible options) and fewer when it's sharply peaked (one clearly best option). Both are typically combined with temperature, and most production API calls expose all three as independently tunable parameters, since they address genuinely different aspects of the sampling decision.

### 19.5 Beam Search: Considering Multiple Candidate Sequences at Once

Rather than committing to one token at a time, **beam search** maintains several (a "beam" of) partial candidate sequences simultaneously at each step, expanding each by its most likely next tokens and keeping only the overall highest-scoring sequences going forward — directly addressing greedy decoding's short-sightedness (§19.2) by considering more of the overall sequence's likelihood rather than just the immediate next token. Beam search is more common in translation and other fixed input-to-output tasks (§18.2's encoder-decoder use case) than in open-ended chat generation, where its tendency to produce safe, generic, "averaged" output is often a worse product experience than well-tuned sampling (§19.3-19.4).

### 19.6 Streaming: Generating and Delivering Tokens Incrementally

§10.7 introduced streaming as a perceived-latency technique; mechanically, it simply means the decode-phase's naturally sequential, one-token-at-a-time generation (§18.4) is delivered to the client incrementally as each token is produced, rather than the client waiting for the entire response before receiving anything — a direct product-experience win with essentially no downside, since the underlying generation process is already sequential regardless of whether streaming is enabled for delivery.

### 19.7 Reasoning Models and Long-Context Models: Two Distinct Recent Capability Directions

**Reasoning models** are trained (typically via reinforcement learning, related to but distinct from the RLHF alignment training in §9.4) to generate extended, explicit intermediate reasoning ("thinking") tokens before producing a final answer — directly related to, but more deeply trained-in than, the prompted chain-of-thought technique from §7.4, and generally producing meaningfully better performance on multi-step reasoning tasks at the direct cost of significantly higher token consumption and latency (§15.9-15.10) for those extra reasoning tokens, frequently billed even when not shown to the end user. **Long-context models** extend the practical, effective context window (§15.5) well beyond earlier norms through some combination of the architectural techniques already covered (efficient positional encoding, §17.7; memory-efficient attention, §18.5) plus training specifically on long-sequence data — but "supports a 1M-token context window" and "performs well when given close to 1M tokens of actual context" are genuinely different claims, and production systems should validate effective long-context quality (§29) rather than trusting the advertised maximum alone.

### 19.8 Engineering Intuition

> **How do I know if my product should use a low or high temperature?** Ask whether two runs of the exact same input should ideally produce the same output (structured extraction, code, factual Q&A: low temperature) or whether variety across runs is actually desirable (brainstorming, creative writing: higher temperature) — this is a product decision, not a universal default.

> **Why is my reasoning-model-powered feature far more expensive and slower than expected?** Reasoning tokens (§19.7) are real, billed tokens even when hidden from the user — walk the token-economics chain (§15.9) using ACTUAL reasoning-token counts from the API response, not just the visible final answer's length.

> **What would over-engineering look like here?** Extensively tuning top-k/top-p/temperature combinations before confirming, via evaluation (§12, §29), that sampling strategy is actually the binding factor in output quality — for many production issues, retrieval quality (§21) or prompt structure (§24) matters far more than sampling-parameter tuning.

### 19.9 Decision Tree: Which Generation Parameters Should I Actually Tune?

```
Does this specific call need deterministic, repeatable output
(structured extraction, code generation, evaluation/judging)?
  YES -> temperature near 0 (or exactly 0 if the API supports it).
         Top-k/top-p tuning is largely irrelevant at this setting.
  NO (some variety is actually desirable)
    -> Start with moderate temperature (~0.7) and default top-p;
       only tune further if evaluation (§12) shows a specific,
       measured quality problem -- don't tune sampling parameters
       speculatively without an evaluation signal driving it.
Does the task require genuine multi-step reasoning (math, complex
planning, multi-hop questions)?
  YES -> Consider a reasoning model (§19.7) -- but budget for
         SIGNIFICANTLY higher token cost/latency and measure
         actual reasoning-token consumption before committing.
Is the input regularly close to your model's advertised maximum
context length?
  YES -> Validate EFFECTIVE quality at that length via evaluation
         (§29) -- do not assume advertised maximum equals reliable
         effective capacity.
```

### 19.10 Python Snippet: Implementing Top-p (Nucleus) Sampling

```python
# Demonstrates §19.4: selecting the smallest set of candidates
# whose cumulative probability exceeds threshold p, then
# sampling from just that set.

import numpy as np

def top_p_sample(probabilities, p=0.9):
    sorted_indices = np.argsort(probabilities)[::-1]      # highest first
    sorted_probs = probabilities[sorted_indices]
    cumulative = np.cumsum(sorted_probs)

    cutoff = np.searchsorted(cumulative, p) + 1            # smallest set
                                                             # exceeding p
    nucleus_indices = sorted_indices[:cutoff]
    nucleus_probs = sorted_probs[:cutoff]
    nucleus_probs = nucleus_probs / nucleus_probs.sum()     # renormalize

    chosen = np.random.choice(nucleus_indices, p=nucleus_probs)
    return chosen

# Toy vocabulary distribution over 5 tokens
probs = np.array([0.5, 0.2, 0.15, 0.1, 0.05])
chosen_token_id = top_p_sample(probs, p=0.9)
print(f"Nucleus (p=0.9) excludes the lowest-probability tail; "
      f"sampled token id: {chosen_token_id}")
```

### 19.11 Further Reading

- Holtzman et al., "The Curious Case of Neural Text Degeneration" (2019) — the foundational paper introducing nucleus (top-p) sampling, directly underlying §19.4.
- OpenAI and Anthropic API documentation on reasoning/extended-thinking modes — the current, practical reference for §19.7's token-cost behavior.

---
