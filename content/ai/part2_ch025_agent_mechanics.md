## 25. Agent Mechanics: Tool/Function Calling, Planning, Reasoning, Reflection, Memory Types, Multi-Agent, MCP, A2A, Human-in-the-Loop

### 25.1 The Problem: Turning a Text-Generation Model Into a System That Takes Actions

§8 introduced the deterministic-workflow-versus-agent distinction. This chapter develops the concrete mechanisms that make an agent possible at all: how a model actually requests and receives the results of real actions, how it maintains state across multiple steps, and how multiple agents coordinate — the mechanical foundation underlying every agent-reliability failure mode in §36.

### 25.2 Tool/Function Calling: The Actual Request-Response Mechanism

**Function calling** works through a structured contract: the application provides the model with a set of tool definitions (name, description, and a schema of expected parameters, §8.3) alongside the conversation; the model, instead of (or in addition to) generating a normal text response, can generate a structured request to invoke one of these tools with specific argument values; the *application*, not the model, actually executes that tool call (the model has no direct ability to execute anything itself) and returns the result back into the conversation as a new message, which the model then continues reasoning from. This means the model's role is strictly limited to *deciding* what to call and *interpreting* results — every actual side effect (§13.6's tool-abuse concern) happens in application code the engineer controls, making tool-permission scoping an application-layer responsibility, not something delegated to the model's judgment alone.

### 25.3 Planning and Reasoning: Deciding the Sequence of Actions

**Planning** is the process by which an agent determines what sequence of tool calls and reasoning steps will accomplish a given goal — ranging from simple, implicit planning (the model just decides its next single action based on the current state, ReAct-style, §24.4) to explicit, upfront planning (the model first generates an entire multi-step plan before executing any of it, allowing that plan to be reviewed or validated before execution begins). Implicit, step-by-step planning is simpler to implement and adapts naturally as new information arrives, but is more prone to losing track of the overall goal across many steps; explicit upfront planning is more inspectable and controllable (a genuine advantage for high-stakes agent applications) but is less adaptive when early steps reveal the original plan was based on incorrect assumptions.

### 25.4 Reflection in Agent Loops: Self-Correction Before Continuing

Building on §24.4's reflection technique, an agent loop can include an explicit self-evaluation step after each action — checking whether the tool result actually advanced the goal, whether an error occurred, or whether the current approach should be revised — before deciding on the next action. This directly addresses one of §36's named failure modes (an agent proceeding confidently down a wrong path without ever noticing a tool call failed or returned an unexpected result), at the cost of additional model calls (and therefore latency and token cost, §15.9) for the reflection step itself.

### 25.5 Memory Types: Short-Term, Long-Term, Semantic, and Episodic

**Short-term memory** is simply the current conversation's context window (§15.5) — everything the model can see for the current interaction, lost once the conversation ends unless explicitly persisted. **Long-term memory** persists information across separate conversations or sessions, typically implemented as a retrieval system (§21) over previously stored information rather than as part of the model's own weights — meaning "long-term memory" for a production agent is architecturally just another RAG-like retrieval step (§23), not a fundamentally different mechanism. Within long-term memory, **semantic memory** stores general facts and learned information independent of when or how they were learned (e.g., a user's stated preferences), while **episodic memory** stores specific past events or interactions in their original context (e.g., "the user asked about refunds last Tuesday and was frustrated") — a distinction that matters for retrieval design, since semantic memory is typically retrieved by topical similarity while episodic memory often benefits from additional temporal or session-based filtering (§13.4's metadata-filtering mechanism, applied here) alongside similarity search.

### 25.6 Multi-Agent Systems: Supervisor, Delegation, and Specialization Patterns

A **multi-agent system** splits a complex task across several agents, each often with a narrower tool set, prompt, or specialization, rather than one agent handling everything — directly analogous to the companion handbook's microservices decomposition rationale (companion §8, §33.2): narrower scope per unit is easier to reason about, test, and improve independently, at the cost of coordination complexity. The **supervisor pattern** is the dominant production structure: a top-level "supervisor" agent receives the overall goal, decomposes it, delegates sub-tasks to specialized "worker" agents, and synthesizes their results into a final response — providing a clear, centralized point of control and observability (directly easier to debug and monitor, §31, than a fully decentralized peer-to-peer agent negotiation structure), which is precisely why supervisor/delegation is far more common in production systems than fully autonomous multi-agent negotiation.

### 25.7 MCP (Model Context Protocol) and A2A (Agent-to-Agent Protocol)

**MCP** is a standardized protocol for connecting a model/agent to external tools and data sources — directly analogous to the companion handbook's API standardization rationale (companion §52's API design principles): rather than every application building bespoke, incompatible tool-integration code for every model provider, MCP defines a common interface so tools and data sources built once can be reused across different agent applications and model providers without redundant integration work. **A2A (Agent-to-Agent)** protocol addresses a related but distinct problem: standardizing how independently-built agents (potentially from different vendors or teams) discover each other's capabilities and communicate to collaborate on a task — the multi-agent analogue of MCP's tool-standardization goal, aimed at avoiding a combinatorial explosion of bespoke agent-to-agent integration code as more independently-developed agents need to interoperate.

### 25.8 Human-in-the-Loop: Where Autonomy Should Stop

**Human-in-the-loop** checkpoints require explicit human approval before an agent proceeds with a specific action — most commonly gated on the action's real-world stakes (financial transactions, irreversible operations, actions affecting other users, §13.6's tool-abuse concern) rather than gated on the agent's own confidence, since a confidently-wrong agent provides no useful signal about when a human check is actually needed. This is not a failure of "full autonomy" but a deliberate, permanent architectural safeguard for high-stakes actions — directly the AI-specific instance of the companion handbook's approval-gate pattern for high-risk operations (companion §46.6's deployment-approval-gate reasoning, applied to agent actions instead of deployments).

### 25.9 Engineering Intuition

> **How do I decide whether my agent needs explicit upfront planning or can rely on step-by-step ReAct-style reasoning?** If the task's action sequence benefits from being reviewed or validated before any execution begins (high-stakes, hard-to-reverse actions), use explicit planning (§25.3); if the task is naturally adaptive and low-stakes, step-by-step reasoning is simpler and adapts better to unexpected intermediate results.

> **Why does my multi-agent system produce inconsistent or contradictory final results?** Almost always a missing or weak supervisor/synthesis step (§25.6) — worker agents operating independently without a clear final synthesis stage will naturally produce results that don't cohere into one consistent answer.

> **What would over-engineering look like here?** Building a multi-agent supervisor architecture (§25.6) for a task a single agent with a well-scoped tool set already handles reliably — multi-agent decomposition adds real coordination and debugging complexity that should be justified by a demonstrated single-agent limitation, not adopted by default.

### 25.10 Decision Tree: What Agent Architecture Fits My Task?

```
Can a single agent with a focused, well-scoped tool set complete
the task reliably (per evaluation, §12, §29)?
  YES -> Use a single agent -- do not add multi-agent complexity
         (§25.6) without a demonstrated need.
  NO (task genuinely spans distinct specializations or a very
  large tool surface) -> Consider a supervisor/delegation
         multi-agent structure (§25.6).
Does the task involve high-stakes, hard-to-reverse actions
(financial, destructive, cross-user)?
  YES -> Add human-in-the-loop approval gates (§25.8) for those
         specific actions regardless of overall agent design.
Does the agent need to recall information across separate
sessions/conversations?
  YES -> Add long-term memory (§25.5) via a retrieval system --
         distinguish semantic vs. episodic storage needs.
Are you integrating many external tools/data sources across
multiple agent applications?
  YES -> Adopt MCP (§25.7) rather than building bespoke,
         per-integration tool-connection code.
```

### 25.11 Python Snippet: A Minimal Tool-Calling Loop with a Reflection Check

```python
# Demonstrates §25.2 (tool calling) and §25.4 (reflection) --
# the model requests a tool, the APPLICATION executes it, and a
# reflection step checks the result before continuing.

def agent_step(llm_client, messages, tools, max_steps=5):
    for step in range(max_steps):
        response = llm_client.chat(messages=messages, tools=tools)

        if response.tool_call is None:
            return response.content    # model produced a final answer

        # Application executes the tool -- the model NEVER does
        # this directly (§25.2's core safety boundary)
        result = execute_tool(response.tool_call.name,
                                response.tool_call.arguments)

        # Reflection: did the tool call actually succeed/help?
        if result.get("error"):
            messages.append({"role": "system",
                              "content": f"Tool failed: {result['error']}. "
                                         f"Reconsider your approach."})
        else:
            messages.append({"role": "tool", "content": str(result)})

    return "Max steps reached without a final answer."  # §36's
                                                           # infinite-
                                                           # loop
                                                           # safeguard
```

### 25.12 Further Reading

- Anthropic, "Building Effective Agents" (2024) — a practical engineering reference directly underlying §25.3's planning-pattern comparison.
- The Model Context Protocol (MCP) specification — the current, authoritative reference for §25.7.

---
