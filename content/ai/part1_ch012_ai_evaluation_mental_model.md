## 12. Mental Model: AI Evaluation

### 12.1 The Problem: How Do You Know If Your AI Product Actually Works?

Ordinary software has a comparatively clean notion of correctness, verifiable by a deterministic test suite (companion handbook §15.2). An LLM's output for a given input is rarely reducible to one single "correct" answer, and a subtle prompt, model, or retrieval change can silently degrade quality in ways no traditional test would catch. **AI evaluation** is the dedicated discipline this gap demands — without it, you are shipping changes based on a few manual spot-checks and hoping, which is precisely the structural mistake §1.7 flagged as the most common failure in the AI product lifecycle.

### 12.2 Golden Datasets and Regression Testing

A **golden dataset** is a curated, representative set of real or realistic inputs paired with known-good expected outputs or explicit grading criteria — the AI-product equivalent of a test suite, run automatically against every prompt, model, or pipeline change specifically to catch quality **regressions** before they reach production, exactly mirroring the companion handbook's CI discipline (companion §15.2, §46.2) but measuring output *quality* rather than binary pass/fail correctness. Building this dataset early, before scaling traffic, is the single highest-leverage evaluation investment available, precisely because every other evaluation technique in this chapter depends on having representative examples to run against.

### 12.3 LLM-as-Judge: Scaling Evaluation Beyond What Humans Can Manually Review

**Human evaluation** — a person reading model outputs and grading them — remains the most reliable evaluation method, but it does not scale to the volume of continuous testing a fast-moving product needs. **LLM-as-Judge** uses a separate model call to grade a primary model's output against defined criteria (accuracy, tone, faithfulness to sources), providing a scalable, automatable substitute for a large fraction of human grading. This is not a free win: an LLM judge inherits its own biases and blind spots, and it must itself be periodically validated against real human ratings to confirm it remains a trustworthy proxy — an evaluation system that has never been checked against genuine human judgment is itself an unvalidated, unevaluated component, which defeats its own purpose.

### 12.4 RAGAS and Retrieval-Specific Evaluation Metrics

For RAG systems specifically (§6), evaluation must measure more than just final-answer correctness — **RAGAS** (a widely-used open-source evaluation framework) and similar tools measure **faithfulness** (does the generated answer actually match what the retrieved sources say, directly operationalizing §6.5's distinction), **groundedness** (is every claim in the answer traceable to a specific retrieved source), and retrieval quality itself (did the system retrieve the right documents at all, independent of what the model did with them afterward) — deliberately separating "was the right information found" from "did the model use it correctly," since these are genuinely different failure modes requiring genuinely different fixes (§34 develops this diagnostic split in full production depth).

### 12.5 Robustness, Cost, Latency, and Safety as Evaluation Dimensions

A complete evaluation practice measures more than correctness alone: **robustness** (does the system behave reliably across paraphrased, oddly-formatted, or adversarial inputs, not just clean, expected ones), **cost** and **latency** (tracked as evaluation dimensions in their own right, not just correctness — the companion handbook's principle that cost is an architectural property, companion §23.4, applies directly here), and **safety** (does the system avoid generating harmful, biased, or policy-violating content, directly connecting to the guardrails developed in §13, §30). **Win-rate evaluation** compares two versions of a system (a candidate prompt/model change versus the current production version) head-to-head on the same inputs, with a judge (human or LLM-as-judge) picking which output is better — a directly comparative evaluation method well suited to deciding whether a proposed change is actually an improvement, rather than measuring absolute quality in isolation.

### 12.6 Engineering Intuition

> **How do I know if my evaluation practice is adequate?** Ask whether a genuine quality regression (a worse prompt, a degraded retrieval pipeline) would actually be caught by your current process before reaching users — if the honest answer is "only if someone happens to notice," no real evaluation practice exists yet, regardless of how much manual testing has been done historically.
>
> **What symptoms indicate an LLM-as-judge has become unreliable?** Automated evaluation scores that no longer correlate with periodic human-rating spot-checks — a direct signal the judge itself needs re-validation or replacement (§12.3).
>
> **What would over-engineering look like here?** Building an elaborate, multi-dimensional evaluation framework before a golden dataset (§12.2) even exists — evaluation sophistication without representative test data to run it against provides no real signal.

### 12.7 Decision Tree: What Evaluation Do I Need, and When?

```
Do you have a golden dataset of representative inputs with
known-good outputs/criteria?
  NO  -> Build this FIRST, before any other evaluation
         investment (§12.2) -- everything else depends on it.
  YES -> Is this a RAG system specifically?
    YES -> Add faithfulness/groundedness metrics (§12.4, RAGAS)
           alongside answer-correctness metrics.
    NO  -> Standard correctness + robustness + safety metrics
           (§12.5) suffice as a starting set.
  In all cases: run golden-dataset evaluation automatically on
  every prompt/model/pipeline change (§12.2), and periodically
  validate any LLM-as-judge component against real human ratings
  (§12.3) to confirm it remains trustworthy.
```

### 12.8 Python Snippet: A Minimal LLM-as-Judge Evaluation

```python
# Demonstrates §12.3: using a model to grade another model's
# output against explicit criteria, producing a score usable
# in automated regression testing (§12.2).

def llm_judge(llm_client, question, answer, retrieved_context):
    judge_prompt = f"""Evaluate the ANSWER below on a scale of
1-5 for FAITHFULNESS: does it only make claims supported by
the CONTEXT, with no fabricated details?

Context: {retrieved_context}
Question: {question}
Answer: {answer}

Respond with ONLY a number 1-5."""

    result = llm_client.chat.completions.create(
        model="gpt-4o-mini",  # a smaller, cheaper model is often
                                # sufficient for grading -- §1.5
        messages=[{"role": "user", "content": judge_prompt}],
        temperature=0,  # deterministic grading, not creative output
    )
    return int(result.choices[0].message.content.strip())

score = llm_judge(
    client,
    question="What is the refund window?",
    answer="Items can be refunded within 30 days.",
    retrieved_context="Damaged items may be returned within 30 days for a full refund.",
)
print(f"Faithfulness score: {score}/5")
```

### 12.9 Further Reading

- Es et al., "RAGAS: Automated Evaluation of Retrieval Augmented Generation" (2023) — the foundational paper behind the framework named in §12.4.
- Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" (2023) — the influential paper establishing and validating the LLM-as-judge methodology from §12.3.

---
