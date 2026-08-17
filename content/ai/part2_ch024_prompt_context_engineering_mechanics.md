## 24. Prompt & Context Engineering Mechanics: Templates, Few/Zero-Shot, CoT, ToT, ReAct, Reflection, Compression, Caching, Context Window Management

### 24.1 The Problem: The Prompt Is the Only Programming Interface a Model Actually Has

§7 introduced prompt and context engineering conceptually. Mechanically, every technique in this chapter is doing one of exactly two things: shaping *what* information is present in the context window (retrieval, history, examples) or shaping *how* the model is instructed to reason over that information — and every technique's cost is measured in the same currency established in §15: tokens consumed, and therefore context-window budget and cloud cost spent.

### 24.2 Prompt Templates: Separating Structure from Variable Content

A **prompt template** separates the fixed instructional structure of a prompt (system instructions, formatting requirements, examples) from the variable content inserted per request (the user's actual question, retrieved context, §6) — the same separation-of-concerns principle the companion handbook applies to parameterized queries (companion §49.3), and for a directly analogous reason: mixing fixed instructions and variable, potentially-untrusted content carelessly is exactly what enables prompt injection (§13.2). A well-structured template makes the boundary between "instruction" and "data" as explicit as the natural-language medium allows (e.g., clearly delimited sections), even though — as §13.2 noted — no structural separation as clean as a parameterized SQL query is truly possible in natural language.

### 24.3 Few-Shot and Zero-Shot Prompting: Teaching Through Examples vs. Instructions Alone

**Zero-shot prompting** provides only an instruction, no examples, relying entirely on the model's pretrained knowledge to infer the correct output format and approach. **Few-shot prompting** includes a small number of example input-output pairs directly in the prompt, demonstrating the desired pattern concretely rather than describing it abstractly — frequently improving output format consistency and task accuracy substantially, at the direct cost of the additional tokens those examples consume (§15.3) on every single request. The engineering tradeoff is explicit: few-shot examples are a real, ongoing per-request cost (unlike fine-tuning, §9, which pays a one-time training cost to achieve a similar effect) — worthwhile when the pattern is hard to describe purely in words, or when fine-tuning isn't justified (§9.7).

### 24.4 Chain-of-Thought (CoT), Tree-of-Thought (ToT), ReAct, and Reflection

**Chain-of-thought (CoT)** prompting instructs the model to generate intermediate reasoning steps before its final answer — directly improving performance on multi-step problems by giving the model "room" to work through sub-steps explicitly rather than jumping straight to an answer, at the cost of the extra tokens those reasoning steps consume (directly related to, but distinct from, a dedicated reasoning model's trained-in version of this behavior, §19.7). **Tree-of-thought (ToT)** extends this by exploring multiple candidate reasoning paths in parallel and evaluating which leads to the best outcome before committing — more thorough, and correspondingly more expensive (multiple reasoning paths multiply token consumption), reserved for problems where a single linear reasoning chain (CoT) is demonstrably insufficient. **ReAct (Reasoning + Acting)** interleaves reasoning steps with concrete tool-invocation actions (§8.2, §25) and observations of those tools' results, directly the mechanism underlying most practical agent loops — reasoning alone cannot use external information, and acting alone (calling tools) without reasoning cannot decide what to do with results, so ReAct's interleaving is what allows a model to plan, act, observe, and adapt its plan across multiple steps. **Reflection** has the model critique or evaluate its own previous output and revise it — directly related to, but distinct from, Self-RAG's trained-in self-critique (§23.8), since ordinary reflection is achieved through prompting/orchestration rather than requiring a specially fine-tuned model.

### 24.5 Context and Prompt Compression: Reducing Tokens Without Losing Meaning

**Context compression** reduces the token cost of retrieved content (§6, §21.6) or conversation history (§45) before it's included in a prompt — through extractive summarization (keeping only the most relevant sentences from a longer retrieved chunk), abstractive summarization (a model rewrites a passage more concisely), or simply retrieving smaller, more targeted chunks in the first place (§21.6's chunk-size tradeoff). This directly acts on Step 2/5 of §15's token-economics chain, trading a small amount of compute (running a compression step) for meaningfully reduced downstream token cost and freed context-window budget — worthwhile specifically when retrieved or historical content regularly consumes a disproportionate share of the context window relative to its actual relevance.

### 24.6 Prompt Caching: Avoiding Redundant Prefill Cost for Repeated Prefixes

**Prompt caching** (previewed in §7.6, §14.5) exploits the fact that many requests share an identical prefix — the same system prompt, the same few-shot examples, the same large retrieved document reused across several follow-up questions — by having the model provider cache the internal computation (effectively, the KV cache, §18.4) for that shared prefix, so subsequent requests only need to process the *new*, variable portion of the prompt rather than recomputing prefill (§15.7) for the entire input every time. This is a direct, substantial latency and cost win specifically for any workload with a large, stable, frequently-reused prefix (a long system prompt, a large document repeatedly queried) — the engineering implication being that prompt *structure* matters for cost, not just prompt *content*: placing stable, shared content first and variable content last maximizes how much of a request benefits from caching.

### 24.7 Context Window Management: The Ongoing Discipline of Fitting Within a Hard Ceiling

Every technique above ultimately feeds into one continuous constraint: the context window (§15.5) is a hard ceiling, and a production system must actively manage what occupies it — deciding, for a given request, how much budget goes to the system prompt, how much to conversation history (§45's truncation/summarization strategies), how much to retrieved context (§21.6's chunk sizing), and how much must be reserved for the model's own output — a genuine, continuously-revisited allocation decision, not a one-time setting, since any of these components can grow unpredictably (a longer conversation, a larger retrieved document) and silently crowd out budget needed elsewhere.

### 24.8 Engineering Intuition

> **When should I use few-shot examples instead of just a clearer instruction?** When the desired output format or reasoning pattern is easier to demonstrate concretely than to describe in words precisely — and when the per-request token cost (§24.3) of including those examples is acceptable at your expected request volume.

> **Why is my prompt-caching hit rate lower than expected?** Check whether variable content (the specific user query, a per-request timestamp) has been placed *before* stable, shared content in your prompt structure — caching (§24.6) requires the shared prefix to be genuinely identical and positioned first; any variable content earlier in the prompt breaks the cache for everything after it.

> **What would over-engineering look like here?** Reaching for Tree-of-Thought (§24.4) or complex reflection loops before confirming, via evaluation (§12, §29), that simpler chain-of-thought prompting is actually insufficient for the specific task at hand.

### 24.9 Decision Tree: Which Prompt/Context Technique Addresses My Situation?

```
Is the model's output format or reasoning pattern inconsistent?
  -> Try few-shot examples (§24.3) before assuming a larger/
     different model is needed.
Does the task require genuine multi-step reasoning?
  -> Add chain-of-thought prompting (§24.4) first; escalate to
     tree-of-thought only if CoT is evaluated as insufficient.
Does the task require using external tools/information across
multiple steps?
  -> ReAct-style interleaved reasoning+acting (§24.4, §25) is the
     correct structure, not a single-pass prompt.
Is context-window budget being consumed by large retrieved
documents or long conversation history disproportionate to their
relevance?
  -> Apply context compression (§24.5) and/or better chunking
     (§21.6) before reaching for a model with a larger context
     window.
Do many requests share a large, stable prefix (system prompt,
few-shot examples, a frequently-reused document)?
  -> Restructure the prompt with stable content FIRST and enable
     prompt caching (§24.6) -- a direct latency/cost win with no
     quality tradeoff.
```

### 24.10 Python Snippet: Structuring a Prompt for Maximum Cache Hit Rate

```python
# Demonstrates §24.6: placing STABLE content first (cacheable
# across many requests) and VARIABLE content last (unique per
# request) -- the opposite ordering breaks caching entirely.

def build_cacheable_prompt(system_instructions, few_shot_examples,
                             reusable_document, user_query):
    # Stable across MANY requests -- this prefix can be cached
    stable_prefix = (
        f"{system_instructions}\n\n"
        f"{few_shot_examples}\n\n"
        f"Reference document:\n{reusable_document}\n\n"
    )

    # Variable per request -- placed LAST so it never invalidates
    # the cached stable prefix above
    variable_suffix = f"Question: {user_query}"

    return stable_prefix + variable_suffix

# Calling this repeatedly with the SAME system_instructions/
# few_shot_examples/reusable_document but a DIFFERENT user_query
# lets the provider cache prefill (§15.7) for everything except
# the final line -- a direct cost/latency win at scale.
```

### 24.11 Further Reading

- Wei et al., "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models" (2022) — the foundational CoT paper underlying §24.4.
- Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models" (2022) — the primary source for §24.4's ReAct.
- Anthropic and OpenAI prompt-caching documentation — the current, practical reference for §24.6's provider-specific mechanics.

---
