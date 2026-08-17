## 87. Hands-On AI Engineering Labs I: Tokenization to RAG Fundamentals

### 87.1 How to Use These Labs

Following the companion Software Systems Handbook's §120-121 convention: each lab states a problem and explicit acceptance criteria, deliberately without a full solution — the value is in the specific decisions you make while implementing, not in a provided answer. Use any language/model-provider you have access to; a small, cheap model is sufficient for every lab in this chapter.

### 87.2 Lab: Tokenization Cost Profiler

**Problem:** Build a small tool that measures actual token counts (using a real tokenizer library, e.g., `tiktoken`) across several distinct content types: English prose, code, a list of UUIDs/identifiers, and non-English text. **Acceptance criteria:** (1) Report tokens-per-word (or tokens-per-character) for each content type separately; (2) demonstrate, with real measured numbers, that at least two content types differ by more than 50% in this ratio; (3) use these measured ratios to produce a corrected cost estimate for a hypothetical feature, contrasted against a naive estimate that assumed a single, uniform tokens-per-word ratio across all content. **Hints:** §15.3, §16.7, §16.10. **Done when:** you have a table of real numbers, not assumed ones, and can state which content type in your test set was the most expensive per word and by how much.

### 87.3 Lab: Minimal Semantic Search

**Problem:** Build a small semantic search tool over 20-30 short text documents (paragraphs from an article, product descriptions, or similar): embed each document, embed a query, and return the top-k most similar documents by cosine similarity. **Acceptance criteria:** (1) Correct cosine similarity implementation (verify against a library's built-in implementation for at least one pair, to confirm your manual math is right); (2) demonstrate at least one query where semantic search correctly retrieves a relevant document sharing no literal keywords with the query (proving it's doing more than keyword matching); (3) demonstrate at least one query where semantic search performs worse than a simple keyword search would have (an exact-code or rare-term query), and explain why using §20.3's sparse-embedding discussion. **Hints:** §3.3, §20.2, §20.6. **Done when:** you can articulate, from your own two demonstrated examples, exactly when dense embeddings help and when they don't.

### 87.4 Lab: Hybrid Retrieval With Reciprocal Rank Fusion

**Problem:** Extend §87.3 by adding a BM25-based (or simple TF-IDF) keyword-search component alongside your semantic search, and combine both ranked lists using Reciprocal Rank Fusion (§21.4). **Acceptance criteria:** (1) Both retrieval methods run independently and produce their own ranked lists for the same query; (2) implement RRF's rank-based combination formula yourself (don't just concatenate or average raw scores — §21.4 explains why raw-score combination is fragile); (3) demonstrate a specific query where the hybrid result set is measurably better (the truly relevant document ranks higher) than either method alone. **Hints:** §20.4, §21.4. **Done when:** you have one concrete query example showing hybrid outperforming both individual methods, not just a claim that it should.

### 87.5 Lab: Chunking Strategy Comparison

**Problem:** Take a longer source document (several pages) and index it two different ways — fixed-size chunking (e.g., every 200 tokens, no regard for sentence/paragraph boundaries) and semantic chunking (splitting at paragraph or section boundaries) — then run the same set of test queries against both indexes. **Acceptance criteria:** (1) Both chunking strategies are actually implemented and independently indexed; (2) build a small golden set of 5-10 queries with known-relevant answers; (3) measure retrieval quality (does the correct information appear in the top-k retrieved chunks) for both strategies and report the difference; (4) identify at least one specific query where fixed-size chunking split a needed piece of information awkwardly across two chunks, degrading retrieval, that semantic chunking avoided. **Hints:** §21.6, §77.2. **Done when:** you have a measured, not assumed, quality difference between the two strategies on your own golden set.

### 87.6 Lab: Minimal Grounded RAG Pipeline With Citation

**Problem:** Combine §87.3-87.5's retrieval work into a full, minimal RAG pipeline: retrieve relevant chunks for a query, assemble a grounded prompt with explicit citation instructions, and generate an answer that cites which chunk(s) support each claim. **Acceptance criteria:** (1) The generated answer includes explicit citations (e.g., "[source 2]") tied to specific retrieved chunks; (2) test with a query the corpus genuinely cannot answer, and confirm the model says so rather than fabricating an answer (§35.7); (3) manually verify, for at least 5 test queries, whether every claim in the generated answer is actually supported by a cited chunk (a manual faithfulness check, §29.6's underlying skill, done by hand before you automate it). **Hints:** §6.4, §23.9, §29.6. **Done when:** you've found and can describe at least one case where the model over-claimed beyond what its cited source actually supported — this is the hallucination-adjacent failure §35 exists to catch, and finding it yourself by hand is the point of this lab.

### 87.7 Lab: Cache-Optimized Prompt Assembly

**Problem:** Build a prompt-assembly function that structures a system prompt, a set of few-shot examples, and a variable user query, deliberately ordering stable content first and variable content last (§24.6). Using a provider that supports prompt caching, measure the actual latency/cost difference between a well-ordered prompt and a deliberately poorly-ordered one (variable content, like a timestamp, placed before the stable prefix). **Acceptance criteria:** (1) Both prompt orderings are tested against the same provider across multiple repeated requests; (2) report the measured cache-hit-rate or latency difference between the two orderings, not just a theoretical explanation; (3) identify the specific line of your poorly-ordered prompt that broke caching. **Hints:** §24.6, §32.6, §46.4-46.6. **Done when:** you have real, measured latency or cost numbers demonstrating the difference, mirroring the real incident pattern §82.3's case study describes.

### 87.8 Lab: A Manually-Validated LLM-as-Judge

**Problem:** Build a simple LLM-as-judge scoring function (e.g., faithfulness scoring, §12.8) and validate it against your own manual ratings on a set of 15-20 examples. **Acceptance criteria:** (1) Score the same 15-20 model outputs both via your LLM-as-judge and via your own independent manual judgment, without looking at the judge's score first; (2) compute the agreement rate between your manual ratings and the judge's; (3) identify at least one specific example where the judge disagreed with your manual rating, and hypothesize why (position bias, verbosity bias, §29.3, or a genuine judge error); (4) if agreement is poor, revise the judge prompt once and re-measure. **Hints:** §12.3, §29.3. **Done when:** you have an actual measured agreement rate (not an assumption that "the judge is probably fine") and can name a specific disagreement case.

### 87.9 Lab: Token-Budget Cost Estimator for a Hypothetical Feature

**Problem:** Pick a hypothetical AI feature (a support chatbot, a document-summarization tool) and produce a full pre-launch cost estimate walking §15.13's token-economics chain, using your own reasonable assumptions for traffic volume, and cross-check your assumptions against §87.2's real measured tokenization ratios rather than a naive word-count guess. **Acceptance criteria:** (1) Estimate is broken down by input tokens, output tokens, and (if applicable) retrieval/embedding cost, not a single blended number; (2) explicitly account for the possibility of retries or multi-step tool use inflating the estimate, per §33.6's most common undercounting pattern; (3) state, in writing, which single assumption in your estimate is most likely to be wrong in production and why. **Hints:** §15.13, §33.6, §81.8. **Done when:** you've produced a written estimate you could defend in front of a skeptical engineering lead, including its weakest assumption named explicitly.

### 87.10 Engineering Intuition

> **Why does this chapter emphasize measuring over asserting so heavily?** Because §67's entire common-traps chapter exists precisely because AI engineers substitute assumption for measurement more easily than in ordinary software (a model's behavior feels intuitive to reason about, which is exactly what makes ungrounded assumptions dangerous) — these labs are designed to make you measure at least once before you trust an intuition.

### 87.11 Further Reading

- §15 (Token Economics), §21 (Retrieval Mechanics), §23.9 (Grounding/Citation), §29.3 (LLM-as-Judge) — the direct mechanism references for this chapter's eight labs.

---
