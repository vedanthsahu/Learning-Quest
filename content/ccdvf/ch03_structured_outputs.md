## 3. Structured Outputs, Schemas and Validation

### 3.1 Three levels of "give me JSON" [B]

| Level | How | Guarantee |
|---|---|---|
| 1. Ask | "Return JSON with keys a, b" in the prompt | Usually right; can drift (extra prose, wrong keys) |
| 2. Schema-constrained response | `output_config.format` with a JSON schema | Response **parses and matches the schema** |
| 3. Strict tool input | `strict: true` on a tool definition | `tool_use.input` matches the tool's `input_schema` exactly |

```python
resp = client.messages.create(
    model="claude-opus-5-5", max_tokens=1024,
    messages=[{"role": "user", "content": ticket_text}],
    output_config={"format": {"type": "json_schema", "schema": {
        "type": "object",
        "properties": {
            "severity": {"type": "string", "enum": ["low", "medium", "high"]},
            "summary":  {"type": "string"},
            "owner":    {"type": "string"}
        },
        "required": ["severity", "summary"],
        "additionalProperties": False
    }}},
)
```

**(version-dependent)** Older docs and SDKs used a top-level `output_format` parameter; it's deprecated in favour of `output_config.format`. The SDK helper `client.messages.parse()` validates into a Pydantic or Zod model for you. Strict tools need `additionalProperties: false` and `required`.

### 3.2 Schema keywords that get tested [C]

| Keyword | Means | Does **not** mean |
|---|---|---|
| `required` | The field **must be present** | That the value is sensible or non-empty |
| `enum` | The value must be one of the listed values | That the field is present (that's `required`) |
| `type` | JSON type of the value | Business validity |
| optional field | Listed in `properties`, not in `required` | That the model will usually fill it |
| `additionalProperties: false` | No undeclared keys | — |

Some JSON Schema constraints aren't supported in constrained decoding **(version-dependent)**. The Python and TypeScript SDKs strip unsupported constraints and validate them client-side. Don't assume every JSON Schema feature is enforced server-side.

### 3.3 Syntactic vs semantic validity [C][D]

Schema conformance proves the **shape**. It doesn't prove the **meaning**.

```
{"severity": "low", "summary": "Database is down for all customers"}   ← valid JSON, valid enum, WRONG
```

You still need **semantic validation**:

- Business rules in code (for example "if summary mentions outage then severity can't be low", amount ≥ 0, IDs exist in your DB).
- Cross-field consistency and referential checks.
- Spot checks or an LLM-as-judge on samples (Chapter 12).

These are **silent failures**: everything returns 200 and parses, and the data is wrong.

### 3.4 Retry and repair strategy [D]

```
call → parse → schema valid? ─no─► (rare with constrained output) retry once with error text
                     │yes
                     ▼
            semantic checks pass? ─no─► re-ask with the specific violation ("severity must be high
                     │yes                   when summary mentions outage") or route to human
                     ▼
                  accept
```

Bound retries (one or two) and log every repair. A rising repair rate is a regression signal. Also check `stop_reason`: a `max_tokens` cut can leave JSON incomplete.

### 3.5 When to use which

- **Structured output**: machine-consumed results such as extraction, classification, routing and API payloads.
- **Plain text**: human-facing prose, open explanations, creative work. Forcing JSON there adds cost and hurts quality.
- **Tool use vs structured output**: use a tool when Claude should *decide whether* to act or call a function. Use `output_config.format` when you just want the final answer in a shape.
- Structured outputs are **(version-dependent)** incompatible with some features. For example, citations can't be combined with `output_config.format`.

### Common Exam Traps

- `required` = presence; `enum` = allowed values. They don't substitute for each other.
- Schema-valid output can still be semantically wrong. Validate business rules.
- A successful HTTP response doesn't mean semantic success.
- Prompting "return JSON" isn't a guarantee; schema-constrained output is.
- Retrying without telling the model *what* was wrong rarely fixes semantic errors.
