## 55. AI Infrastructure Deep Dive: GPU Scheduling, KV Cache, Prompt Caching, RAG Mechanics, Agent Loops, Evaluation

### 55.1 What This Chapter Adds to §22

§22 established the mental model for AI infrastructure — why serving a model differs from serving an ordinary API, and previewed batching, RAG, and agent loops. This chapter covers the concrete mechanisms: GPU scheduling, the KV cache, prompt caching, RAG pipeline internals, agent/tool-use loop mechanics, and evaluation methodology.

### 55.2 GPU Scheduling: A Scarcer, More Specialized Resource Than CPU

§25.2 covered how an OS scheduler shares CPU time across many threads. GPU scheduling for model serving faces a related but distinct problem: GPUs are typically far more expensive and supply-constrained than CPUs (§22.2), and a single model often requires an entire GPU (or several, for very large models split across multiple devices) rather than being finely time-sliced the way CPU threads are. This means GPU scheduling decisions — which requests get batched together (§22.3), how many model replicas run concurrently, how work is queued when demand exceeds available GPU capacity — have an outsized cost impact compared to equivalent CPU scheduling decisions, and inefficient GPU utilization (idle GPU time, poorly-sized batches) translates directly and substantially into wasted infrastructure spend at a scale ordinary CPU inefficiency rarely does.

### 55.3 The KV Cache: Avoiding Redundant Computation During Generation

§22.4 established that a language model generates output incrementally, one piece at a time, with each new piece depending on everything generated so far. Naively, this would require recomputing attention over the *entire* preceding sequence for every single new piece generated — increasingly expensive as the sequence grows. The **KV (key-value) cache** avoids this redundant recomputation by storing the intermediate attention computations ("keys" and "values") for all previously-processed tokens, so that generating each new token only requires computing its own new contribution and reusing the cached results for everything before it, rather than recomputing the whole sequence from scratch each time. This cache is precisely why serving longer sequences consumes proportionally more GPU memory — the KV cache grows with sequence length, and it is frequently the actual limiting factor on how many concurrent requests a given GPU can serve simultaneously (more so than raw compute), directly informing the batching and capacity decisions from §22.3 and §55.2.

### 55.4 Prompt Caching: Avoiding Redundant Computation Across Requests

Where the KV cache (§55.3) avoids redundant computation *within* a single generation, **prompt caching** avoids redundant computation *across* multiple requests that share a common prefix — for instance, many requests that all begin with the same lengthy system instructions or the same retrieved document (§55.5), differing only in a final, request-specific question appended at the end. By caching the intermediate computation for that shared prefix and reusing it across requests, a serving system can skip recomputing the expensive shared portion entirely for every subsequent request sharing that same prefix, paying the full computational cost only for the request-specific portion. This is directly analogous to the ordinary caching principle from §10.2 (workloads with locality benefit from caching) applied specifically to the internal computation of model inference, and it can produce substantial cost and latency reductions for use cases with a stable, frequently-reused prompt structure.

### 55.5 RAG Pipeline Mechanics: What Actually Happens Between Query and Answer

§22.5 introduced RAG conceptually. The concrete pipeline typically runs: (1) the incoming query is converted into a vector embedding (§21.3); (2) that embedding is used to search a vector index (§54.5-54.6) for the most relevant stored documents or chunks; (3) the retrieved content is inserted into the prompt sent to the model, typically alongside instructions on how to use it; (4) the model generates a response grounded in that supplied content. A critical, often-overlooked engineering detail: the **chunking strategy** — how source documents are split into retrievable pieces before being embedded and indexed — directly determines retrieval quality; chunks that are too large dilute relevance (a large chunk might be only marginally about the query's actual topic) while chunks that are too small lose important surrounding context (a chunk might match a query's keywords while missing the context needed to correctly interpret them) — this is a genuine, non-obvious tuning problem, not a solved, one-size-fits-all default, and poor RAG output is very often traceable to a chunking or retrieval problem (§54) rather than any deficiency in the generating model itself.

### 55.6 Agent and Tool-Use Loop Mechanics

§22.6 introduced the agent loop conceptually: the model's output can request an external action, whose result feeds back into the next step. Concretely, this loop typically operates as: the model receives the conversation so far, plus a description of available tools/actions it may invoke; if it decides to invoke one, that structured request is parsed out of its output, the corresponding real action is executed (a genuine network call, §3.2, §9, inheriting every reliability and idempotency concern already covered in this handbook), and the result is appended back into the conversation history before calling the model again for its next step — repeating until the model produces a final answer requiring no further tool invocation. The engineering-relevant risks this loop introduces beyond ordinary API concerns: an unbounded loop (the model repeatedly invoking tools without converging toward a final answer, requiring an explicit maximum-iteration safeguard) and compounding cost/latency (each loop iteration is a full additional model inference call, so a multi-step agent task can be substantially more expensive and slower than a single-shot generation, directly informing the batching, caching, and cost-management considerations from earlier in this chapter).

### 55.7 Evaluation Methodology: Making "Is This Actually Good" Measurable

§22.7 flagged that a language model's output rarely has one deterministic correct answer, requiring dedicated evaluation practice. Concretely, evaluation approaches include: **golden datasets** — a curated set of representative inputs with known-good expected outputs or graded criteria, run automatically against every model, prompt, or pipeline change to catch regressions before they reach production, directly analogous to a conventional software test suite (§15.2) but for output quality rather than functional correctness; **LLM-as-judge** — using a separate model call to grade the primary model's output against defined criteria, a scalable but imperfect substitute for human judgment, itself requiring periodic validation against actual human ratings to confirm the judge model's grading remains reliable; and **human evaluation** — the most reliable but least scalable method, typically reserved for periodic, sampled deep validation rather than continuous, every-change testing. A mature evaluation practice layers these: automated golden-dataset and LLM-as-judge checks on every change for fast, cheap regression detection, with periodic human evaluation as a slower, higher-fidelity check validating that the automated methods remain trustworthy over time.

### 55.8 Common Mistakes and Production Debugging Signals

- Failing to account for KV cache memory growth with sequence length (§55.3) when capacity planning, leading to unexpectedly poor concurrency or out-of-memory failures specifically under long-context workloads that didn't appear during short-context testing.
- Choosing a chunking strategy for RAG (§55.5) without validating actual retrieval quality against representative queries, producing consistently mediocre generated answers that are misdiagnosed as a model-quality problem when the actual cause is poor retrieval.
- Deploying an agent loop (§55.6) with no maximum-iteration safeguard, allowing a model that fails to converge to loop indefinitely, silently consuming cost and latency with no forward progress.
- Shipping prompt or model changes with no automated evaluation (§55.7) in place, discovering quality regressions only through user complaints rather than a pre-deployment golden-dataset check.

### 55.9 Engineering Intuition

> **How do I know if my RAG pipeline's problem is retrieval or generation?** Manually inspect what was actually retrieved for a poorly-answered query — if the retrieved content genuinely doesn't contain the needed information, the problem is retrieval/chunking (§55.5); if the right content was retrieved but the model still answered poorly, the problem is in prompting or the model itself.
>
> **What symptoms indicate a KV cache capacity problem?** Degraded concurrency or increased latency specifically correlated with longer input/output sequence lengths, rather than with raw request volume alone.
>
> **What metrics indicate an evaluation gap?** The absence of any automated, quantified quality metric tracked across prompt or model changes — if quality regressions are only ever detected via user reports, no meaningful evaluation practice (§55.7) is actually in place.
>
> **What breaks first if agent loops have no safeguards?** Cost and latency for a small fraction of requests (those that fail to converge) can spike dramatically and unpredictably, without any explicit error, since the loop is technically still "working," just not making progress.
>
> **When is a simple, single-shot generation (no RAG, no agent loop) sufficient?** When the model's built-in knowledge is adequate for the task and no multi-step external action is genuinely required — both RAG and agent loops are real, deliberate additions of complexity and cost, justified specifically by a genuine need for grounding in external data or the ability to take real actions, not a default to reach for regardless of need.
>
> **What would a hyperscale company do?** Tune GPU scheduling and KV-cache-aware capacity planning continuously, invest heavily in chunking and retrieval quality tuning for RAG pipelines, enforce maximum-iteration and cost safeguards on every agent loop, and run continuous, layered evaluation (automated plus periodic human review) on every model or prompt change (§77).
>
> **What would a two-person startup do?** Use a hosted model API with its provider-managed KV cache and batching, keep RAG chunking simple and iterate based on manual spot-checking, and adopt lightweight, informal evaluation (a small golden dataset, checked manually before major changes) rather than a full automated pipeline.
>
> **What changes with scale?** At low request volume, simple, unoptimized RAG chunking and manual quality spot-checks are proportionate. At high volume and with cost and quality both becoming material concerns, the concrete mechanisms in this chapter — cache-aware capacity planning, tuned chunking, safeguarded agent loops, and systematic, automated evaluation — become necessary operational discipline rather than optional refinement (§77).

### 55.10 Exercises

1. A RAG-powered support assistant frequently gives plausible-sounding but factually wrong answers. Using §55.5, describe the specific diagnostic step you would take first, and what you would look for to distinguish a retrieval problem from a generation problem.
2. Design a golden-dataset evaluation check (per §55.7) for a summarization feature, specifying what the dataset should contain and what automated grading approach (exact match, LLM-as-judge, or another method) would be appropriate, and why.

### 55.11 Further Reading

- Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention" (2023) — the vLLM paper, directly extending §55.3's KV cache discussion with its memory-management innovations.
- Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020) — referenced already in §22.10, providing the foundational grounding for §55.5's pipeline mechanics.

---
