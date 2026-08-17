## 16. Tokenization Mechanics: BPE, WordPiece, SentencePiece

### 16.1 The Problem: Why Not Just Split on Whitespace, or Use Individual Characters?

§15.2 established that a tokenizer converts characters into a fixed vocabulary of integers, but not *why* modern tokenizers use sub-word units specifically. Splitting on whitespace produces a whole-word vocabulary that cannot represent words never seen during vocabulary construction (a fundamental **out-of-vocabulary** problem) and produces a vocabulary far too large to embed efficiently (§15.4) given how many distinct words exist across every language and domain. Tokenizing character-by-character solves the out-of-vocabulary problem completely but produces sequences so long that context windows (§15.5) and quadratic attention cost (§15.6) would make it impractical. Sub-word tokenization is the deliberate, engineered middle ground between these two failure modes.

### 16.2 The Core Idea: Learn a Vocabulary of Frequent Sub-Word Units from Data

Rather than a fixed rule, sub-word tokenizers **learn** their vocabulary statistically from a large training corpus: common whole words become single tokens (efficient), rare words are decomposed into smaller, more frequent pieces (no out-of-vocabulary failures — any string can always be represented, in the worst case, character by character), and moderately common prefixes/suffixes/word-stems often become their own tokens, giving the model some implicit access to morphological structure without it being hand-engineered.

### 16.3 Byte-Pair Encoding (BPE): The Dominant Algorithm

**BPE** builds its vocabulary bottom-up: starting from individual characters (or bytes), it repeatedly finds the single most frequent adjacent pair of tokens in the training corpus and merges it into one new token, continuing for a fixed number of merges until the target vocabulary size is reached. The result is a vocabulary where common words and word-fragments are single tokens by construction, while rare or unseen strings fall back to progressively smaller, guaranteed-present sub-pieces. **Byte-level BPE** (used by GPT-family models) operates on raw UTF-8 bytes rather than Unicode characters directly, guaranteeing that literally any input — including unusual symbols, emoji, or malformed text — can always be tokenized without a true out-of-vocabulary failure, at the cost of common non-English text sometimes requiring more tokens per character than English (a direct, practical instance of §15.3's non-English token-count warning).

### 16.4 WordPiece: BPE's Close Relative, Optimized Differently

**WordPiece** (used by BERT-family models) uses a similar bottom-up merging strategy, but instead of always merging the *most frequent* pair, it merges the pair that most increases the training corpus's likelihood under a language-model objective — a subtly different optimization target that in practice produces broadly similar sub-word vocabularies to BPE, with the specific difference rarely mattering for an application engineer's decisions (the choice of tokenizer is fixed by the chosen model, not selected independently).

### 16.5 SentencePiece: Tokenization Without Assuming Whitespace-Delimited Words

**SentencePiece** is not a third merging algorithm but a different *framework*: it treats the input as a raw stream of Unicode characters (including whitespace itself, encoded as a special marker) rather than first splitting on whitespace as a pre-processing step — a critical difference for languages that don't use whitespace to separate words at all (Japanese, Chinese, Thai), where a whitespace-splitting pre-processing step would be actively wrong before sub-word merging even begins. SentencePiece can implement either a BPE-style or a unigram-language-model-style merging strategy underneath this whitespace-agnostic framework, meaning "SentencePiece vs. BPE" is not quite the right comparison — SentencePiece is more accurately understood as BPE's (or a similar algorithm's) modern, language-agnostic delivery mechanism.

### 16.6 Vocabulary Size: A Real Engineering Tradeoff, Not an Arbitrary Number

A larger vocabulary means more whole words become single tokens (shorter sequences for the same text, §15.3's ratio improves, reducing cost and context consumption directly) but also means a larger embedding matrix (§15.4, §18.3) — more parameters, more GPU memory, and a larger final output layer the model must compute a probability distribution over at every single generation step (§19), directly affecting decode-phase latency (§15.7). Vocabulary size (typically 32K-256K across current major models) is therefore a genuine architecture-level tradeoff between sequence length and per-token computational/memory cost, not a free "bigger is always better" parameter — exactly why different model families settle on meaningfully different vocabulary sizes rather than converging on one number.

### 16.7 Practical Consequences: Why Token Count Varies by Language, Domain, and Formatting

Directly following from §16.3-16.5: a tokenizer's vocabulary was built from a specific training corpus, meaning text resembling that corpus (typically English, common code patterns) tokenizes efficiently, while text unlike it (low-resource languages, unusual formatting, long random identifiers, base64-encoded data) decomposes into many more, smaller tokens — a fact with direct cost consequences (§15.9) that makes token-count estimation for non-English or code-heavy products meaningfully less reliable from word-count alone, and a reason production systems should measure actual token counts (§16.8) rather than estimate them from word or character counts.

### 16.8 Engineering Intuition

> **How do I know if my product's token costs will be higher than a naive estimate suggests?** Check whether your primary content is non-English, code, or contains many rare identifiers/numbers (§16.7) — any of these push the tokens-per-word ratio well above the ~1.3-1.5x English baseline (§15.3), and should be measured directly (§16.9) rather than assumed.

> **Why does the same sentence produce a different token count on two different models?** Different models use different vocabularies (trained on different corpora, different sizes, §16.6) — token counts are never comparable across model families, only within one tokenizer, a frequent source of confusion when migrating between providers.

> **What would over-engineering look like here?** Building a custom tokenizer for a niche domain (e.g., a specific programming language or scientific notation) before confirming that the existing tokenizer's token-count inflation for that domain (§16.7) is actually large enough to matter for cost or context-window purposes.

### 16.9 Decision Tree: Do I Need to Think About Tokenization Directly?

```
Are you calling an existing model's API (not training your own
tokenizer)?
  YES -> You do NOT choose or design tokenization -- it's fixed
         by the model. Your only lever is MEASURING actual token
         counts (§16.9's snippet) for your real content, not
         estimating from word counts, especially for non-English
         or code-heavy content (§16.7).
  NO (training/fine-tuning a model from scratch, rare) ->
         Vocabulary size (§16.6) is a real architectural decision:
         larger vocabulary = shorter sequences but larger
         embedding/output matrices -- balance against your target
         GPU memory budget (§11.3) and expected content language
         mix.
```

### 16.10 Python Snippet: Measuring Real Tokenization Behavior Across Content Types

```python
# Demonstrates §16.7: token counts vary significantly by content
# type, even for text of similar character length -- always
# MEASURE, don't assume.

import tiktoken

encoder = tiktoken.encoding_for_model("gpt-4o")

samples = {
    "english_prose": "The quarterly report shows steady growth.",
    "code": "def calculate_total(items): return sum(i.price for i in items)",
    "identifiers": "a3f9c8e1-4b2d-4e7a-9f1c-8d3e5b6a7c9d",
}

for label, text in samples.items():
    tokens = encoder.encode(text)
    ratio = len(tokens) / len(text.split())  # tokens per "word"
    print(f"{label}: {len(text)} chars, {len(tokens)} tokens, "
          f"{ratio:.2f} tokens/word")
# Output shows identifiers and code produce a MUCH higher
# tokens-per-word ratio than plain English prose -- directly
# why cost estimates (§15.13) must use real content samples.
```

### 16.11 Further Reading

- Sennrich et al., "Neural Machine Translation of Rare Words with Subword Units" (2016) — the foundational BPE-for-NLP paper underlying §16.3.
- Kudo & Richardson, "SentencePiece: A simple and language independent subword tokenizer" (2018) — the primary source for §16.5.

---
