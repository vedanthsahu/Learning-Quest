## 88. Hands-On AI Engineering Labs II: Agents, Evaluation, and Production Practice

### 88.1 How This Chapter Extends §87

§87's labs were largely single-call or single-pipeline. This chapter's labs require multi-step, stateful, or production-adjacent behavior — an agent loop, a regression harness, a rate limiter — the categories of system where most of Part III's diagnosed failure modes (§32-42, §77-80) actually originate.

### 88.2 Lab: A Bounded ReAct Agent Loop

**Problem:** Build a minimal ReAct-style agent with at least two tools (e.g., a calculator and a fake "search" function returning canned results) that reasons, acts, observes, and repeats until it produces a final answer or hits a step limit. **Acceptance criteria:** (1) The agent correctly chains at least two tool calls for a task genuinely requiring both; (2) a hard `max_steps` safeguard is enforced and demonstrated (deliberately give the agent a task designed to make it loop, and confirm it terminates gracefully rather than running forever); (3) implement tool-repetition detection (§36.12) that flags when the same tool is called with near-identical arguments more than twice in a row; (4) test what happens when a tool returns an ambiguous result (e.g., an empty list) and observe whether the agent behaves reasonably or starts looping — this is deliberately meant to surface §36.6's exact failure mode yourself. **Hints:** §25.11, §36. **Done when:** you've caused your own agent to loop at least once on purpose, diagnosed why using §36's framework, and fixed it.

### 88.3 Lab: A Schema-Constrained Tool With Structural Safety Limits

**Problem:** Implement a simulated "issue refund" tool with a hard, schema-level cap on the amount it will process autonomously (§30.10), and wire it into a simple tool-calling setup. **Acceptance criteria:** (1) Requests within the cap process automatically; (2) requests exceeding the cap are routed to a "requires human approval" response, not silently rejected or silently approved; (3) demonstrate that this limit holds even if you explicitly try to prompt-inject around it (craft a user message attempting to convince the model to approve a large refund, and confirm the structural check catches it regardless of what the model itself "decides"). **Hints:** §13.6, §30.6, §30.10, §53.9. **Done when:** you've specifically demonstrated acceptance criterion 3 — the structural check holding even under an adversarial prompt, not just under a well-behaved one.

### 88.4 Lab: A Golden-Dataset Regression Harness

**Problem:** Build a small golden dataset (10-15 query/expected-answer or query/expected-criteria pairs) for a prompt or RAG pipeline you've built in an earlier lab, and a harness that runs the full set automatically and reports a pass/fail or score against a baseline. **Acceptance criteria:** (1) The harness runs the entire golden set with one command and produces a single summary score; (2) deliberately introduce a prompt change that you know degrades quality, run the harness, and confirm it catches the regression; (3) deliberately introduce a purely cosmetic change (e.g., rewording an instruction with no intended behavior change) and check whether it also affects the score — if it does, this mirrors §82.7's real hallucination-regression case study, where a supposedly-cosmetic refactor wasn't cosmetic at all. **Hints:** §29.2, §29.5, §52.9. **Done when:** you've caught at least one regression with your harness that you introduced deliberately, confirming the harness actually works before you trust it for real changes.

### 88.5 Lab: Semantic Cache With Measured Precision

**Problem:** Build a semantic cache (§72.2) in front of a Q&A system: embed incoming queries, check for a sufficiently similar previously-answered query in the cache, and return the cached response above a similarity threshold. **Acceptance criteria:** (1) Demonstrate a cache hit for a paraphrased (not identical) query; (2) deliberately tune the similarity threshold too loosely and demonstrate a false-positive cache hit — a query that's superficially similar but should have gotten a different answer, incorrectly served the wrong cached response; (3) tune the threshold to eliminate that specific false positive, and check whether it costs you a legitimate hit elsewhere (the precision/recall tradeoff named explicitly in §72.2). **Hints:** §72.2. **Done when:** you have both a demonstrated false-positive case and the threshold adjustment that fixes it, showing you've felt the actual tradeoff, not just read about it.

### 88.6 Lab: Simulated Embedding Drift

**Problem:** Index a small document set with one embedding model, then re-query using a *different* embedding model for the query only (simulating an incomplete migration where documents weren't re-embedded). **Acceptance criteria:** (1) Measure retrieval quality (recall against a small golden set) using matched embeddings (same model for documents and query) as a baseline; (2) measure retrieval quality again using mismatched embeddings (old document embeddings, new query embedding) and report the degradation; (3) fully re-embed the documents with the new model and confirm retrieval quality recovers. **Hints:** §20.7, §38.4, §38.14. **Done when:** you have three concrete, measured recall numbers (matched, mismatched, re-embedded) demonstrating the full incident-and-recovery arc §38's chapter and §77.3's catalog entry describe in prose.

### 88.7 Lab: Token-Budget Rate Limiter Under Concurrency

**Problem:** Implement a token-budget-based rate limiter (§31.13) that tracks token consumption per identity over a rolling time window, and test it under genuinely concurrent (not sequential) requests. **Acceptance criteria:** (1) Sequential requests within budget are allowed, and a request that would exceed the budget is rejected; (2) fire several concurrent requests simultaneously that collectively would exceed the budget, and confirm the limiter doesn't over-admit due to a race condition in the check-and-update step (directly the same concurrency concern as the companion handbook's §121.9 distributed rate limiter, applied here to token budgets specifically); (3) test a short burst within a longer window and confirm the limiter's window granularity actually bounds worst-case burst exposure as intended (§33.11's lesson about window granularity). **Hints:** §31.8, §31.13. **Done when:** you've demonstrated acceptance criterion 2 with an actual concurrency test, not just sequential calls.

### 88.8 Lab: A Minimal Layered Guardrail Pipeline

**Problem:** Build a two-layer guardrail: a fast rule-based regex layer (§30.10's pattern) catching obvious injection attempts, and a second, slower classifier-stub layer (can be a second, cheap LLM call scoring "does this look like an injection attempt, 1-10") for anything the rule layer doesn't catch. **Acceptance criteria:** (1) A set of obvious injection attempts (§13.10's examples) are caught by the rule layer alone; (2) construct at least 3 paraphrased/novel injection attempts specifically designed to evade your rule patterns, and confirm the classifier layer catches at least some of them where the rule layer didn't; (3) measure your false-positive rate against a set of legitimate, benign requests that happen to use similar phrasing (e.g., a legitimate request that includes the word "ignore" in an unrelated context) — report how many were incorrectly flagged. **Hints:** §30.2, §30.5, §83.6. **Done when:** you have a measured false-positive rate, not just a claim that the guardrail "works," mirroring §83.6's real case study about guardrail sensitivity tradeoffs.

### 88.9 Lab: Win-Rate Evaluation With Position-Bias Control

**Problem:** Build a win-rate evaluation harness (§29.11) comparing two versions of a prompt against the same golden queries, using an LLM judge with randomized presentation order. **Acceptance criteria:** (1) The harness runs both prompt versions against every golden query and presents both outputs to a judge in a genuinely randomized order per query, not a fixed order; (2) compute the win rate for your "candidate" prompt version; (3) deliberately disable the randomization (always present candidate first) and re-run — compare the two win rates and report whether position bias measurably shifted the result on your specific judge and prompt pair. **Hints:** §29.3, §29.8, §29.11. **Done when:** you have two win-rate numbers (randomized vs. fixed-order) and can state whether position bias was a real, measurable effect for your specific setup or negligible — either finding is a valid, informative result.

### 88.10 Engineering Intuition

> **Why do so many labs in this chapter ask you to deliberately break something first?** Because recognizing a failure mode you caused yourself (a loop, a false-positive cache hit, an embedding-drift regression) builds far more durable diagnostic intuition than reading about the same failure mode in §77-80's catalog — the catalog tells you what to look for; these labs make you find it.
>
> **What should I do once I've completed a lab?** Write a short note on what your first (probably wrong) intuition was before you measured, and how the measurement corrected it — this habit, repeated across enough labs, is what §85's closing wisdom chapter is ultimately trying to instill as a reflex, not just a chapter you read once.

### 88.11 Further Reading

- §25 (Agent Mechanics), §36 (Agent Reliability), §29 (Evaluation Mechanics), §30 (Security Mechanics), §72 (Caching Patterns) — the direct mechanism references for this chapter's eight labs.

---
