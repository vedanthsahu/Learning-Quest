## 35. Production Hallucination Diagnosis & Mitigation: "Why Is the Chatbot Hallucinating?"

### 35.1 The Problem: "Hallucination" Is a Symptom Name, Not a Single Root Cause

§6.5 and §23.9 established that no RAG architecture eliminates hallucination risk entirely. This chapter treats "hallucination" as a symptom requiring the same rigorous root-cause investigation as any other production defect — since the fix for a hallucination caused by poor retrieval (§34) is entirely different from the fix for one caused by weak grounding instructions, and treating both identically wastes engineering effort.

### 35.2 Symptoms

The model states facts not present anywhere in the provided context; the model fabricates a plausible-sounding but incorrect citation or source attribution; the model confidently answers a question the provided context does not actually address, rather than indicating uncertainty or lack of information; hallucination rate increases for specific query types (e.g., questions the corpus genuinely doesn't cover) more than others.

### 35.3 Possible Causes

Retrieval failed to find relevant information at all (§34), leaving the model to fall back on its own pretrained (and potentially outdated or generic) knowledge instead of the intended grounded context; grounding instructions (§23.9) are weak, absent, or positioned poorly in the prompt (a long context can dilute instruction adherence, §17.5's attention-behavior-over-long-sequences concern); the model is being asked a question genuinely outside the provided context's coverage, with no explicit instruction or mechanism for it to say "I don't know" rather than guessing; temperature or sampling settings (§19.3) are too high for a task requiring strict factual grounding; conflicting or contradictory information across multiple retrieved chunks, with no instruction on how to handle the conflict.

### 35.4 Metrics

Faithfulness and groundedness scores (§29.6, RAGAS) measured continuously against a golden dataset, decomposing each answer into individual claims checked against retrieved context; retrieval recall (§21.8, §34.4) measured alongside faithfulness specifically to distinguish "hallucinated because retrieval failed" from "hallucinated despite good retrieval"; rate of "I don't know" or uncertainty-expressing responses (a near-zero rate on a corpus with known coverage gaps is itself a red flag, indicating the model is guessing rather than admitting insufficient information).

### 35.5 Investigation

For each flagged hallucination, first check retrieval recall (§34.5) for that specific query — if the correct information was never retrieved, the root cause is retrieval, not generation, and belongs in §34's diagnostic path instead; if the correct information *was* retrieved but the model still fabricated or contradicted it, inspect the actual prompt sent (via prompt logging, §31.3) to check grounding-instruction placement and strength, and check whether retrieved chunks contained conflicting information the model had no instruction to reconcile.

### 35.6 Root Cause

Frequently one of: retrieval failure being misdiagnosed as a generation/hallucination problem, when the actual fix belongs in §34; grounding instructions present only once at the very start of a long prompt, weakened by the attention-dilution effect over a long context (§17.5, §30.2's "instructional reinforcement" mitigation applies directly); no explicit instruction or trained behavior permitting the model to express uncertainty, meaning it defaults to producing a confident-sounding answer even when the honest answer is "the provided information doesn't address this."

### 35.7 Mitigation

Fix retrieval first if §35.5 identifies it as the actual cause (redirect to §34, not this chapter); strengthen and reposition grounding instructions, repeating them near the retrieved content itself rather than only at the prompt's start (§30.2); add an explicit instruction and, ideally, evaluated behavior for expressing uncertainty ("if the context does not contain the answer, say so explicitly") rather than always attempting an answer; lower temperature (§19.3) for factual-grounding-dependent tasks; add explicit conflict-handling instructions when multiple retrieved chunks may disagree.

### 35.8 Tradeoffs

An aggressive "say I don't know" instruction reduces hallucination but can make the system appear unhelpfully evasive if tuned too conservatively, requiring evaluation-driven calibration (§29) rather than a maximally cautious default; strengthening and repeating grounding instructions consumes additional context-window budget (§15.5, §24.7's allocation tradeoff); lower temperature reduces hallucination risk but may make responses feel more rigid for use cases where some natural variation is desirable.

### 35.9 Prevention

Continuous faithfulness/groundedness evaluation (§29.6) as a standing production metric, not just a pre-launch check; golden dataset (§29.2) explicitly including known corpus-coverage gaps to test whether the system appropriately expresses uncertainty rather than guessing; regression-test grounding-instruction changes for both hallucination rate and unhelpful over-caution, since both are measurable failure directions.

### 35.10 Engineering Intuition

> **How do I quickly tell if a specific hallucination is a retrieval problem or a generation problem?** Check retrieval recall (§34.5) for that exact query first, every time — this single check redirects roughly half of all "hallucination" reports to the correct diagnostic path (§34) before any generation-side investigation begins.

> **Why does hallucination increase specifically on questions at the edge of my corpus's coverage?** This is expected and diagnostic, not surprising — it directly indicates the model lacks (or isn't using) an uncertainty-expression mechanism (§35.6) for genuinely out-of-coverage questions, rather than a general grounding failure across all questions.

> **What would over-engineering look like here?** Adopting Self-RAG (§23.8) or building an elaborate fact-checking secondary model before confirming, via retrieval-recall measurement (§34.5), that the actual cause isn't simply retrieval failure being fixed far more cheaply in §34.

### 35.11 Decision Tree: Diagnosing a Hallucination Report

```
Was the correct information present in the RETRIEVED context for
this query (§34.5)?
  NO  -> This is a retrieval problem -- redirect to §34, not a
         generation/prompting fix.
  YES -> Were grounding instructions present, strong, and
         positioned near the retrieved content (§35.6)?
    NO  -> Strengthen/reposition grounding instructions (§30.2)
           and re-evaluate faithfulness (§29.6).
    YES -> Did the query fall genuinely outside the corpus's
           actual coverage?
      YES -> Add/evaluate explicit uncertainty-expression
             instructions and behavior (§35.7).
      NO  -> Check for conflicting information across retrieved
             chunks and add explicit conflict-handling guidance.
```

### 35.12 Python Snippet: A Faithfulness Check That Also Flags Retrieval Failure

```python
# Demonstrates §35.5's key diagnostic step: checking faithfulness
# AND retrieval recall together, so a hallucination is correctly
# attributed to the right root cause.

def diagnose_hallucination(query, answer, retrieved_context,
                             faithfulness_judge_fn, known_relevant_ids,
                             retrieved_ids):
    recall = len(set(retrieved_ids) & set(known_relevant_ids)) / \
             max(len(known_relevant_ids), 1)

    faithfulness_score = faithfulness_judge_fn(query, answer, retrieved_context)

    if recall < 0.5:
        diagnosis = "RETRIEVAL FAILURE -- fix via §34, not generation."
    elif faithfulness_score < 3:  # on a 1-5 scale, §12.8
        diagnosis = ("GENERATION/GROUNDING FAILURE -- retrieval was "
                      "adequate but the model didn't use it faithfully.")
    else:
        diagnosis = "No hallucination detected for this case."

    print(f"Recall: {recall:.2f} | Faithfulness: {faithfulness_score}/5")
    print(f"Diagnosis: {diagnosis}")
    return diagnosis
```

### 35.13 Further Reading

- §21.8 (Retrieval Evaluation), §29.6 (RAGAS Faithfulness/Groundedness) — the primary metrics this chapter's diagnostic split depends on.
- Ji et al., "Survey of Hallucination in Natural Language Generation" (2023) — a broader academic survey providing context for §35.3's cause taxonomy.

---
