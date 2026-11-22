## 1. Claude API Fundamentals

### 1.1 The one endpoint [B]

Almost everything goes through **`POST /v1/messages`** (the Messages API). Tools, thinking, structured output, caching and streaming are *features of this request*, not separate APIs. Supporting endpoints feed into it: Message Batches, Files, Token Counting and Models.

```
Application ──HTTPS──► POST /v1/messages ──► Claude ──► response (content blocks + stop_reason + usage)
```

**Required in every request:** `model`, `max_tokens`, `messages`. Authentication is the `x-api-key` header (or OAuth bearer for console/CLI logins). The `anthropic-version` header is required on raw HTTP; the SDK sets it for you.

```python
client = anthropic.Anthropic()            # reads ANTHROPIC_API_KEY
resp = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    system="You are a terse SRE assistant.",
    messages=[{"role": "user", "content": "Explain a 529 error."}],
)
print(resp.content[0].text, resp.stop_reason, resp.usage)
```

### 1.2 Message structure [B]

- `system` is a **top-level parameter**, not a message in the array. It holds instructions, role and constraints.
- `messages` is a list of `{role: "user" | "assistant", content}`. `content` is a string or a list of **content blocks**: `text`, `image`, `document`, `tool_use`, `tool_result`, `thinking`.
- The conversation starts with a `user` turn and alternates. The final turn is normally `user`.
- **(version-dependent)** Older models allowed *prefill*: ending with a partial `assistant` turn to force a format, for example `{"`. On current models (4.6 and later) prefill returns a 400; use structured outputs or instructions instead. Newer models also accept `role: "system"` messages *inside* `messages` for mid-conversation operator instructions.

### 1.3 Stateless means stateless [B][C]

The API **remembers nothing between calls**. Each request must contain everything Claude should know: the system prompt, the full relevant history, tool definitions and tool results. "Conversation memory" is something *your application* stores and resends.

```
turn 1: [user1]                          → assistant1
turn 2: [user1, assistant1, user2]       → assistant2      (you resend history)
turn 3: [user1, a1, user2, a2, user3]    → assistant3      (input grows every turn)
```

Consequences: input tokens grow each turn (Chapter 4), the prefix is resent each time (that's why caching exists, Chapter 7), and you own session storage (Chapter 14).

### 1.4 Key request parameters [B]

| Parameter | What it does | Note |
|---|---|---|
| `max_tokens` | Hard cap on *output* tokens for this response | Hitting it gives `stop_reason: "max_tokens"` and truncated output. Not a budget the model plans around. |
| `temperature` / `top_p` / `top_k` | Sampling randomness | **(version-dependent)** Temperature runs 0–1, default 1.0, on models that accept it. The newest models reject non-default sampling parameters (400). Lower temperature means less random, **not** guaranteed deterministic. |
| `stop_sequences` | Strings that end generation | gives `stop_reason: "stop_sequence"` |
| `stream` | Server-sent events | See 1.6 |
| `tools`, `tool_choice` | Tool use | Chapter 5 |
| `thinking`, `output_config.effort` | Reasoning depth | Chapter 8 |
| `output_config.format` | Structured (JSON-schema) output | Chapter 3 |

**`stop_reason` values to recognize:** `end_turn` (natural finish), `max_tokens` (truncated), `stop_sequence`, `tool_use` (Claude wants your code to run a tool), `pause_turn` (a long server-tool turn paused; send it back to continue), and `refusal` (safety decline, still HTTP 200).

### 1.5 Tokens and usage [B]

`response.usage` reports `input_tokens`, `output_tokens`, `cache_creation_input_tokens` and `cache_read_input_tokens`. Output tokens cost about **5×** input tokens on current models, so verbose output is the expensive part. Thinking tokens are billed as **output**. Use `POST /v1/messages/count_tokens` to measure before sending. Don't use another vendor's tokenizer: tokenizers differ between Claude generations.

### 1.6 Streaming [B]

`stream=True` returns SSE events in this order: `message_start` → (`content_block_start` → `content_block_delta`… → `content_block_stop`) per block → `message_delta` (stop_reason, final usage) → `message_stop`. You may also see `ping` and `error` events.

Use streaming for chat UX (time-to-first-token) and for **large `max_tokens`**, which avoids HTTP timeouts. The SDKs effectively require it for very long outputs. Streaming doesn't make generation cheaper or the total faster; it changes *when* you see tokens. Errors can arrive *mid-stream* as an event after a 200 status, so handle them.

### 1.7 Errors, rate limits, retries [A→B]

| HTTP | `type` | Retry? |
|---|---|---|
| 400 | `invalid_request_error` | No: fix the request |
| 401 | `authentication_error` | No |
| 403 | `permission_error` | No |
| 404 | `not_found_error` (bad or unavailable model ID) | No |
| 413 | `request_too_large` | No: shrink it |
| 429 | `rate_limit_error` | Yes: honour `retry-after` |
| 500 | `api_error` | Yes, with backoff |
| 529 | `overloaded_error` | Yes, with backoff |

- Rate limits are per organization and model: requests per minute plus input and output tokens per minute. Response headers (`anthropic-ratelimit-*`, `retry-after`) tell you where you stand.
- The SDKs retry 408/409/429/5xx and connection errors (**2 retries by default**) with exponential backoff. Add jitter and a ceiling in your own retry layer.
- **Never retry 4xx validation errors.** They will fail identically.
- A **200 is not semantic success.** Always check `stop_reason`: `max_tokens` means truncated, and `refusal` means declined. Then validate the content (Chapter 12).

### 1.8 API vs Claude Code: what you must supply [B][C]

| You get… | Raw API | Claude Code |
|---|---|---|
| Conversation memory | You resend history | Session managed for you |
| File system / shell | None. Define tools and run them yourself | Built-in Read, Edit, Bash, Grep and more |
| Project instructions | You put them in `system` | `CLAUDE.md` auto-loaded |
| Skills | Only if you attach them (container + code execution) | Auto-discovered from `.claude/skills/` |
| Permissions | Your code decides | Permission rules and modes |
| Tool execution | **Your application** executes client tools | The harness executes built-in tools locally |

**Rule:** the API gives you a model; Claude Code gives you a model *plus a harness*. API tools are not automatically Claude Code tools, and Claude Code features (CLAUDE.md, slash commands, hooks) don't exist in a raw API call unless you rebuild them.

### Common Exam Traps

- The `system` prompt is a top-level field; there is no `"role": "system"` message in classic usage.
- `max_tokens` caps output only. It doesn't reduce input cost, and hitting it truncates.
- The API is stateless. "Claude forgot earlier messages" usually means *you didn't resend them*.
- Temperature 0 is *more consistent*, not guaranteed identical.
- HTTP 200 with `stop_reason: "refusal"` or `"max_tokens"` is not a successful task.
- 429/529 are retryable; 400/401/403/404 are not.
- Changing to a model ID that doesn't exist (or isn't available to your org) gives 404, not 400.

### Check Yourself

1. A chatbot "forgets" the user's name on turn 3. The system prompt is fine. What's the most likely cause?
2. Your summarizer returns half a summary and HTTP 200. Which field do you check and what does it say?
3. A batch job hits intermittent 529s. What should the client do?
4. A teammate's API script can't read the repository, but Claude Code can. Why?
5. Which three fields are mandatory in every Messages API request?

**Answers**

1. History isn't being resent. The API is stateless and the app must include prior turns.
2. `stop_reason == "max_tokens"`. Raise `max_tokens`, stream, or reduce requested output.
3. Retry with exponential backoff and jitter (it's overloaded and transient), capped, and alert if it persists.
4. The API has no built-in file tools. Claude Code is a harness with built-in Read/Grep/Bash tools; in the API you'd define and execute tools yourself.
5. `model`, `max_tokens`, `messages`.
