## 38. SageMaker

> **Decision Snapshot** — Tier 3 · Reference Level · Verdict: know it exists as AWS's managed end-to-end ML platform — building, training, and deploying custom models — for when the pre-built AI services (companion §37) genuinely don't fit and a custom model is justified.

### What It Does
SageMaker covers the full custom-ML lifecycle: managed notebook environments for development, managed training jobs (including distributed training across many instances, and Spot-based cost savings for interruption-tolerant training runs), a model registry, and managed real-time or batch inference endpoints — removing the infrastructure-management burden from each stage without removing your control over the actual model.

### When to Reach for It
Your problem genuinely needs a custom-trained model — the pre-built services (companion §37) don't fit, and you have (or are gathering) the training data and ML expertise to justify building one, deploying it at a scale where managed training/inference infrastructure is worth adopting over ad hoc scripts.

### When to Avoid It
A problem a pre-built AI service already solves well (revisit companion §37 first) or a foundation-model/LLM-based approach fits better (companion AI Systems Engineering Handbook's entire treatment of that space) — SageMaker's classical-ML-lifecycle tooling isn't the natural fit for every AI problem in 2026's landscape.

### One Architecture Diagram
```
S3 (training data) → SageMaker Training Job (managed, distributed, optionally Spot)
                              ↓
                     Model Registry
                              ↓
              SageMaker Endpoint (real-time inference) / Batch Transform (batch inference)
```

### Interview Questions
1. When would you choose SageMaker over one of the pre-built AI services in companion §37?
2. What's the difference between a real-time SageMaker endpoint and Batch Transform?
3. How does SageMaker's Spot-based training reduce cost, and what workload characteristic makes it a good fit?

### Cloud-Agnostic Mapping
SageMaker (AWS) ≈ Azure Machine Learning (Azure) ≈ Vertex AI (GCP).

---
