## 22. Mental Model: AI Infrastructure and LLM Serving

### 22.1 Why Serving a Model Is Not Like Serving an Ordinary API

§4 established the mental model for ordinary backend APIs: a request arrives, your code runs some logic (typically dominated by I/O — a database query, a downstream call), and a response is returned, usually in milliseconds, at a cost per request small enough to treat as negligible. Serving a large language model breaks nearly every one of these assumptions at once: the "logic" is now a massive numerical computation that is genuinely compute-bound rather than I/O-bound (§1.4), it can take seconds rather than milliseconds even when everything is working correctly, its resource requirements (specialized processors, large amounts of fast memory) are far more specialized and expensive than an ordinary application server's, and its cost per request is high enough that it must be treated as a first-class engineering and financial concern rather than an afterthought. GPU scheduling, batching mechanics, KV caching, and RAG pipeline internals are deferred to Pass 2, §55.

### 22.2 Why GPUs, and Why That Changes the Capacity Model

Language models are, computationally, an enormous number of simple numerical operations (matrix multiplications) that can be done in parallel. A **GPU** (or similar specialized processor) is built to perform exactly this kind of massively parallel numerical computation far faster than a general-purpose CPU, at the cost of being far less flexible for the kind of varied, branching logic ordinary application code contains. The consequence for capacity planning (§23, §56) is significant: instead of provisioning generic, interchangeable, relatively cheap application servers (§18.4), you are now provisioning a comparatively small number of specialized, expensive, and often supply-constrained processors — which fundamentally changes the economics and scaling strategy for this part of a system compared to everything else in this book so far.

### 22.3 Batching: The Central Efficiency Technique, and What It Trades Away

Because GPUs are so much more efficient when doing the same kind of computation on many inputs at once, serving systems for models typically **batch** multiple incoming requests together and process them as one larger computation, rather than handling each request in full isolation the moment it arrives. This dramatically improves throughput (§18.2) — far more total requests can be served per unit of GPU time — at a direct cost to latency for any individual request, which may need to wait briefly for enough other requests to accumulate into a batch, or wait for its position within a batch's processing to complete. This is the throughput/latency tradeoff from §18.2 appearing again, now with an unusually explicit, tunable dial: the batching window size and strategy directly and predictably trade one for the other.

### 22.4 Why Generating a Response Is Incremental, Not Instant

Unlike an ordinary API response that is computed once and returned whole, a language model typically generates its response one small piece at a time, each new piece depending on everything generated so far. This incremental nature is why interacting with these systems often involves streaming partial results back to a caller as they're produced, rather than waiting for the entire response to be ready — a direct, practical instance of the synchronous/asynchronous and latency-tolerance reasoning from §4.4 and §18.2, applied to a workload where waiting for a truly complete response could take far too long to be tolerable for an interactive use case.

### 22.5 Retrieval-Augmented Generation: Grounding Generation in Real Data

A language model's knowledge is fixed at the time it was trained and has no inherent access to your organization's specific, current data. **Retrieval-Augmented Generation (RAG)** addresses this by using the search and similarity techniques from §21 to find relevant, current information from your own data before asking the model to generate a response, supplying that retrieved information directly alongside the request so the model's output can be grounded in it. The mental model to hold: RAG is not a property of the model itself — it is an architectural pattern combining a retrieval step (§21) with a generation step, and its quality depends as much on the quality of the retrieval step as on the model doing the generating.

### 22.6 Agents and Tool Use: When the Model's Output Triggers Further Action

A further architectural pattern layers on top of straightforward generation: instead of the model only producing text for a human to read, its output can be structured to request that a specific external action be taken (calling an API, running a calculation, querying a database) — with the result of that action fed back to the model to inform its next step. This turns a single request/response interaction into a **loop**, where the model's output and external system calls alternate, potentially several times, before a final answer is produced. This pattern inherits every one of the ordinary API and distributed-systems concerns already covered in this book (§3.2, §4, §9) — a tool call is a real network call that can fail, take unpredictable time, or need to be treated carefully around retries and idempotency — now happening *inside* what looks, from the outside, like a single logical request.

### 22.7 Why Evaluation Is Its Own Discipline Here

Ordinary software has a comparatively clean notion of correctness — a function's output for a given input is either right or wrong, and automated tests can check this directly. A language model's output is frequently not reducible to a single, deterministic right answer, which means verifying that a system built around one is behaving well requires its own dedicated discipline (**evaluation**, developed in §55) — systematic, often partially subjective or model-assisted grading of outputs against desired qualities, tracked over time as the underlying model, prompts, or retrieved data change. Skipping this discipline is a common and consequential mistake: without it, regressions in quality can go unnoticed for a long time, because there is no simple pass/fail test to catch them the way conventional software testing would.

### 22.8 Engineering Intuition

> **How do I know a workload belongs in this chapter's territory rather than ordinary backend infrastructure?** The moment the actual computation is dominated by a model's inference cost rather than I/O (§1.4), and the moment its resource needs (specialized processors, large memory footprints, high per-request cost) diverge sharply from an ordinary application server's.
>
> **What symptoms indicate AI infrastructure is being under-planned?** Inference cost dominating the infrastructure budget with no batching or capacity strategy behind it; latency that is unpredictable and untracked at the percentile level; no systematic way to detect a quality regression after a model or prompt change.
>
> **What metrics indicate it?** GPU utilization, tokens processed per second, cost per request, and time-to-first-token (the AI-serving analogue of latency) alongside total generation time.
>
> **What breaks first if this isn't planned for?** Cost, almost immediately — inference workloads are expensive enough per request that an unplanned, unbatched, unmonitored deployment can produce a bill wildly disproportionate to the traffic served, developed fully in §77.
>
> **When should you *not* build custom AI-serving infrastructure?** When a managed, hosted model API adequately serves your latency, cost, and data-handling requirements — running your own GPU infrastructure is a significant operational undertaking that only pays off at meaningful, sustained scale (§77).
>
> **What would a hyperscale company do?** Operate large, custom GPU fleets with sophisticated batching, scheduling, and caching strategies (§77), and run continuous, systematic evaluation pipelines to catch quality regressions the moment they appear.
>
> **What would a two-person startup do?** Call a managed, hosted model API directly, with no custom serving infrastructure at all, and adopt only lightweight evaluation practices proportionate to how central the AI feature is to their product.
>
> **What changes with scale?** At low request volume, a hosted API is both cheaper and simpler than any self-managed alternative. Only at high, sustained request volume does the economics potentially favor custom infrastructure and dedicated GPU capacity — a transition explored concretely in §77, alongside multi-cluster GPU fleets and hyperscale inference cost management.

### 22.9 Exercises

1. For an AI-powered feature you know or can imagine, argue whether its latency requirement favors a streamed, incremental response (§22.4) or a complete, batch-computed one, and why.
2. Explain, using §22.5, why supplying a language model with retrieved, relevant data is a different (and complementary) solution to a different problem than simply using a larger or more capable model.

### 22.10 Further Reading

- Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention" (2023) — the paper behind the vLLM serving system, a widely-used, concrete illustration of the batching and memory-management concerns in §22.2–22.3, developed in §55.
- Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020) — the original RAG paper underlying §22.5.

---
