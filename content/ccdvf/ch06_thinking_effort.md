## 6. Thinking (Extended Reasoning) and Effort

### 6.1 What it is [B]

**Extended thinking** lets Claude reason before answering. The reasoning arrives as **`thinking` content blocks** before the final `text` (or `tool_use`) blocks. It improves multi-step reasoning, math, planning, complex coding and agentic decisions, at the cost of extra **output tokens** (thinking is billed as output) and latency.

```
response.content = [
  {type: "thinking", thinking: "...", signature: "..."},   # reasoning (may be summarized or empty)
  {type: "text", text: "Final answer ..."}
]
```

### 6.2 Two generations of controls — know both (version-dependent) [B][C]

| Era | How you enable it | How you control depth |
|---|---|---|
| **Manual / budget** (Claude 3.7, 4.x before 4.6, Haiku 4.5) | `thinking: {type: "enabled", budget_tokens: N}` | `budget_tokens` (min 1024, must be < `max_tokens`) |
| **Adaptive** (4.6 and later; default on newest models) | `thinking: {type: "adaptive"}` (or on by default) | **`output_config.effort`**: `low` / `medium` / `high` / (`xhigh`) / `max` |

- **`output_config.effort`** is a behavioural dial for *how much effort Claude spends overall*. That includes thinking depth, number of tool calls, and verbosity. It lives **inside `output_config`**, not at the top level. The default is `high` on most current models **(Opus 5.5 defaults to `medium`)**.
- Lower effort means fewer tokens, faster, cheaper, and fewer and more consolidated tool calls. Higher effort means more thorough. It's a cost/quality trade-off within one model. Effort is advisory, unlike `max_tokens`, which is a hard cap.
- `budget_tokens` is deprecated on 4.6 and **rejected** (400) on the newest models. If an exam option says "set a thinking budget", it's testing the older mechanism; the principle (limit reasoning spend) maps to `effort` today.

```python
client.messages.create(
    model="claude-opus-5-5", max_tokens=16000,
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},
    messages=[...],
)
```

### 6.3 Visibility vs existence [B][C]

- On current models the **raw chain of thought is never returned**. `thinking.display` controls what you see: `"summarized"` gives a readable summary; `"omitted"` (the default on newest models) gives the block with empty text. **Thinking still happens and is still billed** either way.
- **`redacted_thinking`** blocks (older models) contain *encrypted* reasoning flagged by safety systems. You can't read them but **must pass them back unchanged**.
- The **`signature`** field verifies a block was produced by Claude. Modified blocks fail verification.

### 6.4 Returning thinking blocks correctly [B][C]

Rule: **when continuing a conversation, especially during tool use, pass the assistant's thinking (and redacted_thinking) blocks back exactly as received, in their original order.**

```
assistant: [thinking, tool_use]         ← append ALL of this, unmodified
user:      [tool_result]
assistant: [thinking?, text]            ← Claude continues reasoning from preserved state
```

- Dropping or editing thinking blocks in a tool-use loop breaks reasoning continuity and can give 400s (ordering or signature).
- **Interleaved thinking**: Claude thinks *between* tool calls. Adaptive thinking enables this automatically. On older models it needed a beta header **(version-dependent)**.
- **(version-dependent)** Older docs say previous turns' thinking blocks are stripped from context by the API (not counted against the window). Newest models bind thinking blocks to the producing model and conversation ("preserved thinking"). Edit history only by appending.

### 6.5 Constraints with thinking (version-dependent) [C]

- With thinking on, forced `tool_choice` (`any`/`tool`) isn't supported; use `auto`.
- Temperature and top_k changes aren't compatible with thinking, and current models reject sampling params entirely.
- Assistant prefill isn't supported with thinking (and not at all on 4.6+).
- Changing thinking settings mid-conversation invalidates cached message prefixes (Ch. 7).

### 6.6 When to use it

| Use thinking / higher effort | Skip it / low effort |
|---|---|
| Multi-step reasoning, math, architecture decisions | Classification, extraction, routing |
| Agentic coding and long-horizon tool use | Simple Q&A, chit-chat, formatting |
| Ambiguous problems where mistakes are costly | High-volume, latency-sensitive endpoints |
| Debugging, root-cause analysis | Subagents doing mechanical sub-tasks |

Measure: raise effort only where evals show a quality gain worth the cost. Judge **cost per completed task**, not per request.

### Common Exam Traps

- Thinking tokens are **output** tokens. They cost money even when hidden or summarized.
- `effort` lives in `output_config`; it isn't a top-level parameter and isn't `temperature`.
- `max_tokens` is a hard cap; `effort` and thinking budgets are guidance for spend. With the old API, `budget_tokens` < `max_tokens`.
- You must return thinking and redacted_thinking blocks unchanged in tool loops.
- `redacted_thinking` isn't an error; it's encrypted reasoning. Pass it back.
- Thinking improves reasoning quality; it doesn't give you access to raw internal reasoning.

### Check Yourself

1. A tool-use agent with thinking breaks after you "clean up" history by keeping only text and tool blocks. Why?
2. A latency-sensitive intent classifier is slow and expensive on a reasoning-heavy setup. What do you change first?
3. Where exactly is effort configured in the request?
4. Your UI shows a long pause before any text when streaming with thinking on a new model. Why, and what setting changes what the user sees?

**Answers**

1. Thinking blocks (with signatures) must be passed back unmodified with the tool_use turn. Removing them breaks continuity or validation.
2. Lower `output_config.effort` (`low`), or use a smaller model. Classification rarely benefits from deep reasoning.
3. `output_config: {"effort": "low" | "medium" | "high" | ...}`.
4. Thinking happens first and its display is omitted by default. Set `thinking.display: "summarized"` to stream a readable summary. Cost is unchanged.
