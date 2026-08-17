## 36. Production Agent Reliability Engineering: "Why Is the Agent Looping Forever?" / "Why Is the Model Repeating Itself?"

### 36.1 The Problem: Autonomy Is Precisely What Makes Agent Failures Structurally Different

§8.8 and §25.11 previewed the infinite-loop risk as a defining agent-specific failure mode. Unlike a deterministic workflow, an agent decides its own next action at each step — meaning a subtly wrong decision doesn't just produce one bad output, it can compound across many steps, consume unbounded tokens (§15.9), and never naturally terminate, a failure mode with no direct analogue in ordinary request-response software.

### 36.2 Symptoms

The agent invokes the same tool repeatedly with identical or near-identical arguments; the agent's `max_steps` safeguard (§25.11) is hit routinely rather than as a rare edge case; the agent produces a final answer that doesn't reflect the actual accumulated tool results; token/cost consumption for agentic requests is far higher and more variable than for non-agentic ones; the agent appears to "forget" earlier steps and repeats work already completed.

### 36.3 Possible Causes

The agent's tool result isn't clearly communicated back into context in a way the model can recognize as "already done" (a formatting/prompt-engineering issue in how tool results are presented, §25.2); the agent's planning (§25.3) lacks any explicit goal-completion check, so it continues acting even after the goal is technically satisfied; a tool call is failing silently (returning an empty or malformed result the model misinterprets as "try again" rather than "this failed"); the underlying task genuinely exceeds the model's reasoning capability for multi-step planning, causing it to lose track of overall progress across many steps (a capability mismatch, not a bug); reflection (§25.4) is absent, so the agent never evaluates whether its current approach is actually working before continuing it.

### 36.4 Metrics

Steps-per-request distribution (a rising average or a growing tail of near-`max_steps` requests is the primary leading indicator); tool-call repetition rate (the same tool+arguments combination invoked more than once within a single agent run); token consumption per agentic request, tracked separately from non-agentic requests (§31.4); rate of requests hitting `max_steps` without producing a satisfactory final answer.

### 36.5 Investigation

Pull the full step-by-step trace (§31.2's tool-call spans) for looping requests and inspect exactly what the model "saw" after each tool call — frequently the tool result itself, not the model's reasoning, is the actual defect (a malformed or uninformative result the model reasonably misinterprets); compare looping requests against successfully-completing ones with similar goals to isolate whether the difference is task complexity (a capability mismatch) or a specific tool/prompt defect that could recur across many similar tasks.

### 36.6 Root Cause

Frequently one of: a tool returning an ambiguous or silently-failed result (e.g., an empty list that could mean "no results" or "the call itself failed") with no distinct signal the model can use to tell these apart; absence of an explicit "have I completed the goal?" reflection step (§25.4), meaning the agent has no natural mechanism to recognize completion and stop; a task genuinely at or beyond the current model's reliable multi-step planning capability, most correctly addressed by narrowing the task's scope or adding explicit sub-goal structure (§25.3's upfront planning) rather than expecting open-ended reasoning to succeed.

### 36.7 Mitigation

Make tool results unambiguous about success/failure/emptiness explicitly (never rely on the model to correctly infer this from an ambiguous structure); add an explicit reflection/goal-check step after each action (§25.4) specifically evaluating "does this satisfy the original goal" before continuing; reduce `max_steps` for task types shown to need fewer steps when working correctly, making runaway loops fail faster and cheaper even when they still occur; for tasks at the edge of model capability, switch to explicit upfront planning (§25.3) with a fixed, reviewable step sequence rather than open-ended step-by-step reasoning.

### 36.8 Tradeoffs

Adding a reflection step after every action increases latency and token cost (§25.4's stated tradeoff) for every successful run in order to catch the failing ones — a real cost paid broadly to prevent a narrower but expensive failure mode; reducing `max_steps` bounds worst-case cost but risks prematurely terminating genuinely complex, legitimate multi-step tasks that need more steps than a lower limit allows; narrowing task scope for capability-limited tasks may require product-level changes (breaking a feature into smaller, more constrained interactions) beyond what pure engineering can resolve.

### 36.9 Prevention

Golden dataset (§29.2) for agentic features should specifically include tasks known to be at the edge of reliable capability, tracking steps-per-request and completion rate as first-class regression-tested metrics, not just final-answer quality; every new tool added to an agent's toolkit should have its failure/empty-result behavior explicitly tested for clarity before deployment, since tool-result ambiguity (§36.6) is the most common and most preventable root cause in this chapter.

### 36.10 Engineering Intuition

> **How do I quickly tell if a looping agent is a tool-clarity problem or a capability-mismatch problem?** Inspect whether the tool's result for the step immediately preceding the loop was ambiguous or silently uninformative (§36.5) — if fixing that ambiguity resolves the loop, it was a tool-clarity problem; if the agent still loops with unambiguous results, the task likely exceeds current reliable multi-step capability for this model.

> **Why does adding a reflection step reduce looping less than expected?** Reflection only helps if the model can actually recognize the loop pattern from context — if tool results themselves remain ambiguous (§36.6), reflection has no clearer signal to reason over than the original loop did; fix result clarity first, reflection second.

> **What would over-engineering look like here?** Building a custom loop-detection meta-system before the cheaper, more common fixes — unambiguous tool results and an explicit goal-completion reflection step (§36.7) — have been tried and evaluated.

### 36.11 Decision Tree: Diagnosing an Agent Loop

```
Is the SAME tool being called with near-identical arguments
repeatedly (§36.2)?
  YES -> Inspect that tool's result format for ambiguity (§36.6)
         FIRST -- this is the most common, most fixable cause.
Does the agent lack an explicit "is the goal complete?" check
after each step?
  YES -> Add a reflection/goal-check step (§25.4, §36.7).
Does the loop persist even with unambiguous tool results and a
goal-check step in place?
  YES -> This is likely a capability mismatch (§36.6) -- narrow
         task scope or switch to explicit upfront planning (§25.3)
         rather than open-ended step-by-step reasoning.
Is `max_steps` being hit routinely (not as a rare edge case)?
  YES -> Treat this as a systemic signal, not an isolated
         incident -- investigate the most common task type
         hitting the limit specifically.
```

### 36.12 Python Snippet: Detecting Tool-Call Repetition Within an Agent Run

```python
# Demonstrates §36.4's leading indicator: detecting repeated
# identical tool calls WITHIN a single agent run, the earliest
# and cheapest signal of a developing loop.

def detect_tool_repetition(tool_call_history, max_repeats=2):
    # tool_call_history: list of (tool_name, args_dict) in call order
    seen = {}
    for i, (tool_name, args) in enumerate(tool_call_history):
        key = (tool_name, tuple(sorted(args.items())))
        seen[key] = seen.get(key, 0) + 1

        if seen[key] > max_repeats:
            return True, i, key  # flag BEFORE reaching max_steps,
                                   # cheaper to catch here (§36.9)
    return False, None, None

history = [
    ("search_docs", {"query": "refund policy"}),
    ("search_docs", {"query": "refund policy"}),
    ("search_docs", {"query": "refund policy"}),
]
looping, step_index, repeated_call = detect_tool_repetition(history)
print(f"Loop detected: {looping} at step {step_index}: {repeated_call}")
```

### 36.13 Further Reading

- §25.2-25.4 (Tool Calling, Planning, Reflection) — the core mechanisms this chapter's diagnostic framework depends on.
- Anthropic, "Building Effective Agents" (2024) — practical guidance directly informing §36.6-36.7's mitigation catalog.

---
