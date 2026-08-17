## §86. Tool Calling, Agents, and Human-in-the-Loop

### 1. The Vocabulary

- **Tool/function calling** — the model, instead of just generating text, can request that a
  specific defined function be called with specific arguments, and receive the result back into
  its context.
- **Agent / agent loop** — a model that repeatedly calls tools, observes results, and decides the
  next action, working toward a goal across multiple steps rather than a single response.
- **Human-in-the-loop** — requiring explicit human approval before an agent's action actually
  takes effect, especially for anything consequential or hard to reverse.
- **Model routing** — sending different requests to different models (a cheaper/faster model for
  simple cases, a more capable one for complex cases) rather than always using the same model.

### 2. Where It Sits, and Why Teams Use It

Tool calling and agents are what let a model actually *do* things (look something up, modify a
record, call an API) rather than just describe what it thinks should happen — which is powerful,
and also exactly where the stakes of a mistake go up.

### 3. What Actually Breaks

- **An agent stuck in a loop** — calling the same tool repeatedly without making progress toward
  the actual goal, often because it's misinterpreting a tool's result or the goal was ambiguous;
  a real, common debugging scenario for agent-based systems, usually needing a max-iteration
  limit as a safety net regardless of the underlying cause.
- **No human-in-the-loop for consequential actions** — an agent that can autonomously send money,
  delete data, or send external communications with no approval step is one hallucination or
  misinterpretation away from a real, hard-to-reverse mistake.
- **Tool definitions that are ambiguous or overlapping** — if the model can't clearly tell which
  of several similar tools to use for a given situation, it can pick the wrong one, or waste steps
  clarifying.
- **No limit on tool-calling cost/depth** — an agent looping through expensive tool calls (each
  one possibly itself an LLM call, or a paid API) with no cap can rack up real cost quickly if
  something goes wrong.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I put a hard iteration/step limit on any agent loop, specifically to catch the 'stuck in a
  loop making no progress' failure mode."
- "Anything consequential or hard to reverse gets a human-in-the-loop approval step before an
  agent's action actually takes effect."
- "I design tool definitions to be as unambiguous as possible, since overlapping or unclear tools
  are a common source of an agent picking the wrong one."

### 5. Interview-Ready Answer

> "Tool calling is what lets a model take real action instead of just describing what should
> happen, which raises the stakes of a mistake accordingly. The two safety mechanisms I'd always
> want in an agent system: a hard limit on iterations or steps, since agents getting stuck
> repeating an action without making progress is a real, common failure mode, and a human-in-the-
> loop approval step for anything consequential or hard to reverse, so a hallucination or
> misinterpretation can't directly cause an irreversible real-world action."

### 6. Go Deeper

companion AI Systems Handbook's §25 (Agent Mechanics: tool calling, memory, MCP, A2A) chapter and
companion AI Systems Handbook's §36 (Production Agent Reliability Engineering) chapter (agent loop
design, model routing in full depth).

---
