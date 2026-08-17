## 50. Nova Stage 7: Multi-Tool Orchestration

### 50.1 What Broke

Real user requests increasingly require *combining* multiple tools in sequence ("check my order status, and if it's delayed, check the weather at the delivery address") — Stage 6's single-tool-per-turn model handles each tool in isolation but has no mechanism for chaining results from one tool call into the input of another within a single user request.

### 50.2 Why

§25.3 established that planning — sequencing multiple actions toward a goal — is a distinct capability from simply invoking one tool given one instruction; Stage 6's architecture never asked the model to reason across multiple steps at all, so multi-step requests either fail outright or produce an incomplete, single-tool-only response.

### 50.3 Candidates and Their Costs

**Option A — implicit, step-by-step planning (ReAct-style, §24.4):** The model reasons about its next single action given the current state, repeating until done — adapts naturally to unexpected intermediate results but is less predictable/inspectable. **Option B — explicit upfront planning:** The model first generates a complete multi-step plan, which can be logged and reviewed, before any execution begins — more controllable and auditable, but less adaptive if an early step's result invalidates the original plan.

### 50.4 Chosen Solution

Option A initially: ReAct-style implicit planning, since Nova's multi-tool tasks at this stage are typically short (two to three steps) and benefit more from adaptiveness than from upfront auditability — explicit planning is deferred until Stage 8's more complex agentic tasks (§51) demonstrate a concrete need for it. A `max_steps` safeguard (§25.11) is added from the very start of this stage, not as an afterthought, directly anticipating the looping risk §49.6 flagged as a consequence of allowing multiple sequential tool calls.

### 50.5 What It Enabled

Nova can now complete realistic multi-step tasks that require using the result of one tool as input to deciding the next action — a substantial capability expansion directly building toward genuine agentic behavior (§51), while remaining bounded and safe via the `max_steps` limit.

### 50.6 The New Tradeoff This Introduced

Total request latency and cost now vary far more per-request than in any previous stage, since the number of tool-call round-trips is no longer fixed at zero or one but genuinely variable (§15.9's cost-variance concern, now concretely realized) — and the tool-result-ambiguity risk flagged in §49.6 becomes an active, observable failure mode requiring the tool-repetition monitoring (§36.4, §36.12) introduced conceptually in Part III to now actually be implemented in Nova's production monitoring.

### 50.7 Engineering Intuition

> **Why not implement explicit upfront planning immediately, given its auditability advantage?** Because Stage 7's tasks are still short enough that ReAct's adaptiveness outweighs the auditability benefit — explicit planning's added complexity is deferred until a concrete need (Stage 8's more complex tasks) actually demonstrates ReAct's limitation.

### 50.8 Decision Tree: Choosing a Planning Strategy for a Multi-Tool Task

```
Is the task short (2-3 steps) and does it benefit from adapting
to intermediate results?
  YES -> ReAct-style implicit planning (§50.4) is sufficient.
Does the task involve high-stakes or hard-to-reverse actions
where a reviewable plan matters before execution begins?
  YES -> Use explicit upfront planning (§25.3) regardless of step
         count -- auditability matters more than adaptiveness here.
```

### 50.9 Python Snippet: Nova's Multi-Tool ReAct Loop with a Step Safeguard

```python
# Nova Stage 7: chains multiple tool calls within one user request,
# with the max_steps safeguard present from day one (§50.4).

def nova_multi_tool_turn(llm_client, messages, tools, max_steps=4):
    for step in range(max_steps):
        response = llm_client.chat(messages=messages, tools=tools)

        if response.tool_call is None:
            return response.content  # final answer reached

        result = execute_tool(response.tool_call.name,
                                response.tool_call.arguments)
        messages.append({"role": "tool", "content": str(result)})
        # each iteration feeds the PREVIOUS tool's result back in,
        # letting the model decide the NEXT action based on it (§50.2)

    return ("I wasn't able to complete this in the allotted steps -- "
            "let me know if you'd like me to try a narrower request.")
    # graceful, user-facing fallback rather than a silent failure
    # or infinite loop (§36's looping-agent failure mode, prevented)
```

### 50.10 Further Reading

- §24.4 (ReAct), §25.3 (Planning), §36 (Agent Reliability Engineering) — the direct foundation and forward-looking failure mode of this stage.

---
