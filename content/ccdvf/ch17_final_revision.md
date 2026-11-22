## 17. Final Revision Kit

### 17.1 CCDV-F Final Revision Sheet

**API**
- `POST /v1/messages`; required: `model`, `max_tokens`, `messages`. `system` is top-level. **Stateless**: resend history.
- `stop_reason`: `end_turn`, `max_tokens` (truncated), `stop_sequence`, `tool_use`, `pause_turn`, `refusal`. HTTP 200 ≠ success.
- Retry 429 (honour `retry-after`), 500 and 529 with backoff and jitter. Never retry 400/401/403/404/413.
- Usage: `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`. Output costs about 5× input; thinking bills as output.

**Prompting and structure**
- Instructions in `system`; long docs first, question last; XML tags; 3–5 diverse examples.
- Structured outputs: `output_config.format` (JSON schema); `strict: true` for tool inputs. `required` = present; `enum` = allowed values. Schema-valid ≠ correct, so validate semantics.

**Context**
- Context doesn't forget; it accumulates until you prune, compact, clear or retrieve. Compaction summarizes; context editing clears; caching reuses.

**Tools**
- Claude requests; **your app executes**. Return `tool_result` with matching `tool_use_id`; all parallel results in **one** user message; `is_error: true` on failure. Bound the loop.

**Thinking and effort**
- Thinking blocks come before the answer; pass them back **unchanged** in tool loops (including `redacted_thinking`). Old: `budget_tokens` (≥1024, < `max_tokens`). New: `thinking: {type: "adaptive"}` + `output_config.effort` (`low`…`max`). Hidden or summarized thinking is still billed.

**Caching**
- Prefix match over `tools → system → messages`; `cache_control` breakpoints (max 4); TTL 5 min default (1 h option), refreshed on hits. Writes 1.25× (2× for 1h), reads ~0.1×. Below the minimum length there's no cache and no error. Timestamps or a changed tool list in the prefix mean misses.

**Agents**
- Workflow = code-defined steps; agent = model-directed loop. Use an agent only when complexity, value, viability and recoverability all justify it. Guardrails: max steps, budget, timeouts, approvals.

**Claude Code**
- Harness with built-in tools, permissions, CLAUDE.md (context), skills (`SKILL.md`, on-demand by description or `/name`), subagents (own context), hooks (deterministic enforcement), MCP. API ≠ Claude Code.

**MCP**
- Host (consent, LLM, policy) → client (1 per server) → server (executes tools, talks to the external system). Tools: model-controlled; resources: app-controlled; prompts: user-controlled. Sampling = server asks host for a completion.

**Models**
- Haiku (fast, cheap) / Sonnet (balanced) / Opus (most capable). Alias can move; snapshot is frozen. Pinning doesn't stop deprecation or retirement. Migrate with a frozen regression set, canary and rollback.

### 17.2 Claude-Specific Things I Must Not Confuse

| This | vs | That |
|---|---|---|
| Claude API (you run everything) | | Claude Code (harness with built-in tools) |
| Tool Runner (SDK loop helper) | | Claude Agent SDK (Claude Code as a library) |
| Agent SDK (you host) | | Managed Agents (Anthropic hosts loop and sandbox) |
| CLAUDE.md (always-on context) | | Skill (on-demand procedure) |
| Skill | | Subagent (separate context window) |
| CLAUDE.md / prompt (advisory) | | Hook / permission rule (enforced) |
| `.claude/rules/` with `paths` (scoped instructions) | | Skills (invoked procedures) |
| `required` (presence) | | `enum` (allowed values) |
| Schema-valid | | Semantically correct |
| `max_tokens` (hard output cap) | | `effort` / `budget_tokens` (reasoning spend) |
| Compaction (summarize) | | Context editing (clear) / caching (reuse) |
| Cache write (1.25×/2×) | | Cache read (~0.1×) |
| Deprecated (still works) | | Retired (fails) |
| Alias (moves) | | Pinned snapshot (frozen until retirement) |
| MCP server (executes) | | MCP host (consent, model) / client (connection) |
| MCP tools (model-controlled) | | Resources (app) / Prompts (user) |
| Sampling (server → host LLM) | | Tool call (model → server) |
| Client tools (you execute) | | Server tools (Anthropic executes) |
| `thinking` block | | `redacted_thinking` (encrypted; pass back anyway) |
| Streaming (earlier tokens) | | Batch (cheaper, async) |

### 17.3 Exam Decision Rules

- Same large prompt or tools resent every call, and cost or latency is high → **prompt caching** (stable content before the breakpoint).
- Cache hit rate is 0 → look for **dynamic content in the prefix**, tool-order changes, model switches, or a prefix below the minimum.
- Agent slows down and forgets constraints over many turns → **context accumulation**: compaction, clearing tool results, subagents, constraints in system.
- Output must be machine-parsed → **structured outputs / strict tools**, plus **semantic validation**.
- Response is 200 but the data is wrong → **silent failure**: add semantic checks, `stop_reason` checks, evals.
- Steps are known in advance → **workflow**, not an agent.
- Irreversible action → **human approval** plus least privilege.
- Retrieved or tool content contains instructions → **indirect prompt injection**: treat as data, limit privileges, validate.
- "Must always/never happen" in Claude Code → **hook or permission rule**, not CLAUDE.md.
- Reusable multi-step procedure in Claude Code → **skill**. Noisy exploration → **subagent**. External system → **MCP server**.
- Who executes a tool? → **your application** (client tools) or the **MCP server**. Never the model.
- Who asks the user for consent in MCP? → **host**.
- Model behaviour changed without a deploy → **alias moved**: pin snapshots.
- Deprecation notice → **regression test the replacement, canary, roll out before retirement**. Pinning isn't a fix.
- Need deeper reasoning → **thinking / higher effort**. Need cheap and fast → **lower effort, smaller model**.
- Thinking plus tools gives errors → you **modified or dropped thinking blocks**.
- 429 or 529 → **backoff and retry**. 400 → **fix the request**.
- Bulk offline jobs → **Batch API**. Interactive UX → **streaming**.
- "Data must stay in our network" → **customer-executed tools or a self-hosted harness**.

### 17.4 Last-Day Checklist

- [ ] Re-read 17.1 and 17.2 twice.
- [ ] Draw the tool-use loop from memory (`tool_use` → execute → `tool_result` with id → continue).
- [ ] Draw the MCP host / client / server boxes and say what each owns.
- [ ] Recite cache facts: order, breakpoints (4), TTL (5 m / 1 h), write 1.25×/2×, read ~0.1×, minimum length.
- [ ] Recite thinking facts: pass blocks back unchanged; `effort` inside `output_config`; thinking billed as output; old `budget_tokens` vs adaptive.
- [ ] Claude Code: CLAUDE.md scopes, skills (SKILL.md, description, `/name`), subagents, hooks, permissions.
- [ ] Model lifecycle: alias vs snapshot; deprecated vs retired; migration steps.
- [ ] Structured output: `required` vs `enum`; semantic validation.
- [ ] Redo every Check Yourself question you got wrong.
- [ ] Sleep. Read each question's *requirement* sentence twice. Eliminate options that make the model execute tools or enforce security.

### 17.5 Weakness Tracker

Mark each column as you progress: Not learned → Learned → Can explain → Can answer scenarios → Exam ready.

| Concept | Not learned | Learned | Can explain | Scenarios | Exam ready |
|---|---|---|---|---|---|
| Messages API structure & stateless calls | [ ] | [ ] | [ ] | [ ] | [ ] |
| `stop_reason`, errors, retries, rate limits | [ ] | [ ] | [ ] | [ ] | [ ] |
| API vs Claude Code capabilities | [ ] | [ ] | [ ] | [ ] | [ ] |
| System vs user prompt, few-shot, long context | [ ] | [ ] | [ ] | [ ] | [ ] |
| Prompt injection (direct/indirect) | [ ] | [ ] | [ ] | [ ] | [ ] |
| Structured output, `required` vs `enum` | [ ] | [ ] | [ ] | [ ] | [ ] |
| Semantic validation & silent failures | [ ] | [ ] | [ ] | [ ] | [ ] |
| Context accumulation & management | [ ] | [ ] | [ ] | [ ] | [ ] |
| Tool-use loop, parallel calls, tool errors | [ ] | [ ] | [ ] | [ ] | [ ] |
| Agents vs workflows, guardrails, termination | [ ] | [ ] | [ ] | [ ] | [ ] |
| Claude Code: CLAUDE.md & rules | [ ] | [ ] | [ ] | [ ] | [ ] |
| Skills & SKILL.md | [ ] | [ ] | [ ] | [ ] | [ ] |
| Skills vs subagents vs hooks | [ ] | [ ] | [ ] | [ ] | [ ] |
| Claude Code permissions | [ ] | [ ] | [ ] | [ ] | [ ] |
| Model selection (Haiku/Sonnet/Opus) | [ ] | [ ] | [ ] | [ ] | [ ] |
| Aliases, pinning, deprecation, retirement | [ ] | [ ] | [ ] | [ ] | [ ] |
| Safe migration & regression testing | [ ] | [ ] | [ ] | [ ] | [ ] |
| Thinking blocks & returning them | [ ] | [ ] | [ ] | [ ] | [ ] |
| `output_config.effort` vs `budget_tokens` | [ ] | [ ] | [ ] | [ ] | [ ] |
| Prompt caching mechanics & invalidation | [ ] | [ ] | [ ] | [ ] | [ ] |
| Cache cost & TTL | [ ] | [ ] | [ ] | [ ] | [ ] |
| Evals, golden sets, LLM-as-judge | [ ] | [ ] | [ ] | [ ] | [ ] |
| MCP roles (host/client/server) | [ ] | [ ] | [ ] | [ ] | [ ] |
| MCP primitives & sampling | [ ] | [ ] | [ ] | [ ] | [ ] |
| Security: least privilege, AuthN vs AuthZ | [ ] | [ ] | [ ] | [ ] | [ ] |
| Production architecture & cost levers | [ ] | [ ] | [ ] | [ ] | [ ] |
| Deployment patterns & responsibility boundaries | [ ] | [ ] | [ ] | [ ] | [ ] |
