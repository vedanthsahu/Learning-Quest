## 8. Agents and Workflows

### 8.1 Workflow vs agent [B][C]

Anthropic's framing (from "Building effective agents"):

| | **Workflow** | **Agent** |
|---|---|---|
| Control flow | **Your code** defines the steps (predefined paths) | **The model** decides the next step dynamically |
| Predictability | High; easy to test | Lower; needs guardrails |
| Cost and latency | Bounded | Variable, often higher |
| Best for | Well-defined, repeatable tasks | Open-ended tasks where steps can't be known in advance |

**Start with the simplest thing that works**: a single call, then a workflow, and an agent only when necessary.

Common workflow patterns: **prompt chaining** (step A's output feeds step B, with gates between), **routing** (classify and send to a specialized prompt or model), **parallelization** (sectioning or voting), **orchestrator–workers** (a lead call splits the task and workers handle the parts), and **evaluator–optimizer** (generate, critique, revise).

### 8.2 The agent loop [B]

```
User goal
  → model plans / reasons (thinking)
  → tool_use  ──► app executes tool (validated, authorized)
  → observation (tool_result)  ──► back into context
  → model decides: another tool? ask human? finish?
  → termination: end_turn | max steps | budget | timeout | human stop
```

An agent is just **tool use in a loop with state**. The API pieces are the same as Chapter 5.

### 8.3 When an agent is appropriate

Check all four:

1. **Complexity**: multi-step and hard to specify in advance?
2. **Value**: does the outcome justify the extra cost and latency?
3. **Viability**: is Claude good at this task type?
4. **Cost of error**: can mistakes be detected and recovered (tests, review, rollback)?

If any answer is no, use a workflow or a single call.

### 8.4 Guardrails and termination [D]

- **Max iterations** and **token or cost budget**. (A task budget beta lets the model *pace itself*, which is different from `max_tokens`. **(version-dependent)**)
- **Timeouts** per tool and per run.
- **Least-privilege tools**, with destructive tools behind approval.
- **Human-in-the-loop** checkpoints for irreversible or high-impact actions (payments, deploys, emails to customers).
- **Stop conditions** the model knows about: "If you can't find the data after 3 searches, report what's missing."
- **Loop detection**: the same tool with the same arguments repeated means stop or escalate.

### 8.5 State management [D]

- Conversation state (messages) is your responsibility in the API.
- Keep **durable task state outside the context** (DB, files, todo lists) so you can resume after crashes and survive compaction.
- Idempotent tools allow safe retries.

### 8.6 Orchestration and multi-agent [B]

- **Orchestrator–subagent**: a lead agent delegates to subagents with **separate contexts**. Each returns a condensed result. This parallelizes work and protects the lead's context from noise. The costs are more tokens overall and coordination overhead.
- Pass subagents **everything they need explicitly**. They don't share the lead's history.
- Use cheaper models or lower effort for mechanical subagents.

### 8.7 Where you build it (preview of Ch. 15)

| Option | Loop run by | Tools run by |
|---|---|---|
| Manual loop on the Messages API | You | You |
| SDK **Tool Runner** (beta helper in the Anthropic SDK) | SDK, in your process | You |
| **Claude Agent SDK** (Claude Code as a library) | SDK harness, in your infra | Built-in tools in your infra plus yours |
| **Managed Agents** (Anthropic-hosted) | Anthropic | Anthropic-hosted sandbox, plus your custom tools |

### Common Exam Traps

- "Use an autonomous agent" is often the wrong answer when the steps are known; prefer a workflow.
- Every agent needs explicit termination. Relying on the model to stop on its own isn't a guardrail.
- Subagents don't inherit the parent's conversation automatically.
- More agents doesn't mean better results: multi-agent adds cost and coordination failure modes.
- Human-in-the-loop belongs before **irreversible** actions, not on every read.

### Check Yourself

1. Invoices always go: extract fields → validate → post to ERP. Agent or workflow?
2. An agent loops calling `search` with identical arguments 30 times. Which guardrails were missing?
3. A research agent's main context fills with raw web pages. Architectural fix?
4. Name the four criteria for choosing an agent.

**Answers**

1. Workflow (prompt chain plus code validation). The steps are known.
2. Max iterations or budget, and repeated-call detection; arguably a better stop condition in the prompt too.
3. Delegate reading to subagents that return summaries (or clear old tool results or compact).
4. Complexity, value, viability, cost of error.
