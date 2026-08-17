## 49. Nova Stage 6: Tools (Function/Tool Calling Introduced)

### 49.1 What Broke

Users ask Nova to do things RAG and memory cannot answer from static content at all — check a live order status, look up current weather, create a calendar event — anything requiring a real, live action or a real-time data source outside Nova's document corpus and memory store.

### 49.2 Why

§8.2 and §25.2 established that a model can only generate text describing what it would like to happen; it has no inherent ability to execute any real action — that capability must be explicitly built by the application, exposing specific, defined tools the model can request and the application executes on its behalf.

### 49.3 Candidates and Their Costs

**Option A — a small, fixed set of narrowly-scoped tools (e.g., `check_order_status`, `get_weather`):** Simple, predictable, easy to secure (§13.6, §30.6's least-privilege scoping applies naturally to a small, well-defined tool set). **Option B — a broad, general-purpose tool (e.g., `execute_code` or `run_sql_query`) providing maximum flexibility:** Far more capable in principle, but dramatically harder to secure — a general-purpose execution tool is a much larger attack surface (§13.6) for both accidental misuse and deliberate prompt injection targeting tool abuse.

### 49.4 Chosen Solution

Option A: a small, initial set of narrowly-scoped, purpose-built tools, each with a tightly-constrained argument schema (directly following §30.10's structural-constraint pattern) — no general-purpose execution tools at this stage. Tool definitions and their descriptions are added to Nova's prompt (§25.2's mechanism), positioned carefully relative to the existing cacheable prefix (§46.4) and RAG context (§47.9) to preserve as much prompt-caching benefit as the now more complex prompt structure allows.

### 49.5 What It Enabled

Nova can now take real, useful actions beyond answering questions from static or memory-retrieved content — directly expanding its value from "an assistant that answers questions" to "an assistant that gets things done," the necessary foundation for Stage 7's multi-tool orchestration and Stage 8's full agentic behavior.

### 49.6 The New Tradeoff This Introduced

Tool calling introduces an entirely new security surface (§13.6, §30.6) that didn't exist in Stages 1-5 at all — every tool added must be evaluated for least-privilege scoping and potential abuse, not just functional correctness. It also introduces a new latency source (tool execution time is now part of total response time, requiring its own tracing span, §31.2) and, critically, sets up the exact repetition/looping risk (§25.11, §36) that becomes acute once Stage 7-8 allow the model to chain multiple tool calls rather than just one per turn.

### 49.7 Engineering Intuition

> **Why start with narrow tools rather than one flexible, general-purpose tool?** A general-purpose tool (code/query execution) is dramatically harder to secure (§13.6) and its added flexibility isn't yet validated as necessary — narrow, purpose-built tools are the safer, sufficient starting point until a specific need for more general capability is demonstrated.

### 49.8 Decision Tree: Should a New Nova Capability Be a Tool?

```
Does the capability require a REAL action or REAL-TIME data
outside Nova's document corpus (§47) and memory (§48)?
  NO  -> This belongs in RAG or memory, not a new tool.
  YES -> Can it be scoped to a narrow, well-defined argument
         schema (§30.6)?
    YES -> Add as a new, narrowly-scoped tool (§49.4).
    NO (requires broad/general execution) -> Do NOT add yet --
         requires a dedicated security review and policy-engine
         design (§30.7) before introduction.
```

### 49.9 Python Snippet: A Narrowly-Scoped Tool Definition for Nova

```python
# Nova Stage 6: a narrow, schema-constrained tool -- §49.4's
# chosen approach, directly applying §30.6's structural
# least-privilege pattern.

check_order_status_tool = {
    "name": "check_order_status",
    "description": "Look up the status of a customer's order by order ID.",
    "parameters": {
        "type": "object",
        "properties": {
            "order_id": {"type": "string", "pattern": "^ORD-[0-9]{6}$"},
                          # schema-level constraint: only valid-shaped
                          # order IDs are even requestable (§30.6)
        },
        "required": ["order_id"],
    },
}

def execute_check_order_status(order_id, requesting_user_id):
    order = get_order(order_id)
    if order.owner_id != requesting_user_id:
        return {"error": "Not authorized to view this order."}
                # application-layer check -- NEVER trust the model's
                # own judgment for authorization (§25.2, §30.6)
    return {"status": order.status, "eta": order.eta}
```

### 49.10 Further Reading

- §25.2 (Tool/Function Calling), §30.6 (Tool Abuse Mitigation) — the direct mechanisms this stage introduces.

---
