## 11. Mental Model: AI Infrastructure

### 11.1 The Problem: Understanding Just Enough Hardware to Make Engineering Decisions

This handbook's philosophy (§0.1) explicitly excludes deep hardware engineering — you do not need to design a GPU to build a great AI product. But a small, specific amount of hardware understanding directly explains engineering decisions you will make repeatedly: why a certain model doesn't fit on a certain GPU, why more GPUs doesn't always mean proportionally more throughput, and why GPU cost dominates so much of this handbook's later cost-engineering content (§33, §77 in the companion handbook).

### 11.2 GPUs, CUDA, and Tensor Cores: Why This Specific Hardware, at All

A CPU is optimized for a wide variety of sequential and branching logic; a **GPU** is optimized for doing an enormous number of simple, identical numerical operations (matrix multiplication, overwhelmingly) in parallel — and a transformer's core computation (§2) is, at its foundation, almost entirely matrix multiplication, making GPUs dramatically faster for this specific workload than CPUs, despite CPUs being more flexible in general. **CUDA** is NVIDIA's programming platform that lets software (including every major deep learning framework) actually issue instructions to a GPU's parallel compute units. **Tensor Cores** are specialized circuits within modern NVIDIA GPUs specifically optimized for the exact matrix-multiplication-and-accumulate operations that dominate transformer inference and training, providing a further, dedicated speedup beyond a GPU's general-purpose parallel compute — the reason GPU generations are often marketed partly on their Tensor Core specifications specifically for AI workloads.

### 11.3 GPU Memory: The Practical Ceiling That Actually Constrains You Day to Day

A GPU's memory (VRAM) must hold the entire model's weights, plus the KV cache for every concurrent request being served (already introduced generically in the companion handbook's §55.3), plus working memory for the computation itself. This is, in practice, the single most common hard constraint an AI engineer runs into directly: a model that's "too large" for a given GPU isn't too slow, it simply doesn't fit in memory at all, and this is precisely why quantization (§10.6) — directly reducing the memory footprint of the model's weights — is often the first, most direct lever for making a larger, more capable model deployable on a given hardware budget at all, before speed is even a consideration.

### 11.4 Parallelism: Splitting Work (and Models) Across Multiple GPUs

When a model is too large to fit on a single GPU's memory even after quantization, or when throughput needs exceed what one GPU can provide, work is split across multiple GPUs via **parallelism** — **data parallelism** (each GPU holds a full copy of the model and processes different requests independently, simplest, but doesn't help when the model itself doesn't fit on one GPU) and **model/tensor parallelism** (the model itself is split across multiple GPUs, each holding only a portion of its weights, cooperating to process each request together) being the two dominant strategies, directly analogous to the companion handbook's horizontal-scaling-versus-sharding distinction (companion §18.4 vs. §35) — data parallelism scales throughput the way stateless horizontal scaling does; model parallelism is required when a single unit (here, the model, there, the dataset) genuinely exceeds what one node can hold.

### 11.5 Kubernetes for AI, Ray, and DeepSpeed: Orchestration for GPU Workloads Specifically

The companion handbook's Kubernetes chapters (companion §14, §45, §69) apply to AI workloads with real, GPU-specific adaptations — scheduling must account for specific GPU types and memory capacity (directly the companion handbook's §77.2 heterogeneous-fleet-scheduling concern), not just generic CPU/memory requests. **Ray** is a distributed computing framework widely used specifically for AI/ML workloads — distributing both training and inference workloads across a cluster with primitives well-suited to the data/model-parallelism patterns from §11.4, often preferred over raw Kubernetes primitives for this specific workload shape because it provides higher-level, ML-workload-aware abstractions. **DeepSpeed** is a specialized library (from Microsoft) specifically for efficiently training and serving very large models across many GPUs, implementing advanced memory-optimization and parallelism techniques that would otherwise require substantial custom engineering to replicate.

### 11.6 Engineering Intuition

> **How do I know if a model-deployment problem is a memory problem or a speed problem?** An "out of memory" error at load time or under concurrent load is unambiguously a memory problem (§11.3) — quantization (§10.6) or model parallelism (§11.4) are the direct fixes, not "a bigger/faster GPU" alone, unless that bigger GPU also has more memory.
>
> **What symptoms indicate you need model parallelism, not just more replicas (data parallelism)?** The model genuinely does not fit in a single GPU's memory even after quantization — at that point, adding more identical, independent GPU replicas (data parallelism) doesn't help at all, since each replica individually still can't hold the model.
>
> **What would over-engineering look like here?** Reaching for Ray or DeepSpeed (§11.5) to serve a single, modest-sized model that fits comfortably on one GPU and is well within one standard serving framework's (§10.3) throughput capacity.

### 11.7 Decision Tree: What Kind of AI Infrastructure Do I Actually Need?

```
Does your model fit comfortably in a single GPU's memory,
including KV cache for your expected concurrency?
  YES -> Do you need more throughput than one GPU/replica
         provides?
    NO  -> A single GPU instance behind a serving framework
           (§10.3) is sufficient.
    YES -> Data parallelism -- add more identical replicas
           behind a load balancer (companion handbook §28).
  NO (model doesn't fit) -> Try quantization (§10.6) first --
         cheaper than adding hardware complexity.
    Still doesn't fit -> Model/tensor parallelism (§11.4) across
           multiple GPUs, likely via Ray or DeepSpeed (§11.5)
           rather than custom-built splitting logic.
```

### 11.8 Python Snippet: Checking GPU Memory Before Loading a Model

```python
# Demonstrates §11.3's practical, everyday concern: knowing
# whether a model will even FIT before attempting to load it.

import torch

def check_gpu_capacity(model_size_gb, safety_margin=1.2):
    if not torch.cuda.is_available():
        print("No GPU available.")
        return False

    total_memory_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
    required_gb = model_size_gb * safety_margin  # KV cache + overhead

    print(f"GPU memory available: {total_memory_gb:.1f} GB")
    print(f"Estimated requirement (model + overhead): {required_gb:.1f} GB")

    if required_gb > total_memory_gb:
        print("WILL NOT FIT -- consider quantization (§10.6) "
              "or model parallelism (§11.4).")
        return False
    print("Fits with margin for KV cache and working memory.")
    return True

check_gpu_capacity(model_size_gb=14)  # e.g. a 7B-parameter model
                                       # at 16-bit precision
```

### 11.9 Further Reading

- NVIDIA, "CUDA C++ Programming Guide" (introductory sections only, for conceptual grounding) — read selectively, not exhaustively, per this chapter's stated scope.
- The Ray and DeepSpeed project documentation — practical, current references for §11.5.

---
