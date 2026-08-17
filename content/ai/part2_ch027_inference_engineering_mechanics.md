## 27. Inference Engineering Mechanics: Model Serving, vLLM, Ollama, TGI, SGLang, Continuous Batching, Model Routing, Quantization (GGUF/GPTQ/AWQ), Streaming, Latency/Cost Optimization, Autoscaling

### 27.1 The Problem: Serving an LLM Efficiently Is a Distinct Engineering Discipline from Training One

§10 introduced inference engineering conceptually. This chapter develops the specific mechanisms — batching, quantization, routing — that separate a naive "just call the model in a loop" implementation from a production-grade serving system capable of handling real concurrent load within acceptable latency and cost, directly underlying every symptom diagnosed in §37 (GPU/throughput engineering).

### 27.2 Why Naive Serving Fails: One Request at a Time Wastes a GPU's Parallel Capacity

A GPU's core advantage (§11.2) is massive parallel computation — but a naive serving loop that processes one request fully to completion before starting the next uses only a small fraction of that parallel capacity per request, since a single request's matrix operations don't come close to saturating a modern GPU's throughput. This single fact motivates nearly every serving-framework optimization in this chapter: the goal is keeping the GPU processing multiple requests' work simultaneously, not processing one request as fast as possible in isolation.

### 27.3 Continuous Batching: The Core Throughput Optimization

**Static batching** groups a fixed set of requests together and processes them as one batch, but must wait for the *longest* request in the batch to finish before starting a new batch — wasteful, since generated response lengths vary enormously (§15.6) and shorter requests sit idle waiting for longer ones. **Continuous batching** (also called in-flight or dynamic batching) instead adds new requests into an already-running batch as soon as GPU capacity frees up (as other requests in the batch finish generating), rather than waiting for the entire batch to complete — dramatically improving GPU utilization and overall throughput compared to static batching, and now the standard, expected batching strategy in every serving framework covered in this chapter.

### 27.4 Serving Frameworks: vLLM, TGI, SGLang, and Ollama

**vLLM** is built around **PagedAttention**, a KV cache (§18.4) memory-management technique borrowing the operating-system concept of paged virtual memory (companion §11.3) — allocating KV cache memory in fixed-size blocks rather than one large contiguous allocation per request, dramatically reducing memory fragmentation and waste, which directly translates into serving more concurrent requests on the same GPU memory budget. **TGI (Text Generation Inference)**, from Hugging Face, is a production-oriented serving framework with strong out-of-the-box integration with the Hugging Face model ecosystem and broad quantization support. **SGLang** focuses specifically on efficient serving for complex generation patterns — structured output, multi-turn conversations with heavy prompt-prefix reuse — with an optimized runtime and its own efficient caching strategy, particularly strong for workloads with substantial prompt-caching opportunity (§24.6). **Ollama** targets local and single-machine deployment specifically — simple setup, strong quantized-model support (§27.6) out of the box, and is the common choice for local development, prototyping, or small-scale self-hosted deployment rather than large-scale production serving, where vLLM/TGI/SGLang's throughput-oriented architecture is the better fit.

### 27.5 Model Routing: Sending Each Request to the Right Model, Automatically

§1.5 introduced the capability/cost/latency triangle; **model routing** operationalizes it at the infrastructure level — a routing layer classifies incoming requests (by complexity, task type, or an explicit user-specified tier) and automatically directs each to an appropriately-sized model, rather than sending every request to the single largest, most expensive, most capable model available regardless of whether the request actually needs it. This is directly analogous to Adaptive RAG's query-complexity routing (§23.5) applied at the model-selection level instead of the retrieval-strategy level, and is frequently one of the single highest-leverage cost optimizations available (§33), since a large fraction of real production traffic is often simpler than the hardest queries a system must handle.

### 27.6 Quantization: GGUF, GPTQ, and AWQ

§10.6 introduced quantization conceptually as reducing numeric precision to save memory; the specific formats differ in *how* that reduction is performed and *for what deployment target*. **GGUF** is a file format (and associated quantization approach) specifically optimized for efficient CPU and consumer-hardware inference (the format used by `llama.cpp` and, correspondingly, Ollama, §27.4) — prioritizing broad hardware compatibility and reasonable quality at various precision levels, well suited to local and edge deployment. **GPTQ** is a post-training quantization method that calibrates quantization per-layer using a small calibration dataset, specifically minimizing the accuracy loss introduced by reducing precision — a more accuracy-preserving approach than naive uniform quantization, commonly used for GPU-based serving of quantized models. **AWQ (Activation-aware Weight Quantization)** improves on this further by identifying and preserving full precision specifically for the small subset of weights most important to model outputs (identified by observing which weights produce the largest activations), quantizing the remaining, less-critical weights more aggressively — generally achieving better accuracy retention than GPTQ at comparable compression levels, at the cost of a more involved calibration process. The practical engineering choice among these is driven by deployment target (GGUF for CPU/edge/Ollama, GPTQ/AWQ for GPU-served quantized models) more than by a single "best" format — different tools in this chapter's catalog support different subsets of these formats.

### 27.7 Streaming Mechanics in a Serving Context

§19.6 covered streaming's product-facing mechanics; at the serving-infrastructure level, streaming requires the serving framework to deliver each generated token to the client incrementally over a persistent connection (typically Server-Sent Events or a WebSocket, companion §41's real-time communication patterns) as continuous batching (§27.3) produces it — meaning the serving framework's internal token-generation loop and the client-facing delivery mechanism must be architected together, not bolted on separately, which is precisely why streaming support is a first-class, load-bearing feature of every serving framework in §27.4 rather than an optional add-on.

### 27.8 Autoscaling for GPU-Backed Inference: Why It Differs from Ordinary Autoscaling

Ordinary autoscaling (companion §45.3) can add a new instance in seconds; a GPU-backed inference instance must additionally load model weights onto the GPU (potentially tens of gigabytes, §11.3) before it can serve a single request — a **cold-start** cost that can take anywhere from many seconds to a few minutes depending on model size and loading path, directly meaning naive reactive autoscaling (scale up only after load is already high) leaves real users experiencing severe latency during the scale-up window itself. Production GPU autoscaling strategies mitigate this through predictive/scheduled scaling (anticipating known traffic patterns), keeping a minimum "warm" pool of already-loaded instances even at low traffic (accepting some idle-GPU cost, §11.3's cost-leak concern, as the price of avoiding cold-start latency), or model-caching strategies that keep frequently-used model weights readily available even when not actively serving.

### 27.9 Engineering Intuition

> **Why is my self-hosted model's throughput far below what the GPU's raw specs suggest it should support?** Check whether the serving framework uses continuous batching (§27.3) — a naive one-request-at-a-time or static-batching setup leaves substantial GPU parallel capacity unused, regardless of the GPU's raw performance ceiling.

> **Should I quantize my model, and to which format?** If the model doesn't fit your target GPU's memory (§11.3) or you're deploying to CPU/edge hardware, quantize — start with a moderate precision level (e.g., 8-bit or a well-regarded 4-bit AWQ/GPTQ configuration) and validate quality via evaluation (§29) before going more aggressive, since quantization is a genuine, if often small, quality tradeoff, not a free win like Flash Attention (§18.5).

> **What would over-engineering look like here?** Building a custom serving framework from scratch before confirming that vLLM, TGI, or SGLang (§27.4) — mature, actively developed, already implementing PagedAttention/continuous batching — don't already meet the specific throughput and latency requirements at hand.

### 27.10 Decision Tree: What Inference Engineering Investment Do I Need?

```
Are you serving models locally/at small scale, or prototyping?
  YES -> Ollama (§27.4) with a GGUF-quantized model (§27.6) is
         the simplest sufficient choice.
  NO (production scale) -> Does your model fit your target GPU's
         memory comfortably?
    NO  -> Quantize first (GPTQ/AWQ, §27.6) before adding serving
           infrastructure complexity.
    YES -> Use vLLM, TGI, or SGLang (§27.4) -- confirm continuous
           batching (§27.3) and streaming (§27.7) are both active;
           these are baseline expectations, not advanced settings.
Does traffic vary significantly across time, or include unrelated
task types of very different complexity?
  YES -> Add model routing (§27.5) -- send simpler requests to a
         smaller/cheaper model rather than routing everything to
         your largest.
Do you see high tail latency specifically during traffic spikes?
  YES -> This is very likely GPU cold-start (§27.8) -- consider a
         warm minimum pool or predictive scaling rather than
         purely reactive autoscaling.
```

### 27.11 Python Snippet: Simulating Static vs. Continuous Batching Throughput

```python
# Demonstrates §27.3's core insight: static batching wastes GPU
# time waiting for the LONGEST request in each batch; continuous
# batching fills freed capacity immediately.

def static_batch_total_time(request_lengths, batch_size):
    total_time = 0
    for i in range(0, len(request_lengths), batch_size):
        batch = request_lengths[i:i + batch_size]
        total_time += max(batch)   # must wait for the SLOWEST
                                    # request in each fixed batch
    return total_time

def continuous_batch_total_time(request_lengths):
    # Simplified model: with continuous batching, total GPU time
    # is dominated by the SUM of useful work, not padded waiting
    # -- new requests fill capacity as soon as any slot frees up.
    return sum(request_lengths)

lengths = [10, 50, 12, 8, 45, 15, 9, 40]   # generated-token counts,
                                            # highly variable (§15.6)
print(f"Static batching (batch=4): "
      f"{static_batch_total_time(lengths, 4)} units")
print(f"Continuous batching:       "
      f"{continuous_batch_total_time(lengths)} units")
# Static batching's total reflects repeated waiting for the
# longest request per batch; continuous batching's total reflects
# only genuinely necessary work -- the gap IS the throughput win.
```

### 27.12 Further Reading

- Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention" (2023) — the primary source for §27.4's vLLM.
- Frantar et al., "GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers" (2022) — the primary source for §27.6.
- Lin et al., "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration" (2023) — the primary source for §27.6's AWQ.

---
