## 28. AI Infrastructure Mechanics: GPU Basics, CUDA Concepts, Tensor Cores, GPU Memory, Parallelism, Kubernetes for AI, Ray, DeepSpeed, Serving Clusters

### 28.1 The Problem: Operating a Fleet of GPUs, Not Just Understanding One

§11 established the mental model for a single GPU's role. This chapter develops the infrastructure mechanics of operating GPUs at fleet scale — the orchestration, parallelism, and cluster-management concerns that determine whether an organization's GPU capacity is used efficiently or left substantially idle (§14.3's cost-leak concern, now at fleet scale rather than single-instance scale).

### 28.2 GPU, CUDA, and Tensor Core Fleet Considerations

At fleet scale, §11.2's single-GPU concepts compound into scheduling and heterogeneity concerns: different GPU generations have different CUDA capability levels, memory capacities, and Tensor Core generations, meaning a workload validated on one GPU type may not run identically (or as efficiently) on another — directly the companion handbook's heterogeneous-fleet-scheduling concern (companion §77.2), now specific to AI accelerators rather than general compute. Fleet operators must track which specific GPU generation each workload requires or prefers, rather than treating "a GPU" as an interchangeable, undifferentiated resource the way a stateless CPU-based service often can.

### 28.3 GPU Memory at Fleet Scale: Bin-Packing Models onto Available Capacity

§11.3 established GPU memory as a hard per-instance ceiling; at fleet scale this becomes a **bin-packing problem** — efficiently placing multiple models (or multiple replicas of the same model) across available GPU memory capacity across a cluster of machines, directly analogous to the companion handbook's resource-bin-packing scheduling concern (companion §14.3) but with AI-specific granularity (whole-model memory footprints, KV cache headroom per expected concurrency, §18.4) rather than generic CPU/memory requests — poor bin-packing here directly produces the idle-GPU cost-leak §11.3 and §14.3 warned about generically.

### 28.4 Data Parallelism vs. Model/Tensor Parallelism: Infrastructure Implementation

§11.4 introduced the conceptual distinction; the infrastructure implementation differs meaningfully. **Data parallelism** requires only that each GPU replica can independently receive requests and respond — straightforward to implement with standard load balancing (companion §28) across independent serving instances, since each replica needs no coordination with any other. **Model/tensor parallelism** requires the GPUs holding different portions of a single model to communicate with each other *during* every single forward pass (partial results from one GPU's portion of the computation must be combined with another's before the computation can proceed) — meaning these GPUs must be connected via very high-bandwidth, low-latency interconnects (like NVLink) rather than ordinary networking, a hardware-topology requirement that data parallelism does not share and that directly constrains which physical machines can participate in a model-parallel deployment.

### 28.5 Kubernetes for AI Workloads: Real, Specific Adaptations

The companion handbook's Kubernetes chapters (companion §14, §45, §69) apply with concrete, AI-specific adaptations: GPU resources must be requested and scheduled explicitly (via device plugins that expose GPUs as a schedulable resource type, analogous to but distinct from CPU/memory requests), scheduling must account for specific GPU generation/type requirements (§28.2) rather than treating compute as fungible, and node affinity/anti-affinity rules often matter more than in typical stateless workloads specifically to satisfy model-parallel interconnect requirements (§28.4). Pod startup for a GPU workload must also account for model-loading cold-start time (§27.8) in readiness-probe configuration — a naive Kubernetes readiness check tuned for ordinary application startup times will misjudge a GPU pod's actual readiness.

### 28.6 Ray: Higher-Level Abstractions for Distributed AI Workloads

**Ray** provides distributed-computing primitives specifically designed around AI/ML workload shapes — distributing both training and inference (including serving, via Ray Serve) across a cluster with abstractions (actors, tasks, and resource-aware scheduling) that map more directly onto data/model-parallelism patterns (§28.4) than raw Kubernetes primitives do natively. Teams commonly choose Ray specifically to avoid re-implementing distributed-training/serving coordination logic that Ray already provides, running Ray itself either on top of Kubernetes (using Kubernetes for underlying infrastructure orchestration) or on bare-metal/VM clusters directly — the two are frequently complementary rather than competing choices.

### 28.7 DeepSpeed: Memory and Parallelism Optimization for Very Large Models

**DeepSpeed** (from Microsoft) implements advanced memory-optimization techniques — most notably **ZeRO (Zero Redundancy Optimizer)**, which partitions optimizer state, gradients, and even model parameters themselves across multiple GPUs during training rather than redundantly replicating them on every GPU — directly reducing the per-GPU memory required to train or fine-tune (§26) very large models, often enabling training configurations that would otherwise require substantially more GPU memory per device. This is primarily a training/fine-tuning-time tool rather than an inference-serving one (contrast with vLLM/TGI/SGLang, §27.4, which target serving specifically), and is most relevant to teams doing their own large-scale training or full fine-tuning rather than PEFT-based adaptation (§26.3), where memory requirements are already dramatically lower.

### 28.8 Serving Clusters: Putting the Pieces Together

A production AI serving cluster combines every mechanism above: a scheduler (Kubernetes, possibly with Ray) that bin-packs models across available GPU memory (§28.3) respecting generation/interconnect constraints (§28.2, §28.4), serving frameworks (§27.4) running continuous batching within each node, autoscaling (§27.8) that accounts for cold-start cost, and observability (§31) tracking GPU utilization and per-model resource consumption continuously — the full infrastructure stack existing specifically to keep expensive, supply-constrained GPU capacity (companion §77.2) as continuously and efficiently utilized as possible, which is the single cost objective nearly every mechanism in this chapter ultimately serves.

### 28.9 Engineering Intuition

> **How do I know if I need Ray/DeepSpeed, or if standard Kubernetes + a serving framework is sufficient?** If you're serving pre-trained or PEFT-fine-tuned models (§26.3) without doing large-scale distributed training yourself, standard Kubernetes plus vLLM/TGI/SGLang (§27.4) is typically sufficient — reach for Ray specifically when orchestrating complex distributed training/serving pipelines, and DeepSpeed specifically when full-parameter training/fine-tuning of very large models requires memory optimization beyond what PEFT already provides.

> **Why is my GPU fleet's overall utilization low even though individual services report healthy utilization?** Check bin-packing efficiency (§28.3) across the whole fleet, not per-service — fragmented allocation (many partially-used GPUs rather than fully-packed ones) is a common, fleet-level cost leak invisible from any single service's own metrics.

> **What would over-engineering look like here?** Adopting Ray or DeepSpeed for a straightforward single-model serving deployment that standard Kubernetes and a serving framework already handle completely — both tools solve real problems at real scale, but that scale/complexity threshold should be confirmed, not assumed.

### 28.10 Decision Tree: What AI Infrastructure Orchestration Do I Need?

```
Are you serving (not training) pre-trained/PEFT-adapted models?
  YES -> Kubernetes + a serving framework (§27.4) is very likely
         sufficient -- verify GPU device-plugin scheduling and
         cold-start-aware readiness probes (§28.5) are configured.
Are you doing large-scale distributed TRAINING or full fine-
tuning of large models?
  YES -> DeepSpeed (§28.7) for memory optimization; Ray (§28.6)
         if you also need higher-level distributed orchestration
         beyond what Kubernetes primitives provide directly.
Is your GPU fleet's aggregate utilization surprisingly low despite
individual services looking healthy?
  -> Audit bin-packing efficiency (§28.3) across the WHOLE fleet,
     not per-service, before assuming you need more GPU capacity.
Does your model require model/tensor parallelism (doesn't fit one
GPU even after quantization, §18.6)?
  -> Confirm your cluster's physical interconnect (NVLink or
     equivalent, §28.4) actually supports the required inter-GPU
     communication bandwidth before deploying.
```

### 28.11 Python Snippet: A Simple Bin-Packing Heuristic for Model Placement

```python
# Demonstrates §28.3's fleet-scale bin-packing problem in
# simplified form: placing models onto GPUs to minimize the
# number of GPUs used (directly minimizing idle-capacity waste).

def bin_pack_models(model_memory_requirements_gb, gpu_capacity_gb=80):
    # First-fit-decreasing: place larger models first, into the
    # first GPU with enough remaining capacity -- a simple,
    # reasonably effective bin-packing heuristic.
    models_sorted = sorted(model_memory_requirements_gb, reverse=True)
    gpus = []  # each entry: remaining capacity on that GPU

    for model_size in models_sorted:
        placed = False
        for i, remaining in enumerate(gpus):
            if remaining >= model_size:
                gpus[i] -= model_size
                placed = True
                break
        if not placed:
            gpus.append(gpu_capacity_gb - model_size)  # new GPU

    return len(gpus), gpus

models = [14, 24, 8, 40, 6, 30, 12]  # GB, e.g. various quantized
                                      # model sizes (§27.6)
num_gpus, remaining_capacity = bin_pack_models(models)
print(f"GPUs needed: {num_gpus}")
print(f"Remaining capacity per GPU: {[round(r,1) for r in remaining_capacity]}")
# Poor placement ordering can require MORE GPUs for the same
# models -- exactly the fleet-level waste §28.3 and §28.9 describe.
```

### 28.12 Further Reading

- Rajbhandari et al., "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models" (2020) — the primary source for §28.7's DeepSpeed ZeRO.
- Ray and Kubernetes GPU device-plugin documentation — the current, practical reference for §28.5-28.6's orchestration mechanics.

---
