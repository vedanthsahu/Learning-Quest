## 42. Production Incident Response for AI Systems: Consolidated AI Incident Framework

### 42.1 The Problem: Every Chapter in Part III Has Used the Same Framework — This Chapter Makes It Explicit and Complete

§14.7 promised this consolidation. Chapters 32-41 each applied the AI Failure Engineering framework (Symptoms, Possible Causes, Metrics, Investigation, Root Cause, Mitigation, Tradeoffs, Prevention) to a specific named failure mode. This chapter assembles them into one unified incident-response process — the concrete operational playbook an on-call engineer actually follows when a real, not-yet-diagnosed AI production incident begins, before it's known which of §32-41's specific categories applies.

### 42.2 The Unified Triage Sequence: Determining Which Chapter's Diagnostic Path Applies

Real incidents rarely arrive pre-labeled as "a latency problem" or "a hallucination problem" — they arrive as a user complaint or an alert, and triage is the process of routing to the correct diagnostic chapter quickly. The recommended triage sequence: first, check the shared-infrastructure health view (§41.4) to immediately rule in or out a systemic, cross-feature cause; second, classify the primary symptom (latency, §32; cost, §33; poor retrieval, §34; incorrect/fabricated content, §35; agent non-termination, §36; low GPU utilization, §37; embedding/reranking regression, §38) using each chapter's own §X.2 symptom list as a matching checklist; third, once classified, follow that specific chapter's Investigation → Root Cause → Mitigation path rather than improvising.

### 42.3 Why Misclassification Is the Most Expensive Early Mistake

§34-35 explicitly warned that "bad answer" complaints conflate retrieval and generation failures; §36-37 similarly warned that agent and GPU symptoms can each masquerade as the other's cause. The single highest-leverage early triage action, across nearly every AI incident, is the cheap, generation-independent check each relevant chapter provides (retrieval recall for §34/§35, KV-cache occupancy alongside compute utilization for §37, tool-call repetition detection for §36) — performing this check *before* deep investigation reliably prevents the single most common and costly failure mode of incident response itself: investigating the wrong half of the pipeline.

### 42.4 Postmortem Structure: What Every AI Incident's Postmortem Must Produce

Beyond the companion handbook's standard postmortem structure (companion §57.6), an AI incident postmortem must additionally produce two AI-specific artifacts: a new golden dataset example (§29.2, §39.7) representing the failure, ensuring regression testing would catch a recurrence; and an explicit statement of which layer of defense or monitoring *should* have caught this earlier, and why it didn't (directly extending §31.10's connection between instrumentation and incident response, and §40's security-specific version of the same question) — since an AI incident postmortem that only documents the fix, without asking why observability or evaluation didn't catch it sooner, misses the systemic-improvement half of the exercise.

### 42.5 Severity Classification for AI-Specific Incidents

AI incidents warrant severity classification that accounts for dimensions ordinary incident severity scales (companion §57.2) may not fully capture: a cost-runaway incident (§33) may have low user-facing severity (nothing looks broken to users) but high financial severity, requiring cost-specific severity thresholds distinct from user-impact-based ones; a hallucination incident (§35) in a domain with real-world consequence (medical, financial, legal information) warrants higher severity than an equivalently-frequent hallucination in a low-stakes domain, meaning severity classification must weight domain consequence, not just error rate or user volume, in exactly the way general software incident severity already weights blast radius and reversibility (companion §57.2) — applied here to a new consequence dimension (content correctness stakes) that doesn't have a direct analogue in most non-AI incidents.

### 42.6 The Recurring Root-Cause Pattern Across This Part

Reviewing §32-41 together reveals a small number of root causes recurring across many chapters far more often than any exotic, chapter-specific explanation: unmanaged context/history growth (§24.7, implicated in §32's latency, §33's cost, and indirectly §35's hallucination risk); embedding-model version mismatches after an upgrade (§20.7, implicated directly in §34 and §38); and ambiguous tool/retrieval results that a model reasonably misinterprets (§25.2, §36.6, and indirectly §34-35's retrieval-generation conflation). A production AI team's highest-leverage standing investment is proactive monitoring and testing specifically against these three recurring patterns, rather than building bespoke defenses against every chapter's specific symptom independently.

### 42.7 Engineering Intuition

> **What's the single most valuable first action when any AI production incident begins?** Check the shared-infrastructure health view (§41.4) and run the relevant chapter's generation-independent check (retrieval recall, KV-cache occupancy, tool-repetition detection) before any deep investigation — this triage step alone resolves scope and rules out roughly half of likely misdiagnoses in minutes.

> **Why do AI postmortems feel less useful than expected even when the immediate fix works?** Check whether the postmortem produced a golden-dataset addition and an explicit "why didn't monitoring catch this sooner" answer (§42.4) — a postmortem documenting only the fix, without these two artifacts, doesn't actually improve the system's ability to catch the next occurrence.

> **What would over-engineering look like here?** Building bespoke, chapter-specific incident tooling for each of §32-41's individual failure modes before addressing the three recurring root-cause patterns (§42.6) that account for a disproportionate share of real incidents across every category.

### 42.8 Decision Tree: The Unified AI Incident Triage Sequence

```
An AI production incident is reported. Start here.

1. Check shared-infrastructure health (§41.4).
   Systemic signal present? -> Investigate the shared dependency
   directly; do NOT triage as feature-specific.

2. Classify the primary symptom against §32-38's symptom lists:
   Latency?              -> §32
   Cost?                  -> §33
   Poor/missing retrieval? -> §34
   Fabricated/incorrect content? -> §35 (but FIRST check retrieval
                                     recall, §34.5 -- often
                                     misclassified)
   Agent not terminating/repeating? -> §36
   Low GPU utilization/throughput? -> §37
   Embedding/reranking regression?  -> §38

3. Follow THAT chapter's Investigation -> Root Cause -> Mitigation
   path specifically -- do not improvise a generic investigation.

4. Postmortem MUST produce: a golden-dataset example (§29.2,
   §39.7) AND an explicit answer to "why didn't monitoring/
   evaluation catch this sooner" (§42.4).
```

### 42.9 Python Snippet: A Triage Classifier Skeleton

```python
# Demonstrates §42.2-42.3: a concrete, runnable first-triage step
# routing an incident report to the correct chapter's diagnostic
# path, checking generation-independent signals FIRST.

def triage_ai_incident(symptom_description, retrieval_recall=None,
                         gpu_compute_util=None, kv_cache_occupancy=None,
                         tool_repeat_detected=None):
    if retrieval_recall is not None and retrieval_recall < 0.5:
        return "Route to §34 (Retrieval Quality) -- recall is low; " \
               "do NOT treat as a generation/hallucination problem."

    if tool_repeat_detected:
        return "Route to §36 (Agent Reliability) -- tool repetition " \
               "detected before deep investigation."

    if (gpu_compute_util is not None and kv_cache_occupancy is not None
            and gpu_compute_util < 70 and kv_cache_occupancy > 85):
        return "Route to §37 (GPU/Throughput) -- memory-constrained, " \
               "not compute-idle; adding compute will not help."

    return (f"No generation-independent signal matched -- classify "
            f"manually against §32-38 symptom lists using: "
            f"'{symptom_description}'")

print(triage_ai_incident("users report wrong answers",
                          retrieval_recall=0.3))
```

### 42.10 Further Reading

- §32-41 in full — this chapter is a consolidation and index, not a replacement for their individual diagnostic depth.
- The companion handbook's §57 (Incident Response Deep Dive) — the general incident-response process this chapter's AI-specific triage sequence and postmortem requirements extend.

---
