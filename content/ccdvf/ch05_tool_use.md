## 5. Tool Use (Function Calling)

### 5.1 The core idea [B][C]

A **tool** is a capability *you describe* to Claude: a name, a description and a JSON `input_schema`. **Claude never executes your tools.** It returns a request to call one; **your application executes it** and sends the result back.

```
App ──request(tools=[get_weather])──────────────► Claude
App ◄──stop_reason:"tool_use", content:[tool_use{id, name, input}]── Claude
App: validate input → run get_weather() → (permission/safety checks)
App ──request(history + assistant tool_use + user tool_result{tool_use_id})──► Claude
App ◄──stop_reason:"end_turn", final text──────────────────────── Claude
```

### 5.2 Defining a tool [B]

```python
tools = [{
  "name": "get_order",
  "description": "Fetch an order by ID. Use when the user asks about an order's status. "
                 "Returns status, items and ETA. Do not use for refunds.",
  "input_schema": {"type": "object",
                   "properties": {"order_id": {"type": "string"}},
                   "required": ["order_id"]},
  # "strict": True  -> guarantees input matches the schema (needs additionalProperties:false)
}]
```

**The description is the most important field.** It's how Claude decides *when* to call. Say what the tool does, when to use and not use it, and what it returns.

### 5.3 The loop in code [B]

```python
messages = [{"role": "user", "content": question}]
for _ in range(MAX_STEPS):                                   # always bound the loop
    r = client.messages.create(model=M, max_tokens=4096, tools=tools, messages=messages)
    messages.append({"role": "assistant", "content": r.content})   # append FULL content
    if r.stop_reason != "tool_use":
        break
    results = []
    for block in r.content:
        if block.type == "tool_use":
            try:
                out = run_tool(block.name, block.input)       # validate + authorize inside
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": out})
            except Exception as e:
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": str(e), "is_error": True})
    messages.append({"role": "user", "content": results})    # ALL results, ONE user message
```

Key rules:

- Append the assistant's **entire `content`**, including `tool_use` and any `thinking` blocks, not just the text.
- Every `tool_use` needs a matching `tool_result` with the same `tool_use_id` in the next user message.
- **Parallel tool calls:** one assistant turn may contain several `tool_use` blocks. Run them (concurrently if safe) and return **all results in a single user message**. Splitting them across messages degrades future parallelism.
- **Tool errors:** return `tool_result` with `is_error: true` and a useful message. Claude can recover (fix arguments, try another tool). Don't silently drop the result.

### 5.4 `tool_choice` [B][C]

| Value | Effect |
|---|---|
| `auto` (default) | Claude decides whether to call a tool |
| `any` | Must call *some* tool |
| `tool` (`{"type":"tool","name":…}`) | Must call that specific tool |
| `none` | No tool calls |

`disable_parallel_tool_use: true` limits Claude to at most one call per turn. **(version-dependent)** Forced choices (`any`/`tool`) are incompatible with extended thinking, and the newest models reject them entirely (400). On those, use `auto` with an instruction plus `strict: true`, or structured outputs.

### 5.5 Kinds of tools [B]

| Kind | Who executes | Examples |
|---|---|---|
| **Client (user-defined) tools** | Your app | `get_order`, `query_db` |
| **Anthropic-defined client tools** | Your app, but schema is built-in (declare by `type`) | bash, text editor, computer use, memory |
| **Server tools** | Anthropic's infrastructure; results come back in the same response | web search, web fetch, code execution |
| **MCP tools** | An MCP server, via a client (Ch. 11), or the API's MCP connector **(beta)** | GitHub, Jira servers |

### 5.6 Validation, permissions, safety [D]

- **Validate inputs** even with `strict` (business rules, allowed IDs, path traversal).
- **Authorize per user.** The model's request is not authorization; check that *this user* may access *this order*.
- **Classify tools by risk.** Read-only tools can auto-run; writes and irreversible actions (refunds, deletes, emails) need confirmation or human approval.
- **Treat tool results as untrusted input.** A fetched web page can carry injected instructions.
- **Termination:** max iterations, a token or cost budget, timeouts per tool, and a clear stop when `stop_reason != "tool_use"`.

### Common Exam Traps

- Claude doesn't run your tools; your app does. ("The model executed the SQL query" is a wrong option.)
- Tool definitions sent via the API aren't available in Claude Code, and vice versa.
- Missing `tool_result` for a `tool_use` id gives a 400 on the next request.
- Parallel results go in **one** user message.
- `is_error: true` is the way to report failures. Don't fabricate success.
- Descriptions drive tool selection; vague descriptions cause wrong or missing calls.
- `strict: true` guarantees schema shape, not business validity.

### Check Yourself

1. Claude returns two `tool_use` blocks in one response. How do you send results back?
2. A tool times out. What do you return so the agent can recover?
3. Claude keeps calling `search_docs` when it should call `get_order`. First fix?
4. Which component authorizes that the end user can view the order: Claude, the tool schema, or your tool implementation?
5. What signals that the loop should end?

**Answers**

1. Execute both, then append **one** user message containing two `tool_result` blocks, each with the matching `tool_use_id`.
2. A `tool_result` with `is_error: true` and an informative message ("timeout after 10s; try a narrower date range").
3. Improve the tool descriptions: when to use, when not to use, and what each returns.
4. Your tool implementation (application code). The model only requests.
5. `stop_reason` other than `tool_use` (usually `end_turn`), or your own guardrails: max steps, budget, timeout.
