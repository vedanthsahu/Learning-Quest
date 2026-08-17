## 2. Mental Model: Transformers and LLMs

### 2.1 The Problem: Understanding Text Requires Understanding Relationships Between Words, Not Just Words

Before transformers, machine learning models processing text (recurrent neural networks) read a sentence one word at a time, in order, carrying forward a compressed summary of everything read so far. This works poorly for long text: by the time such a model reaches word 50 of a paragraph, its compressed summary of word 1 has often been diluted into near-uselessness, and — because processing is strictly sequential — these models cannot be parallelized across modern GPU hardware nearly as effectively as an architecture that could look at an entire sequence at once. The transformer architecture, introduced in 2017, solves both problems with one mechanism: **attention**.

### 2.2 Attention, Conceptually: Letting Every Word Look at Every Other Word Directly

**Attention** lets a model, when processing any given word in a sequence, directly weigh the relevance of every *other* word in that sequence, regardless of distance — instead of relying on a diluted, sequentially-carried-forward summary, the word "it" in a long sentence can attend directly and strongly to whatever noun it actually refers to, three sentences earlier, with no dilution in between. This is the mechanism that gives modern LLMs their characteristic ability to maintain coherence and correctly resolve references across long passages of text — a direct, engineering-relevant consequence of a mechanism you don't need to derive mathematically to use correctly.

**Self-attention** specifically means a sequence attends to itself — every word in the input considers every other word in that same input. **Cross-attention** means one sequence attends to a *different* sequence — for example, in translation, the output sentence being generated attends back to the original input sentence being translated. **Multi-head attention** runs several attention computations in parallel, each potentially learning to focus on a different kind of relationship (one "head" might specialize in grammatical structure, another in factual reference) — analogous to running several independent analyses of the same text simultaneously and combining their conclusions.

### 2.3 Why Self-Attention Scales Poorly, and Why That Matters to You Directly

Attention's mechanism requires comparing every word in a sequence against every other word — for a sequence of length N, that's roughly N² comparisons. This means the computational cost of processing a sequence grows *quadratically* with its length, not linearly — doubling your context length roughly quadruples the attention computation required, not merely doubles it. This single mathematical fact is the direct, root cause of an enormous share of this handbook's later engineering content: it's why long context windows are expensive (§15's token economics), why Flash Attention was invented specifically to make this computation more memory-efficient without changing its fundamental cost (§18), and why context management, summarization, and retrieval (rather than "just put everything in the prompt") are core engineering disciplines rather than a lazy shortcut (§7, §24).

### 2.4 Tokens: The Actual Unit Everything Is Measured In

A model does not process raw characters or whole words directly — it processes **tokens**, chunks of text (often sub-word pieces) produced by a **tokenizer** before anything reaches the model at all. "Understanding" might be one token; "un-der-stand-ing" might be several, depending on the specific tokenizer. This matters immediately and practically: every cost figure, every context-window limit, and every latency consideration in this entire handbook is measured in tokens, not words or characters, and the mechanics of exactly how text becomes tokens is important enough to warrant its own dedicated deep dive (§15-16) rather than being treated as an invisible implementation detail.

### 2.5 The Context Window: A Hard, Priced Ceiling

The **context window** is the maximum number of tokens (input plus output combined, for most models) a model can process in a single request. This is not merely a technical curiosity — it is a hard ceiling directly shaped by §2.3's quadratic cost (a model provider chooses a maximum context length partly because serving arbitrarily long contexts would be prohibitively expensive to run), and it directly constrains product design: a customer support assistant that needs to "remember" an entire long conversation history, or a document-analysis product handling a 200-page contract, must engineer around this ceiling deliberately (via retrieval, summarization, or careful truncation, §7 and §45) rather than assuming context is unlimited.

### 2.6 Positional Encoding: Attention Alone Has No Sense of Word Order

A subtle but important gap: the attention mechanism described in §2.2, by itself, treats its input as an unordered set of words — nothing about the mechanism inherently distinguishes "the dog bit the man" from "the man bit the dog." **Positional encoding** is the fix: additional information injected into each token's representation, encoding *where* in the sequence that token sits, so the model can actually use word order (which, in language, obviously carries meaning) rather than discarding it. Modern models increasingly use **RoPE (Rotary Positional Embedding)**, a specific positional encoding scheme favored partly because it generalizes better to sequence lengths longer than what the model was originally trained on — directly relevant to why some models handle long-context tasks more gracefully than others.

### 2.7 Embeddings: Turning Tokens Into Numbers a Model Can Actually Compute With

A neural network cannot directly compute with text — every token must first be converted into a list of numbers (a **vector**) via an **embedding matrix**, a large lookup table learned during training that maps each possible token to its own numeric vector. Critically, these vectors are learned such that tokens with similar meaning or usage end up with similar (mathematically "close") vector representations — the entire foundation of the embeddings-based search and retrieval techniques covered in full starting at §3 and §20, where this same idea (represent meaning as a vector, measure similarity as a mathematical distance) is applied to whole sentences and documents, not just individual tokens.

### 2.8 Decoder-Only, Encoder-Only, and Encoder-Decoder: Three Shapes for Three Different Jobs

Transformers come in three architectural shapes, each suited to a different task shape: **encoder-only** models (like BERT) read an entire input at once and produce a rich representation of it, well-suited to classification and understanding tasks but not to generating new text. **Decoder-only** models (the architecture behind GPT, Claude, and the overwhelming majority of modern general-purpose LLMs) generate text one token at a time, each new token conditioned on everything generated so far — the natural architecture for open-ended text generation, chat, and completion. **Encoder-decoder** models (like the original T5 or translation-focused models) combine both: an encoder reads and understands an input sequence, and a decoder generates an output sequence conditioned on that understanding — well suited to tasks with a clear, distinct input and output (translation, summarization as a distinct transformation). The practical, engineering-relevant takeaway: the general-purpose chat assistants this handbook centers on are decoder-only, and understanding this explains their core behavior — generating a response incrementally, one token at a time, each token genuinely dependent on every token that came before it, including its own already-generated output.

### 2.9 Engineering Intuition

> **How do I know if a task actually needs a full LLM versus a smaller, cheaper classical model?** If the task is fundamentally about generating open-ended, novel language (drafting, explaining, conversing), a decoder-only LLM (§2.8) is the right shape. If it's a fixed-category classification or extraction task, a much smaller, cheaper model (even a non-transformer classical ML model) may perform just as well at a fraction of the cost — reconsider before defaulting to an LLM for every task.
>
> **What symptoms indicate you're hitting the context window ceiling?** Truncated or missing information from early in a long conversation or document, or an explicit API error about exceeding maximum context length — the direct, practical manifestation of §2.5's hard ceiling.
>
> **What would over-engineering look like at this level?** Trying to explain a product behavior by reasoning about attention weights or embedding math directly — nearly always, the actual engineering lever is one layer up (context management, retrieval, prompt design, §3-7), and reaching for transformer internals to explain a product-level symptom is usually the wrong altitude.

### 2.10 Decision Tree: Do I Need to Understand Transformer Internals for This Task?

```
Are you debugging why a model behaves a certain way for a
SPECIFIC PRODUCT-LEVEL reason (wrong answer, slow response,
high cost)?
  YES -> Start at the product/engineering layer (retrieval
         quality, §34; prompt design, §7; context management,
         §45) -- transformer internals are RARELY the actual
         lever, even when the symptom feels "model-related."
  NO -> Are you choosing between model architectures/providers
        for a new capability (e.g., "do I need long-context
        support")?
    YES -> §2.5-2.8's shape/context distinctions directly
           inform this choice.
    NO -> You likely don't need this chapter's internals for
          your current task -- treat the model as a capability
          you're purchasing, not a system you're building.
```

### 2.11 Python Snippet: Tokens Are Not Words — See It Directly

```python
# Demonstrates §2.4's core point: tokens != words, and this
# directly determines your cost and context-window usage.

import tiktoken  # OpenAI's open-source tokenizer library

encoder = tiktoken.encoding_for_model("gpt-4o")

text = "Tokenization is not the same as word-splitting."
tokens = encoder.encode(text)

print(f"Characters: {len(text)}")          # 49 characters
print(f"Words (naive split): {len(text.split())}")  # 7 "words"
print(f"Actual tokens: {len(tokens)}")     # a DIFFERENT number --
                                            # run it and see
for t in tokens:
    print(f"  token id {t} -> {encoder.decode([t])!r}")
    # notice sub-word pieces like "ization" splitting off
    # "Token" -- this is exactly what §16's BPE mechanism does
```

### 2.12 Further Reading

- Vaswani et al., "Attention Is All You Need" (2017) — the original transformer paper; read for historical grounding, not as a requirement for engineering fluency.
- Jay Alammar, "The Illustrated Transformer" — the most widely-cited visual, intuition-first explanation of attention, matching this chapter's engineering-first philosophy.

---
