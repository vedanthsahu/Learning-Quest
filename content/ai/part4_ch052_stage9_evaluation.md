## 52. Nova Stage 9: Evaluation (Golden Datasets, RAGAS, Regression Testing Introduced)

### 52.1 What Broke

Every prior stage's engineering decisions (RAG chunking, memory extraction, agent reflection) have been validated only informally, via manual spot-checking — as Nova's feature surface has grown (RAG, memory, tools, agents), the team can no longer confidently tell whether a given change improves or regresses quality, and a recent prompt change silently degraded retrieval-grounded answer quality for two weeks before a user complaint surfaced it.

### 52.2 Why

§12.1 and §29.1 established that AI systems lack the clean, deterministic correctness notion of ordinary software tests — without a dedicated evaluation system, every change is effectively shipped on faith, exactly the structural gap that allowed a real regression to go undetected for two weeks.

### 52.3 Candidates and Their Costs

**Option A — build a comprehensive evaluation system across every dimension (correctness, faithfulness, robustness, safety, cost, latency) immediately:** Thorough, but a large upfront investment before knowing which dimensions matter most for Nova's actual failure patterns. **Option B — start with a golden dataset and regression testing on the highest-risk dimension first (RAG faithfulness, given the two-week undetected regression), expanding to other dimensions incrementally:** Faster to get real protection against the most costly recently-experienced failure mode, deferring full-coverage investment until it's justified by evidence.

### 52.4 Chosen Solution

Option B: build a golden dataset (§29.2) starting specifically with real production queries and the recently-discovered regression case (directly following §29.2's "living artifact, seeded from real incidents" principle), initially scoring RAG faithfulness/groundedness (§29.6, RAGAS) and retrieval recall (§21.8) as the two highest-priority metrics given the incident that motivated this stage. Regression testing (§29.5) is wired into Nova's deployment process immediately — no prompt, model, or pipeline change ships without running against the golden dataset first. Trajectory-level evaluation (§39.7) for Stage 8's agentic behavior is added as the second priority, directly because per-turn metrics alone cannot catch agent-looping or premature-completion failures.

### 52.5 What It Enabled

Nova's team can now ship changes with confidence that a regression will be caught before reaching production, not discovered two weeks later via user complaint — directly closing the gap that motivated this stage, and providing the metric foundation every subsequent stage (guardrails' safety evaluation, enterprise's per-tenant quality monitoring) depends on.

### 52.6 The New Tradeoff This Introduced

Evaluation runs add real engineering time and compute cost to every deployment, and — as §39 anticipated — this cost will itself need active management as change velocity increases (scoped/incremental evaluation runs, §39.7) to avoid the evaluation system itself becoming a bottleneck teams start skipping. The golden dataset also requires ongoing maintenance discipline (§39.7's incident-to-dataset pipeline) that must now become a standing team practice, not a one-time setup.

### 52.7 Engineering Intuition

> **Why start with RAG faithfulness rather than building comprehensive evaluation across every dimension?** Because the actual, recently-experienced incident (§52.1) was a faithfulness regression — starting evaluation investment where real evidence points, rather than a theoretical complete-coverage ideal, delivers protection against the most probable next incident fastest.

### 52.8 Decision Tree: What Should Nova Evaluate First?

```
Has a specific quality dimension already caused a real, recent
incident?
  YES -> Build golden-dataset evaluation for THAT dimension first
         (§52.3 Option B) -- don't wait for comprehensive coverage.
  NO  -> Start with the dimension most central to your core value
         proposition (for RAG-heavy Nova: faithfulness/groundedness,
         §29.6) and expand from there.
```

### 52.9 Python Snippet: Nova's First Regression Gate

```python
# Nova Stage 9: wires golden-dataset evaluation into the
# deployment pipeline as a hard gate (§52.4) -- no change ships
# without passing this check.

def deployment_gate(candidate_pipeline, golden_dataset, baseline_score,
                      min_acceptable_drop=0.05):
    scores = [faithfulness_judge(item["query"], candidate_pipeline(item["query"]),
                                   item["expected_context"])
              for item in golden_dataset]
    avg_score = sum(scores) / len(scores)

    if avg_score < baseline_score - min_acceptable_drop:
        raise ValueError(
            f"DEPLOYMENT BLOCKED: faithfulness {avg_score:.2f} vs "
            f"baseline {baseline_score:.2f} -- exceeds acceptable "
            f"drop threshold (§29.5)."
        )
    print(f"Deployment gate passed: {avg_score:.2f} (baseline {baseline_score:.2f})")
    return True
```

### 52.10 Further Reading

- §29 (AI Evaluation Mechanics), §39 (Production Evaluation at Scale) — the direct foundation of this stage.

---
