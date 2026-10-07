## 12. Evaluation, Testing and Debugging

### 12.1 Why LLM testing is different [A→D]

Outputs are **non-deterministic** and **open-ended**, so exact-match unit tests cover only a slice. You need **evaluations**: representative inputs, expected behaviour and graders, run repeatedly and compared across changes (prompt, model, effort, tools).

### 12.2 Building blocks [B]

| Concept | Meaning |
|---|---|
| **Eval dataset** | Representative real or synthetic inputs, including edge cases and adversarial cases |
| **Golden dataset** | Inputs with *known-correct* expected outputs or labels (often human-verified) |
| **Frozen regression set** | A fixed set re-run on every change and every model migration so results are comparable |
| **Success criteria** | Defined *before* testing: specific, measurable (accuracy ≥ X, schema validity 100%, refusal rate < Y) |

### 12.3 Graders [B][C]

| Grader | Good for | Limits |
|---|---|---|
| **Code-based** (exact match, regex, schema validation, unit tests on generated code) | Deterministic, objective checks | Can't judge nuance |
| **LLM-as-judge** (Claude grades with a rubric) | Tone, relevance, faithfulness, completeness, at scale | Bias (position, verbosity, self-preference); needs a clear rubric; **validate it against human labels** |
| **Human evaluation** | Ground truth, nuanced quality, calibrating judges | Slow, expensive, inconsistent between raters |

Prefer code graders where possible, LLM judges for the rest, and humans to calibrate both. A good judge prompt gives a rubric, asks for reasoning, then a constrained verdict (structured output).

### 12.4 Accuracy vs quality [C]

*Accuracy* is correctness against a label. *Quality* covers helpfulness, tone, format, safety and latency. A response can be accurate but unusable (wrong format, too long), or fluent but wrong. Define both.

### 12.5 Silent failures and semantic validation [C][D]

The most dangerous failures don't raise errors:

- HTTP 200 but `stop_reason: "max_tokens"` (truncated) or `"refusal"`.
- Schema-valid JSON with wrong values (Ch. 3).
- A tool called with plausible but wrong arguments, or not called at all, with the answer hallucinated.
- An agent reports "done" without completing the task.
- Quality drift after an alias moves or a prompt changes.

Defences: semantic validators in code, **tool-call validation** (was the right tool called with valid arguments, and did the result support the answer?), output checks against sources (grounding and citations), sampling production traffic into evals, and alerts on metric shifts.

### 12.6 Failure classification [D]

Bucket failures so you fix causes, not symptoms:

| Class | Example | Typical fix |
|---|---|---|
| Prompt / instruction | Ignored a constraint | Clarify, move to system, give reasons, add examples |
| Context / retrieval | Right answer not in context | Fix retrieval or chunking, ordering |
| Tool | Wrong tool or arguments | Better descriptions, `strict`, validation |
| Reasoning | Multi-step error | Thinking or higher effort, decomposition |
| Format | Invalid JSON | Structured outputs |
| Platform | 429, 529, timeouts | Retries, backoff, capacity |
| Safety | Refusal or injection | Prompt design, guardrails |

### 12.7 Observability and debugging [A→D]

Log per request: model ID, parameters (effort, thinking), prompt version, full request and response (redacting PII), `stop_reason`, usage including cache fields, latency, tool calls and their results, and a trace ID across agent steps. Debug agent workflows by **replaying traces**: find the first step where the trajectory went wrong (bad retrieval? wrong tool? truncated context?) rather than judging only the final answer.

### Common Exam Traps

- One passing run proves little. Evaluate over a dataset (and repeated runs) because outputs vary.
- LLM-as-judge must itself be validated against human judgement.
- Success criteria come *before* building the eval, not after seeing results.
- A 200 response and valid JSON can hide failures. Check `stop_reason` and semantics.
- Re-run the **same frozen set** when changing model or prompt; a new set breaks comparability.
- Temperature 0 doesn't make testing deterministic enough to skip evals.

### Check Yourself

1. Extraction returns valid JSON, but 4% of invoice totals are wrong. What failure type is this, and how would you catch it automatically?
2. You're migrating models next month. What must exist before you switch?
3. An LLM judge prefers longer answers regardless of correctness. Fix?
4. An agent says "ticket created", but no ticket exists. Where do you look first?

**Answers**

1. A silent semantic failure. Add business-rule validation (line items sum to the total, cross-check sources) and track it as an eval metric.
2. A frozen regression/eval set with defined success criteria, baseline results on the current model, and a rollback plan.
3. Tighten the rubric (correctness first, penalize padding), use structured verdicts, and calibrate against human-labelled samples (or use pairwise comparison with position swapping).
4. The trace: was the create-ticket tool actually called, did it return an error (`is_error`) that was ignored, or did the model claim success without a call? Add tool-call validation.
