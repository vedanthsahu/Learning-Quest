## 37. Production GPU & Throughput Engineering: "Why Is GPU Utilization Low?" / "Why Is Streaming Slower Than Expected?"

### 37.1 The Problem: Low GPU Utilization and Poor Throughput Have Distinctly Different Root Causes Than Ordinary Compute Underutilization

An idle CPU is usually a simple sign of low load. A GPU serving LLM inference can show low utilization for structurally different reasons — memory constraints, batching inefficiency, or scheduling problems — meaning "GPU utilization is low" requires the AI-specific diagnostic vocabulary from §18 and §27, not the general compute-scaling intuition from ordinary service capacity planning (companion §45).

### 37.2 Symptoms

GPU compute utilization is low while requests are still queuing or experiencing latency (a symptom combination that would be contradictory for ordinary CPU-bound services, but is common and diagnostic here); throughput doesn't scale as expected when adding more GPU replicas; streaming responses feel slower or "chunkier" than the underlying token generation rate should produce; fleet-wide GPU utilization is low despite individual services reporting healthy per-instance metrics.

### 37.3 Possible Causes

KV cache memory pressure (§18.4) limiting concurrent request capacity well before compute capacity is saturated — the single most common cause of "low compute utilization with real queuing"; the serving framework isn't using continuous batching (§27.3), leaving substantial parallel capacity unused per request; poor bin-packing across the fleet (§28.3) leaving many GPUs partially, rather than fully, utilized; streaming implementation buffering tokens client-side or server-side before delivery, defeating the purpose of incremental delivery (§27.7); GPU generation/interconnect mismatch for a model-parallel deployment (§28.4) causing communication overhead between GPUs to dominate actual compute time.

### 37.4 Metrics

GPU compute utilization AND memory/KV-cache occupancy tracked as separate, simultaneous metrics (§31.5) — never compute utilization alone; request queue depth and wait time at the serving layer; batching efficiency (average batch size actually achieved vs. theoretical maximum); per-token streaming delivery latency (time between consecutive tokens reaching the client, distinct from total generation time); fleet-wide bin-packing efficiency (§28.11's heuristic, measured against actual production placement).

### 37.5 Investigation

First check KV-cache occupancy (§31.5) alongside compute utilization — a GPU showing low compute utilization but high KV-cache occupancy is memory-constrained, not compute-idle, and adding more compute (a faster GPU) will not resolve it; confirm the serving framework's batching configuration is actually using continuous batching (§27.3) rather than assuming it because the framework supports it (a common gap between "framework capability" and "actual configuration"); for streaming issues, trace individual token delivery timestamps end-to-end to determine whether delay is occurring at generation, serving-framework delivery, or client-side rendering.

### 37.6 Root Cause

Frequently one of: KV cache sized for an average request profile that doesn't match actual production concurrency and context-length distribution (§18.4, §32.6's connection to context growth); continuous batching present in the framework but disabled or misconfigured in the actual deployment; a streaming implementation that buffers a fixed number of tokens before flushing to the client (often a default in some HTTP/proxy layers, unrelated to the model's actual per-token generation speed) — meaning the perceived "slow streaming" is a delivery-layer issue, not a generation-speed issue at all.

### 37.7 Mitigation

Right-size KV cache capacity (or reduce average context length, §24.5, §24.7) to match actual production concurrency; verify and correct continuous batching configuration (§27.3) rather than assuming default settings are optimal; audit proxy/gateway layers for buffering behavior that defeats streaming (disable response buffering explicitly where found); improve fleet-wide bin-packing (§28.3, §28.11) through better scheduling rather than provisioning additional GPU capacity prematurely.

### 37.8 Tradeoffs

Increasing KV cache capacity (via more GPU memory or fewer concurrent long-context requests) trades directly against cost (§33) or against context-length flexibility (§24.7); more aggressive batching configurations can increase per-request latency variance even while improving aggregate throughput, a real tradeoff between individual-request predictability and fleet-wide efficiency; consolidating bin-packing more tightly reduces idle-GPU cost but reduces headroom for sudden traffic spikes, a direct tradeoff against the cold-start risk from §27.8.

### 37.9 Prevention

Continuous, simultaneous monitoring of compute utilization AND memory/KV-cache occupancy (§31.5) as paired metrics on every GPU dashboard, never presented separately; load-test with realistic concurrency and context-length distributions (§18.8) before trusting single-request throughput/latency measurements; explicitly test and verify streaming delivery end-to-end (not just "the framework supports streaming") as part of deployment validation.

### 37.10 Engineering Intuition

> **Why does adding more GPU replicas not proportionally increase throughput?** Check whether the bottleneck is actually KV-cache memory (§18.4) rather than compute — if so, more replicas each individually hit the same memory-driven concurrency ceiling, and the fix is memory/context management (§24.5), not raw horizontal scaling.

> **Why does streaming feel "chunky" even though the model's token generation rate is fast?** Almost always a buffering layer between the model and the client (a proxy, gateway, or client-side rendering batching) rather than an actual generation-speed problem (§37.6) — trace end-to-end token delivery timestamps before assuming the model itself is slow.

> **What would over-engineering look like here?** Provisioning additional GPU capacity (§37.7) to fix a low-utilization symptom that fleet-wide bin-packing analysis (§28.11) would reveal is actually a placement/scheduling inefficiency, solvable without any new hardware spend.

### 37.11 Decision Tree: Diagnosing Low GPU Utilization or Poor Throughput

```
Is compute utilization low WHILE requests are still queuing?
  YES -> Check KV-cache/memory occupancy (§31.5) -- this
         combination almost always means memory-constrained
         concurrency, not idle compute capacity.
Is continuous batching actually ENABLED and correctly configured
(not just supported by the framework)?
  NO  -> Fix this first (§27.3) -- often the single highest-
         leverage throughput fix available.
Is fleet-wide utilization low despite healthy per-service metrics?
  YES -> Audit bin-packing efficiency (§28.3) across the whole
         fleet before adding capacity.
Does streaming feel slow/chunky despite fast underlying
generation?
  YES -> Trace end-to-end token delivery timestamps -- look for a
         buffering proxy/gateway layer (§37.6), not the model
         itself.
```

### 37.12 Python Snippet: Distinguishing Compute-Bound from Memory-Bound GPU State

```python
# Demonstrates §37.5's core diagnostic: compute utilization ALONE
# is insufficient -- pairing it with KV-cache occupancy reveals
# the actual constraint.

def diagnose_gpu_state(compute_util_pct, kv_cache_occupancy_pct,
                        queue_depth):
    if queue_depth > 0 and compute_util_pct < 70:
        if kv_cache_occupancy_pct > 85:
            return ("MEMORY-CONSTRAINED: KV cache near capacity is "
                    "limiting concurrency -- adding compute won't "
                    "help; reduce context length or add memory (§18.4).")
        else:
            return ("BATCHING INEFFICIENCY: neither compute nor "
                    "memory is saturated but requests queue anyway -- "
                    "check continuous batching configuration (§27.3).")
    elif compute_util_pct > 85:
        return "COMPUTE-BOUND: this is genuine, healthy high load."
    else:
        return "Healthy -- no queuing, no resource saturation."

print(diagnose_gpu_state(compute_util_pct=55, kv_cache_occupancy_pct=92,
                           queue_depth=12))
```

### 37.13 Further Reading

- §18.4 (KV Cache), §27.3 (Continuous Batching), §28.3 (Fleet-Scale Bin-Packing) — the core mechanisms this chapter's diagnostics depend on.
- The companion handbook's §45 (Capacity Planning) — the general resource-saturation diagnostic discipline this chapter specializes for GPU-backed inference.

---
