## 8. Mental Model: Agents

### 8.1 The Problem: Some Tasks Require Taking Actions, Not Just Generating Text

RAG (§6) lets a model answer questions using retrieved information, but retrieval alone cannot *book a meeting*, *send an email*, *query a live database for today's inventory*, or *execute a multi-step task whose next step depends on the result of the previous one*. An **agent** is the architectural answer: a system where a model doesn't just generate a final text response, but can decide to invoke external **tools** (real functions, APIs, database queries), observe the result, and decide what to do next — potentially looping through several such steps before producing a final answer.

### 8.2 Deterministic Workflows vs. Agents: A Critical, Consequential Distinction

A **deterministic workflow** (call retrieval, then call a summarization step, then format the output) has a fixed, engineer-defined sequence of steps — the model fills in content at each step, but does not decide *what steps happen or in what order*. An **agent** has the model itself decide, at each step, what to do next based on the current situation — the sequence of steps is not fixed in advance, and the same request might take a different path through available tools depending on what earlier steps returned. This distinction is not a minor implementation detail — it is the single most consequential architectural decision in this entire domain, because a deterministic workflow is exactly as easy to test, debug, and reason about as ordinary software (the companion handbook's entire body of engineering practice applies directly), while a genuine agent's behavior is only as predictable as the underlying model's own decision-making, which is probabilistic and can fail in ways ordinary software never does — most notoriously, looping indefinitely (§36's dedicated production failure treatment).

### 8.3 Tool Calling / Function Calling: The Concrete Mechanism

**Tool calling** (or function calling) is the concrete mechanism underlying every agent: the model is given a description of available tools (each with a name, a description of what it does, and its expected input parameters), and instead of only generating natural-language text, it can generate a structured request to invoke one of those tools with specific arguments. The calling application (not the model itself) actually executes the real function, and the result is fed back into the model's context for its next step. This is, at its foundation, exactly the Command design pattern from the companion handbook's §94.4 — a request represented as data, decoupled from immediate execution — and it inherits every reliability concern the companion handbook already developed for real network calls (§3.2 there): a tool call can fail partially, take unpredictable time, and — critically — should be designed idempotently (companion §29.8) if it has any real side effect, since a model might retry a tool call after an ambiguous result.

### 8.4 Planning, Reasoning, and Reflection in the Agent Loop

Within an agent's loop, three distinct cognitive-sounding terms describe specific, concrete behaviors: **planning** is the model producing an explicit sequence of intended steps before executing any of them (useful for complex, multi-part tasks where committing to a full plan upfront helps avoid wandering). **Reasoning** is the model's step-by-step internal working-through of a problem at each decision point (directly connecting to §7.4's Chain of Thought, now embedded inside a loop rather than a single-shot answer). **Reflection** (§7.5) is the model evaluating its own prior step's result and deciding whether to proceed, retry, or change approach. A production agent typically combines all three: plan an approach, reason through and execute each step via tool calls, and reflect on results to catch and correct errors before they compound across further steps.

### 8.5 Memory: Giving an Agent Continuity Beyond One Context Window

An agent operating across many turns or a long-running task needs some form of **memory** beyond what fits in a single context window (§2.5). **Short-term memory** is simply the current conversation's context window — everything the model can see right now. **Long-term memory** persists information across separate sessions or conversations (a user's stated preferences, facts learned in a prior interaction), typically implemented using the same retrieval mechanisms from §3-5 — long-term memory is very often, mechanically, just another RAG system, retrieving relevant remembered facts into context rather than requiring the model to hold everything at once. Within this, **semantic memory** stores general facts and knowledge (the user's job title, stated preferences), while **episodic memory** stores specific past events or interactions (what happened in a specific prior conversation) — a distinction borrowed directly from cognitive science, useful here because the two are often stored and retrieved differently in a real system.

### 8.6 Multi-Agent Systems: Supervisor and Delegation Patterns

Complex tasks are sometimes split across multiple, specialized agents rather than one general-purpose agent trying to do everything — directly the same reasoning behind splitting a monolith into microservices in the companion handbook (§12 there), now applied to AI agents. A **supervisor pattern** has one coordinating agent that delegates sub-tasks to specialized worker agents (a research agent, a writing agent, a fact-checking agent) and assembles their results — directly analogous to the companion handbook's Mediator pattern (§94.4 there), now mediating between agents instead of ordinary objects. **Delegation** is the general mechanism of one agent handing off a sub-task to another, whether via a supervisor or via direct agent-to-agent communication (§8.8).

### 8.7 MCP (Model Context Protocol) and A2A (Agent-to-Agent)

**MCP** is a standardized protocol for connecting a model/agent to external tools and data sources — solving the same integration-boundary problem the companion handbook's API contracts (§4.3 there) solve for ordinary services: rather than every agent framework needing custom, one-off integration code for every tool or data source, MCP defines a common interface, so a tool built once, as an "MCP server," can be used by any MCP-compatible agent, directly analogous to how a standardized API contract lets many different clients use the same service without custom integration work each time. **A2A (Agent-to-Agent)** is a complementary, emerging standard specifically for communication *between* agents (as opposed to between an agent and a tool) — addressing the multi-agent coordination problem from §8.6 with a standardized protocol rather than ad hoc, framework-specific inter-agent messaging.

### 8.8 Human-in-the-Loop: The Deliberate Off-Ramp

Given §8.2's warning that agent behavior is only as predictable as the underlying model, production agent systems deliberately insert **human-in-the-loop** checkpoints — pausing before a high-stakes or hard-to-reverse action (sending a real email, executing a financial transaction, deleting data) to require explicit human approval before proceeding. This is not a failure of automation — it is a deliberate, risk-proportional design choice, directly analogous to the companion handbook's load-shedding and circuit-breaker patterns (§99.4, §94.4 there): a system that could technically automate every step fully sometimes shouldn't, specifically because the cost of an autonomous mistake at that specific step is high enough to justify the friction of a human checkpoint.

### 8.9 Engineering Intuition

> **How do I know if I need an agent, or if a deterministic workflow is sufficient (and safer)?** If the sequence of steps needed to complete a task is knowable and fixed in advance, build a deterministic workflow (§8.2) — it is more testable, more predictable, and cheaper to run. Reach for a genuine agent only when the actual steps needed genuinely can't be known in advance and must be decided dynamically based on intermediate results.
>
> **What symptoms indicate an agent is a poor fit for a task that was forced into agentic form anyway?** A task that always follows the same 3-4 steps in the same order being implemented as a full agent loop — unnecessary latency, cost, and unpredictability for a problem a deterministic workflow would solve more reliably.
>
> **What would over-engineering look like here?** Building a multi-agent supervisor system (§8.6) for a task one well-designed single agent (or even a deterministic workflow) could handle directly — added coordination complexity and failure surface with no corresponding capability benefit.

### 8.10 Decision Tree: Agent, Deterministic Workflow, or Neither?

```
Can the full sequence of steps needed be specified in advance,
regardless of the specific input?
  YES -> Deterministic workflow (§8.2). Do not use an agent.
  NO  -> Does completing the task require calling real tools/
         APIs at all (not just generating text)?
    NO  -> Plain prompting (§7) with retrieval (§6) if needed --
           you don't need agent infrastructure at all.
    YES -> Is a SINGLE tool-calling loop (§8.3-8.4) sufficient,
           or does the task genuinely require coordinating
           several DIFFERENT specialized capabilities?
      SINGLE LOOP    -> A single agent (§8.3-8.5).
      MULTIPLE ROLES -> Multi-agent, supervisor pattern (§8.6).
  In all agent cases: does any tool call have a high-stakes,
  hard-to-reverse side effect?
    YES -> Add a human-in-the-loop checkpoint (§8.8) before
           that specific action, regardless of how confident
           the agent's reasoning appears.
```

### 8.11 Python Snippet: A Minimal Agent Loop

```python
# Demonstrates §8.3-8.4's core loop: the model decides whether
# to call a tool or give a final answer, and the loop continues
# until it chooses to stop -- the entire mechanical foundation
# of every agent framework, however elaborate.

def run_agent(user_request, tools, llm_client, max_steps=5):
    messages = [{"role": "user", "content": user_request}]
    for step in range(max_steps):
        response = llm_client.chat(messages, tools=tools)
        if response.tool_call is None:
            return response.content  # model chose to answer directly

        tool_name = response.tool_call.name
        tool_args = response.tool_call.arguments
        result = tools[tool_name](**tool_args)  # ACTUALLY execute it

        # feed the tool's result back in for the next reasoning step
        messages.append({"role": "assistant", "tool_call": response.tool_call})
        messages.append({"role": "tool", "content": str(result)})

    return "Max steps reached without a final answer."  # §36's
    # looping-forever failure mode, CONTAINED by max_steps -- this
    # single safeguard is why production agents always have one
```

### 8.12 Further Reading

- Yao et al., "ReAct" (2022) — already cited in §7.10, the direct foundation of the agent loop shown above.
- The Model Context Protocol (MCP) specification (Anthropic) and the Agent2Agent (A2A) protocol documentation (Google) — the authoritative, current references for §8.7.

---
