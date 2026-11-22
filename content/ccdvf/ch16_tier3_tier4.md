## 16. Secondary Topics (Tier 3 and Tier 4): Recognition Only

Learn these after Tiers 1–2 are solid. Aim to *recognize* them, not memorize them.

### 16.1 Claude Code deeper features [B]

- **Hooks:** shell commands (or prompt/agent hooks) configured in `settings.json` on events: `PreToolUse` (can **block** a tool call), `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `SessionStart`, `PreCompact`, `Notification`. Deterministic enforcement. `/hooks` manages them.
- **Subagents:** `.claude/agents/<name>.md` with frontmatter (`name`, `description`, `tools`, `model`). Each has its own context window. Built-ins include Explore and Plan. A skill with `context: fork` also runs in an isolated subagent **(version-dependent)**.
- **Custom commands:** the legacy `.claude/commands/*.md`, now merged into skills; `$ARGUMENTS` substitution.
- **MCP in Claude Code:** `claude mcp add`; scopes local, project (`.mcp.json`, shared) and user.
- **Advanced permissions:** rule specifiers like `Bash(git *)`, `Read(./secrets/**)`, `WebFetch(domain:example.com)`; deny > ask > allow; managed settings can lock policy for enterprises.
- **Plugins:** bundles of skills, agents, hooks and MCP servers installed from marketplaces.

### 16.2 API details [B]

- **Streaming events:** `message_start`, `content_block_start/delta/stop` (delta types `text_delta`, `input_json_delta`, `thinking_delta`, `signature_delta`), `message_delta`, `message_stop`, `ping`, `error`.
- **Less-common parameters:** `stop_sequences`, `metadata.user_id` (abuse tracking), `service_tier`, `top_k`, `inference_geo` **(version-dependent)**.
- **Token accounting:** total input = `input_tokens` + `cache_creation_input_tokens` + `cache_read_input_tokens`. `count_tokens` is free to call but rate-limited.
- **Content-block edge cases:** the order of thinking → tool_use must be preserved; `tool_result` blocks come first in their user message; images and documents go before text for best results; PDFs via base64 or the Files API; citations on document blocks.
- **Errors:** `request_too_large` (413), `overloaded_error` (529), and errors mid-stream after a 200.

### 16.3 Agents [B]

- **Delegation and handoffs:** an orchestrator passes a self-contained brief and the subagent returns a compact result; handoffs transfer ownership with state.
- **State machines:** explicit states (plan → act → verify → done) with allowed transitions. These make agents testable.
- **Complex multi-agent:** parallel researchers plus a synthesizer, or debate and critique patterns. Higher token cost; use them only when tasks are parallelizable.

### 16.4 MCP [B]

- **Sampling details:** the server sends `sampling/createMessage`; the client may show or modify it, and the user approves. Model preferences are hints only.
- **Resource subscriptions:** clients subscribe to resource URIs and receive `updated` notifications; `list_changed` notifications cover tools, resources and prompts.
- **Transports:** stdio (local) and Streamable HTTP (remote; replaced HTTP+SSE).
- **Authorization:** OAuth 2.1-based flow for HTTP transports; stdio uses environment credentials.

### 16.5 Evaluation (advanced) [A]

- **Pairwise evaluation:** the judge compares A vs B. More reliable than absolute scores; swap positions to cancel position bias.
- **Statistical evaluation:** enough samples, confidence intervals, and multiple runs per item for non-deterministic outputs.
- **Evaluator bias:** position, verbosity, self-preference. Calibrate with human labels.
- **Benchmark design:** representative, held-out and versioned; avoid contamination.

### 16.6 Tier 4 terms to recognize [B]

| Term | One-liner |
|---|---|
| Console / Claude Platform | Web UI for keys, workbench, usage, workspaces |
| Workspaces | Org sub-partitions for keys, limits and spend |
| Admin API | Org management (keys, members, usage/cost reports) with admin keys |
| Message Batches | Async bulk processing at 50% cost |
| Files API | Upload once, reference by `file_id` |
| Citations | Responses cite exact passages of supplied documents |
| Computer use | Anthropic-defined tool for screen, mouse and keyboard control |
| Text editor / bash tools | Anthropic-defined schema-less client tools |
| Memory tool | Client-side file-based memory the model reads and writes across sessions |
| Tool search | Defer-load large tool catalogues; Claude searches for tools on demand |
| Zero data retention (ZDR) | Contractual no-retention option; availability varies by model |
| Priority Tier | Capacity commitment for higher availability (not on every model) |
| Legacy prefill | Older technique of starting the assistant turn; removed on 4.6+ |
| Legacy `budget_tokens` | Older thinking-budget control; replaced by adaptive thinking plus effort |
| Text Completions API | Legacy pre-Messages API (`\n\nHuman:` format), retired |
