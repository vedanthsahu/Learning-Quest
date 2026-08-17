## 51. Nova Stage 8: Agents (Autonomous Loops, ReAct, Reflection)

### 51.1 What Broke

Users now bring genuinely open-ended, research-style requests ("find out whether any of my recent orders are affected by the current shipping delays and summarize what to expect") that require an unknown-in-advance number of steps, adaptive investigation, and self-assessment of whether the goal has actually been achieved — Stage 7's bounded, short ReAct loop is not designed for tasks whose length and shape can't be anticipated.

### 51.2 Why

§8.2's deterministic-workflow-versus-agent distinction becomes fully load-bearing here: Stage 7's multi-tool orchestration still followed a roughly predictable shape (a small, bounded number of related steps), while genuine agentic tasks require the model to decide not just *what* to do next but *whether it's done at all* — precisely the reflection/goal-completion capability (§25.4, §36.6) that Stage 7 didn't need.

### 51.3 Candidates and Their Costs

**Option A — extend Stage 7's ReAct loop with a higher `max_steps` and add an explicit reflection step:** Directly reuses existing infrastructure, adding the goal-completion check identified in §36.6-36.7 as the key missing mechanism for reliable agent termination. **Option B — a full supervisor/multi-agent architecture (§25.6) from the start:** Adds coordination complexity unjustified before evidence that a single agent with reflection is actually insufficient for Nova's current task complexity.

### 51.4 Chosen Solution

Option A: the existing ReAct loop is extended with an explicit reflection step after each tool result — checking "does this satisfy the user's original goal" before continuing — directly implementing §25.4 and §36.7's mitigation. `max_steps` is raised but remains a hard, non-negotiable ceiling (§25.11), and every step is logged via distributed tracing (§31.2) specifically because agentic requests are the highest-variance, highest-risk category for the cost and latency spikes Part III's §32-33 diagnose.

### 51.5 What It Enabled

Nova can now handle genuinely open-ended, multi-step research-style tasks with adaptive investigation and self-assessed completion — its most capable tier of assistance, and the direct foundation for Stage 9's evaluation investment, since agentic behavior is exactly the category of feature most in need of the trajectory-level evaluation (§39.7) that simple per-turn scoring cannot capture.

### 51.6 The New Tradeoff This Introduced

Cost and latency variance reach their highest point yet in Nova's evolution — an agentic request's token consumption and duration are now genuinely unpredictable in advance (§15.9, §33.6), requiring token-budget-based rate limiting (§31.8) specifically scoped to agentic requests, distinct from Nova's simpler-tier limits. The reflection step itself adds cost to every successful run (§25.4's stated tradeoff) in order to catch the failing ones, and looping/repetition (§36) becomes an active, monitored production risk requiring the tool-repetition detection (§36.12) to be a standing, always-on check, not an incident-response afterthought.

### 51.7 Engineering Intuition

> **Why extend the existing ReAct loop rather than rebuild with a multi-agent architecture?** Because no evidence yet exists that a single, reflective agent is insufficient for Nova's current task complexity (§51.3) — multi-agent coordination overhead (§25.6, §25.9) should be adopted in response to a demonstrated single-agent limitation, not preemptively.

### 51.8 Decision Tree: Is Nova's Single-Agent-with-Reflection Design Still Sufficient?

```
Are agentic requests completing reliably within max_steps with
correct goal-completion assessment (measured via §39's trajectory
evaluation)?
  YES -> Single agent with reflection (§51.4) remains sufficient.
  NO  -> Diagnose via §36's framework FIRST (is it a tool-clarity
         problem or a genuine capability mismatch?) before
         concluding multi-agent architecture (§25.6) is needed.
```

### 51.9 Python Snippet: Nova's Agentic Loop with Explicit Goal-Completion Reflection

```python
# Nova Stage 8: adds an explicit reflection/goal-check step after
# every tool result -- the key addition over Stage 7 (§51.4).

def nova_agent_turn(llm_client, messages, tools, original_goal,
                      max_steps=10):
    for step in range(max_steps):
        response = llm_client.chat(messages=messages, tools=tools)

        if response.tool_call is None:
            return response.content

        result = execute_tool(response.tool_call.name,
                                response.tool_call.arguments)
        messages.append({"role": "tool", "content": str(result)})

        # §51.4's key addition: explicit reflection before continuing
        reflection = llm_client.chat(messages=messages + [
            {"role": "system", "content":
                f"Original goal: {original_goal}. Based on results so "
                f"far, is this goal now satisfied? Answer YES or NO "
                f"with brief reasoning."}
        ])
        if "YES" in reflection.content[:10].upper():
            # Prompt the model to produce its final answer now
            final = llm_client.chat(messages=messages)
            return final.content

    return "Reached the step limit without confirming goal completion."
```

### 51.10 Further Reading

- §25.3-25.4 (Planning, Reflection), §36 (Agent Reliability Engineering) — the direct foundation of this stage's design and monitoring.

---
