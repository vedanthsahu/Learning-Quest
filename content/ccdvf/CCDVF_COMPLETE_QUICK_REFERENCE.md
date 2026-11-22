# Claude Certified Developer – Foundations (CCDV-F)

## Complete Quick Reference

> A point-form revision guide created from the CCDV-F handbook and its five mock-exam sets. Use it to recall facts, distinguish similar concepts, and choose the right answer in scenario questions. Version-dependent facts reflect the source material as of October 2026; verify live documentation when implementing them in production.

## Contents

1. [Exam at a Glance](#1-exam-at-a-glance)
2. [The Claude Ecosystem in One Mental Model](#2-the-claude-ecosystem-in-one-mental-model)
3. [Messages API Fundamentals](#3-messages-api-fundamentals)
4. [Prompt Engineering](#4-prompt-engineering)
5. [Structured Outputs and Validation](#5-structured-outputs-and-validation)
6. [Context Engineering](#6-context-engineering)
7. [Tool Use / Function Calling](#7-tool-use--function-calling)
8. [Thinking and Effort](#8-thinking-and-effort)
9. [Prompt Caching](#9-prompt-caching)
10. [Agents and Workflows](#10-agents-and-workflows)
11. [Claude Code](#11-claude-code)
12. [Model Context Protocol](#12-model-context-protocol-mcp)
13. [Model Selection, Lifecycle, and Migration](#13-model-selection-lifecycle-and-migration)
14. [Evaluation, Testing, and Debugging](#14-evaluation-testing-and-debugging)
15. [Security and Safety](#15-security-and-safety)
16. [Production Architecture, Cost, and Performance](#16-production-architecture-cost-and-performance)
17. [Deployment Patterns and Responsibility Boundaries](#17-deployment-patterns-and-responsibility-boundaries)
18. [Secondary Features to Recognize](#18-secondary-features-to-recognize)
19. [High-Value Distinctions to Memorize](#19-high-value-distinctions-to-memorize)
20. [Scenario-to-Answer Decision Rules](#20-scenario-to-answer-decision-rules)
21. [Last-Day Recall Sheet](#21-last-day-recall-sheet)
22. [Recommended Practice Plan](#22-recommended-practice-plan)

---

## 1. Exam at a Glance

- Exam: **Claude Certified Developer – Foundations (CCDV-F)**.
- Practice-paper format in this course:
  - 53 questions.
  - 120 minutes.
  - Scenario-based questions.
  - Single-answer and multiple-response questions.
  - Multiple-response questions are all-or-nothing.
- Reported score range: 100–1000.
- Passing score: **720**.
- Raw-to-scaled conversion is not published; the mocks estimate 72% raw as 720.
- Safe preparation target: **80% or higher** on timed mocks.

### Domain weighting

| Domain | Weight | Approx. questions in each mock |
|---|---:|---:|
| Applications and Integration | 33.1% | 17 |
| Model Selection and Optimization | 16.8% | 9 |
| Agents and Workflows | 14.7% | 8 |
| Prompt and Context Engineering | 11.0% | 6 |
| Tools and MCPs | 10.6% | 6 |
| Security and Safety | 8.1% | 4 |
| Claude Code | 3.1% | 2 |
| Evaluation, Testing, and Debugging | 2.6% | 1 |

### How to think during the exam

- Read the requirement sentence twice: is the priority quality, latency, cost, enforcement, privacy, or data location?
- Prefer the **simplest solution that fully meets the requirement**.
- Known, repeatable steps usually mean a workflow, not an agent.
- “Always,” “never,” “guarantee,” and “must block” usually require code, permissions, or hooks—not prompt wording.
- The model requests actions; it does not execute client tools or authorize users.
- A technically valid response can still be wrong; always distinguish transport, syntax, and semantic success.
- Eliminate answers that add unnecessary agents, infrastructure, or model size.
- Answer every question; unanswered questions are wrong and guessing has no additional penalty.

---

## 2. The Claude Ecosystem in One Mental Model

- **Claude API** gives your application access to the model.
  - Your application stores conversation state.
  - Your application runs the loop.
  - Your application executes client tools.
  - Your application implements authorization, validation, retries, and observability.
- **Claude Code** is a coding-agent harness around Claude.
  - It supplies built-in file, shell, search, git, permission, context, skill, hook, subagent, and MCP capabilities.
- **Tool use** lets Claude request an action through a declared schema.
- **Agents** are tool-use loops in which the model dynamically chooses the next step.
- **Workflows** are predetermined sequences controlled by code.
- **MCP** standardizes how AI hosts connect to external tools, resources, and prompts.
- **Prompt engineering** controls the instructions and task framing.
- **Context engineering** controls what information is supplied and retained.
- **Prompt caching** reuses an unchanged input prefix to lower input cost and latency.
- **Structured outputs** constrain the final response or tool input to a JSON schema.
- **Thinking/effort** controls reasoning depth and overall work.
- **Evaluations** establish whether a model, prompt, tool loop, or migration meets measurable quality requirements.

---

## 3. Messages API Fundamentals

### Core request

- Primary endpoint: **`POST /v1/messages`**.
- Required request fields:
  - `model`
  - `max_tokens`
  - `messages`
- `system` is traditionally a **top-level request field**, not a normal entry in `messages`.
- Raw HTTP requires:
  - `x-api-key`
  - `anthropic-version`
- Anthropic SDKs normally set the version header and read `ANTHROPIC_API_KEY`.
- Supporting endpoints/features include:
  - Message Batches
  - Files API
  - Token Counting
  - Models API

### Message structure

- `messages` contains alternating `user` and `assistant` turns.
- A turn’s `content` can be a string or content blocks.
- Important content-block types:
  - `text`
  - `image`
  - `document`
  - `tool_use`
  - `tool_result`
  - `thinking`
  - Legacy `redacted_thinking`
- Conversations normally begin with a user turn and the current request normally ends with a user turn.
- Older models supported assistant prefill to force an opening such as `{`.
- Models 4.6 and later reject assistant prefill; use instructions or structured outputs.
- Newer versions can support operator/system messages inside the message history, but classic exam questions usually expect top-level `system`.

### Statelessness

- The Messages API remembers **nothing** between requests.
- For every new call, resend everything Claude still needs:
  - System instructions.
  - Relevant conversation history.
  - Tool definitions.
  - Tool-use blocks and their results.
- Conversation memory is an application feature, not automatic API memory.
- Consequences of resending history:
  - Input grows with each turn.
  - Cost and latency grow.
  - Long sessions require pruning, retrieval, or compaction.
  - Stable repeated prefixes are good candidates for caching.

### Important request parameters

- `max_tokens`
  - Hard cap on output tokens for that response.
  - Does not cap input tokens.
  - Does not tell the model how to plan its work.
  - If reached, the response is truncated and `stop_reason` is `max_tokens`.
- `temperature`, `top_p`, `top_k`
  - Sampling controls on models that accept them.
  - Lower temperature is less random, not deterministic.
  - Newest models may reject non-default sampling parameters.
- `stop_sequences`
  - Ends generation when a configured string appears.
  - Produces `stop_reason: "stop_sequence"`.
- `stream`
  - Enables Server-Sent Events.
- `tools` and `tool_choice`
  - Declare tools and influence whether Claude uses them.
- `thinking` and `output_config.effort`
  - Control reasoning behavior.
- `output_config.format`
  - Requests schema-constrained structured output.

### `stop_reason` values

- `end_turn`: natural completion.
- `max_tokens`: output was cut off; treat it as incomplete.
- `stop_sequence`: configured stop text was reached.
- `tool_use`: Claude is requesting one or more tools.
- `pause_turn`: a long server-tool turn paused; return the response content to continue.
- `refusal`: safety refusal; this can still be an HTTP 200.

### Token accounting

- Important usage fields:
  - `input_tokens`
  - `output_tokens`
  - `cache_creation_input_tokens`
  - `cache_read_input_tokens`
- Total input accounting is the sum of ordinary, cache-creation, and cache-read input tokens.
- Thinking tokens are billed as **output tokens**.
- Output tokens are roughly five times the input-token price on current models in the source material.
- Use `POST /v1/messages/count_tokens` before sending large requests.
- Do not estimate Claude tokens with another provider’s tokenizer.
- Images and document pages also consume input tokens.

### Streaming

- Typical event order:
  1. `message_start`
  2. `content_block_start`
  3. One or more `content_block_delta`
  4. `content_block_stop`
  5. `message_delta`
  6. `message_stop`
- Other events can include `ping` and `error`.
- Delta types can include text, partial JSON input, thinking, and signature deltas.
- Streaming improves **time to first token** and interactive UX.
- Streaming can help avoid long HTTP timeouts for large outputs.
- Streaming does not reduce token usage or price.
- Streaming does not necessarily reduce total generation time.
- Errors can arrive mid-stream after an initial HTTP 200, so consume the full event stream safely.

### Errors and retries

| HTTP | Error type | Response |
|---:|---|---|
| 400 | `invalid_request_error` | Fix the request; do not retry unchanged |
| 401 | `authentication_error` | Fix authentication |
| 403 | `permission_error` | Fix access/permissions |
| 404 | `not_found_error` | Correct model or resource ID/availability |
| 413 | `request_too_large` | Reduce request size |
| 429 | `rate_limit_error` | Retry with backoff; honor `retry-after` |
| 500 | `api_error` | Retry with capped backoff and jitter |
| 529 | `overloaded_error` | Retry with capped backoff and jitter |

- Rate limits can apply per organization and model.
- Limits include requests per minute, input tokens per minute, and output tokens per minute.
- Inspect `anthropic-ratelimit-*` and `retry-after` headers.
- SDKs generally retry transient failures such as 408, 409, 429, 5xx, and connection errors; the source notes two retries by default.
- Use exponential backoff, jitter, a retry ceiling, and a circuit breaker for sustained failure.
- Never retry an unchanged validation error in a tight loop.
- HTTP 200 means transport success—not task success.
- On every response, inspect `stop_reason`, parse the content, and validate its meaning.

### Claude API versus Claude Code

| Concern | Raw API | Claude Code |
|---|---|---|
| Conversation state | Your app stores and resends it | Session managed by harness |
| Files and shell | Only tools you provide | Built-in tools |
| Project instructions | Put in `system` | `CLAUDE.md`/rules loaded |
| Reusable procedures | Application code/API skills | Skills and slash commands |
| Permissions | Your code | Permission rules/modes/hooks |
| Tool execution | Your app for client tools | Harness executes local built-ins |
| Context management | Your app/API features | Auto-compaction, `/compact`, `/clear`, subagents |

- API tool definitions do not automatically become Claude Code tools.
- `CLAUDE.md`, Claude Code hooks, and Claude Code permissions do not affect ordinary API requests.

---

## 4. Prompt Engineering

### System versus user content

- Put stable operator concerns in the system prompt:
  - Role and behavior.
  - Rules and prohibitions.
  - Output contract.
  - Tool-use policy.
  - What to do when uncertain.
- Put request-specific material in user turns:
  - The task instance.
  - User question.
  - Documents and data.
  - Per-request variables.
- Keep the system prompt stable when possible; it helps consistency and caching.
- User content and retrieved content are not trusted merely because they appear in the conversation.

### A strong task specification includes

- **Context**: audience and purpose.
- **Task**: a clear action verb and deliverable.
- **Constraints**: length, tone, exclusions, and uncertainty handling.
- **Format**: exact structure or schema.
- **Success criteria**: what the answer must contain or achieve.
- Give the reason behind important constraints where useful; modern models often generalize better from a rationale.
- Avoid excessive shouting and repeated “CRITICAL/MUST” language; newer models may over-apply it.

### Delimiters and XML-style tags

- Use clear tags to separate instructions, examples, documents, and output format.
- Use consistent tag names and refer to them explicitly.
- Tags are a prompting convention, not a security boundary.
- Tags improve structure but cannot stop prompt injection by themselves.

### Few-shot prompting

- Use examples when:
  - Format is subtle.
  - Classification boundaries are difficult.
  - A specific tone is required.
- Wrap examples in clear `<example>` blocks.
- Use diverse examples including edge cases.
- Keep examples consistent with written instructions.
- A useful rule of thumb is **3–5 varied examples**, not many nearly identical examples.
- Too many or overly specific examples cause surface copying and consume context.
- If examples conflict with instructions, remove the conflict instead of adding more rules.

### Long-context prompting

- Put long reference documents near the beginning.
- Put the live question and instructions after the documents.
- Tag each document and include source metadata.
- For grounding, ask Claude to extract relevant passages first and answer from them.
- If source attribution must be verifiable, use document citations rather than asking the model to invent a quote field.

### Prompt injection

- **Direct injection** comes directly from the user.
- **Indirect injection** is hidden in data such as:
  - Web pages.
  - Emails.
  - PDFs.
  - Retrieved documents.
  - Tool results.
  - MCP tool descriptions or results.
- Keep trusted instructions in the system layer.
- Mark external material as untrusted data.
- Do not rely on “ignore instructions in this data” as the only defense.
- Strong defenses are architectural:
  - Least-privilege tools.
  - Per-user authorization in code.
  - Human approval before consequential actions.
  - Input/output validation.
  - Isolation of untrusted-reading steps from privileged-action steps.
- Never place secrets in a prompt and assume instructions will prevent leakage.

### Prompting trap

- “Return JSON” in a prompt encourages JSON but does not guarantee a schema.
- Use structured outputs for machine-consumed contracts.

---

## 5. Structured Outputs and Validation

### Three levels of JSON reliability

1. Prompt-only JSON request
   - Usually follows the requested shape.
   - Can include prose, omit keys, or change types.
2. Schema-constrained final response
   - Use `output_config.format` with JSON Schema.
   - Guarantees parsing and schema conformance when the response completes normally.
3. Strict tool input
   - Use `strict: true` on the tool definition.
   - Constrains `tool_use.input` to the declared schema.

### JSON Schema facts

- `required`
  - Means the property must be present.
  - Does not guarantee a sensible or non-empty value.
- `enum`
  - Limits a value to a listed set.
  - Does not make the property required.
- `type`
  - Constrains the JSON type.
  - Does not validate business meaning.
- Optional property
  - Appears in `properties` but not in `required`.
- `additionalProperties: false`
  - Rejects undeclared fields.
  - Needed with strict tools according to the source.

### Syntax versus semantics

- **Syntactic validity**: JSON parses and matches its schema.
- **Semantic validity**: values are correct for the real business problem.
- Schema validity cannot guarantee:
  - An ID exists.
  - An amount is authorized.
  - Cross-field consistency.
  - A classification is factually correct.
  - A claimed action actually happened.
- Add code-level semantic checks:
  - Range and business-rule checks.
  - Referential integrity.
  - Cross-field consistency.
  - Source grounding.
  - Human review or calibrated LLM judging where appropriate.

### Repair strategy

- Check `stop_reason` before parsing; `max_tokens` can leave output incomplete.
- Parse and schema-validate.
- If schema-invalid, retry a small number of times with the specific validation error.
- If semantically invalid, state the exact violated rule and re-ask or route to a human.
- Bound repairs to one or two attempts.
- Log repair frequency; a rising rate indicates regression.

### When to use which feature

- Use structured output for extraction, classification, routing, and API payloads.
- Use plain text for human-facing explanations and creative prose.
- Use a tool when Claude may need to decide whether to act.
- Use `output_config.format` when the goal is only to shape the final answer.
- Structured output can be incompatible with some features such as citations, depending on version.
- Older SDKs used top-level `output_format`; current guidance uses `output_config.format`.

---

## 6. Context Engineering

### What the context window contains

- System instructions.
- Tool definitions.
- All supplied messages.
- Tool calls and tool results.
- Thinking blocks where applicable.
- The output currently being generated.
- The source states current maximums up to 1M tokens, with Haiku 4.5 at 200K; these are version-dependent.
- If input plus requested output exceeds the context window, the request fails.
- The API does not silently discard the oldest turns.

### Context accumulation

- Stateless calls cause the full relevant history to be resent.
- Agent loops add tool requests and potentially large tool results every step.
- Without management:
  - Cost rises.
  - Latency rises.
  - Important instructions get buried.
  - Irrelevant material degrades answer quality.
  - The context limit is eventually reached.
- A larger context window is capacity, not a context strategy.

### Context-management techniques

- **Explicit pruning**: application removes obsolete turns or truncates results.
- **Summarization/compaction**: replace older history with a compact summary.
- **Context editing**: automatically clear older tool results or thinking blocks.
- **Retrieval/RAG**: supply only relevant source chunks for the current question.
- **External memory/state**: persist facts in files or databases and reload selectively.
- **Subagents**: perform noisy work in separate contexts and return condensed results.
- Compaction summarizes; context editing clears; caching only reuses.

### Version-dependent API context features

- Server-side compaction beta summarizes history.
- Context-editing beta can clear older tool use/results.
- When using API compaction, append the full returned response content, including compaction blocks, to subsequent history.

### Retrieval versus whole-document context

- Prefer retrieval when:
  - Corpus is larger than the context window.
  - Corpus changes frequently.
  - Cost or latency matters.
  - Irrelevant information harms precision.
- Prefer a bounded set of full documents when broad cross-document reasoning is essential.
- Cache a stable large document prefix when many requests reuse it.
- Improve retrieval with reranking, source labels, relevance thresholds, and fewer high-quality chunks.
- More context is not automatically better context.

### Agent context policy

- Always preserve:
  - User goal.
  - Safety constraints.
  - Current plan/state.
- Summarize:
  - Completed subtasks.
  - Findings needed later.
- Drop:
  - Raw logs.
  - Large tool dumps after conclusions have been extracted.
  - Duplicate observations.
- Keep durable state outside the model context so crashes and compaction do not erase it.
- Rewriting an early part of the request can invalidate the cached prefix from that point onward.

---

## 7. Tool Use / Function Calling

### Core rule

- A client tool is a capability described to Claude using:
  - Name.
  - Description.
  - JSON input schema.
- Claude chooses or is instructed to request the tool.
- **Claude does not execute your client tool.**
- Your application validates, authorizes, executes, and returns the result.

### Tool-use loop

1. Send messages and tool definitions.
2. Claude responds with `stop_reason: "tool_use"` and one or more `tool_use` blocks.
3. Append the assistant’s **full content**, including thinking and every tool request.
4. Validate the input schema and business rules.
5. Authorize the action for the authenticated end user.
6. Execute the tool in your application/environment.
7. Return a `tool_result` with the matching `tool_use_id`.
8. Call the model again with the expanded history.
9. Stop when Claude returns a non-tool stop reason or an application guardrail fires.

### Tool-description quality

- Description is the main signal for tool selection.
- State:
  - What the tool does.
  - When it should be used.
  - When it must not be used.
  - What it returns.
- Vague or overlapping descriptions cause wrong or missing calls.

### Parallel calls

- One assistant response may contain multiple `tool_use` blocks.
- Execute them concurrently only when safe and independent.
- Wait for every result.
- Return all corresponding `tool_result` blocks together in **one user message**.
- Include a result for every `tool_use_id`, even when some calls fail.
- Splitting parallel results across multiple user messages can reduce future parallel behavior.

### Tool failures

- Return a tool result with `is_error: true`.
- Make the error actionable: explain what failed and how arguments may be corrected.
- Do not fabricate success.
- Do not silently omit a failed result.
- Use per-tool timeouts.
- Cap repeated failures, then stop or escalate.

### `tool_choice`

| Choice | Effect |
|---|---|
| `auto` | Claude decides whether to use a tool |
| `any` | Claude must choose some tool |
| `tool` with name | Claude must choose that specific tool |
| `none` | Tool use disabled |

- `disable_parallel_tool_use: true` limits a turn to at most one tool call.
- Forced `any`/specific-tool choices can be incompatible with extended thinking.
- Newest models may reject forced choices; use `auto`, strong instructions, and strict schemas where needed.

### Kinds of tools

| Kind | Executor | Examples |
|---|---|---|
| Client/user-defined | Your application | Order lookup, database query |
| Anthropic-defined client tool | Your environment; schema supplied by Anthropic | Bash, text editor, computer use, memory |
| Server tool | Anthropic infrastructure | Web search, web fetch, code execution |
| MCP tool | MCP server, reached by host/client or API connector | GitHub, Jira, internal services |

### Safety requirements

- Validate schema and business rules even with `strict: true`.
- Enforce per-user authorization in tool code/backend.
- The model’s request is never authorization.
- Guard against path traversal, unsafe URLs, SQL/shell injection, and invalid object IDs.
- Treat tool output as untrusted data.
- Auto-run low-risk read-only tools where appropriate.
- Require confirmation or approval for writes and irreversible actions.
- Bound the loop using steps, time, tokens/cost, and repeated-call detection.

---

## 8. Thinking and Effort

### Purpose and cost

- Extended thinking lets Claude reason before a final text or tool call.
- Useful for:
  - Multi-step reasoning.
  - Mathematics.
  - Architecture decisions.
  - Complex coding.
  - Debugging/root-cause analysis.
  - Long-horizon agentic work.
- Usually unnecessary for:
  - Extraction.
  - Classification.
  - Routing.
  - Simple Q&A.
  - Formatting.
  - High-volume latency-sensitive tasks.
- Thinking uses output tokens and increases latency.

### Two generations of controls

- Older/manual mechanism:
  - `thinking: {"type": "enabled", "budget_tokens": N}`.
  - Minimum budget: 1024 tokens.
  - `budget_tokens` must be less than `max_tokens`.
  - Applies to older Claude 3.7/4.x models and Haiku 4.5 in the source.
- New/adaptive mechanism:
  - `thinking: {"type": "adaptive"}` or enabled by default on some models.
  - Control with `output_config.effort`.
  - Values include `low`, `medium`, `high`, and model-dependent `xhigh`/`max`.
  - Effort belongs **inside `output_config`**.
- Effort influences:
  - Thinking depth.
  - Number of tool calls.
  - Response verbosity.
- Effort is advisory; `max_tokens` is a hard cap.
- The source states most current models default to high, while Opus 5.5 defaults to medium; verify current docs.
- `budget_tokens` is deprecated/rejected on newer models.

### Thinking visibility

- Current models do not expose raw internal chain of thought.
- `thinking.display: "summarized"` can provide a readable summary.
- `thinking.display: "omitted"` can leave visible text empty.
- Omitted or summarized thinking still occurs and is billed.
- Legacy `redacted_thinking` contains encrypted reasoning affected by safety processing.
- A thinking block’s signature verifies it was produced by Claude.

### Passing thinking through a tool loop

- Append the assistant response content **exactly as received**.
- Preserve:
  - Thinking blocks.
  - Redacted-thinking blocks.
  - Signatures.
  - Original order.
  - Tool-use blocks.
- Do not “clean up” or edit signed thinking history.
- Dropping or changing blocks can break reasoning continuity or cause 400 errors.
- Adaptive thinking supports interleaved reasoning between tool calls.

### Important constraints

- Thinking may be incompatible with forced `tool_choice`.
- Sampling-parameter changes may be incompatible.
- Assistant prefill is incompatible.
- Changing thinking/effort settings during a conversation may invalidate message-level caches.
- Choose effort through evals and optimize **cost per completed task**, not tokens per call alone.

---

## 9. Prompt Caching

### What it does

- Reuses a previously processed, byte-identical input prefix.
- Reduces input cost and prefill latency.
- Does not make the context smaller.
- Does not cache output.
- Does not change the model’s answer merely because caching is enabled.

### Prefix order and breakpoints

- Request prefix order is effectively:
  - `tools` → `system` → `messages`
- Add `cache_control: {"type": "ephemeral"}` to a content block.
- Everything through that block becomes the cacheable prefix.
- Exact prefix matching matters: a one-byte change causes a miss from that point onward.
- Maximum: **4 cache breakpoints** per request.
- Automatic top-level caching can manage a moving breakpoint on supported versions.
- Breakpoint lookup is limited to roughly 20 earlier blocks; very long turns may need intermediate breakpoints.

### Minimum length

- Each model has a minimum cacheable prefix, roughly 512–4096 tokens in the source.
- Too-short prefixes silently do not cache.
- There may be no error; usage simply shows no cache activity.

### TTL and pricing

| Event | Usage field | Relative input price |
|---|---|---:|
| 5-minute cache write | `cache_creation_input_tokens` | 1.25× |
| 1-hour cache write | `cache_creation_input_tokens` | 2× |
| Cache read/hit | `cache_read_input_tokens` | About 0.1× |
| Uncached tail | `input_tokens` | 1× |

- Default TTL: **5 minutes**.
- Optional TTL: **1 hour**.
- Every cache hit refreshes the TTL at no extra write charge.
- Frequent traffic can keep a 5-minute cache warm indefinitely.
- Choose 1 hour when repeat traffic gaps are commonly 5–60 minutes.
- With the 5-minute TTL, the second identical-prefix request can already produce net savings.
- The first request costs more because it creates the cache.

### Scope and invalidation

- Caches are scoped by organization and model.
- Switching models starts with a cold cache.
- Common invalidators:
  - Dynamic timestamp or request ID inside the prefix.
  - Reordered tools.
  - Different JSON or tool-definition ordering.
  - Adding/removing a tool.
  - Changing the system prompt.
  - Switching the model.
  - Editing/deleting earlier turns.
  - Version-dependent changes to thinking, effort, or `tool_choice`.
- Because tools appear first, changing tool definitions can invalidate the entire later prefix.
- Diagnose cache behavior using `cache_creation_input_tokens` and `cache_read_input_tokens`.

### Placement patterns

- Stable system instructions/tools: breakpoint at the end of the stable system content.
- Shared large document plus changing questions: breakpoint after the document and before the question.
- Multi-turn chat/agent: move the breakpoint forward or use automatic caching.
- Put volatile content after the breakpoint.

### Caching versus context management

- Caching makes repeated input cheaper/faster.
- Compaction and pruning reduce tokens sent.
- Rewriting early context to compact it can break cache reuse.
- A useful strategy is append-only history with periodic, deliberate compaction.

---

## 10. Agents and Workflows

### Workflow versus agent

| Feature | Workflow | Agent |
|---|---|---|
| Next step chosen by | Your code | The model |
| Path | Predetermined | Dynamic |
| Predictability | Higher | Lower |
| Cost/latency | Easier to bound | Variable and often higher |
| Best fit | Known, repeatable process | Open-ended task with unknowable steps |

- Start with a single call.
- Move to a workflow if multiple known steps are needed.
- Use an agent only when dynamic planning/tool selection adds real value.

### Common workflow patterns

- **Prompt chaining**: output of one step becomes input to the next, often with gates.
- **Routing**: classify and send to a specialized prompt, model, or workflow.
- **Parallelization/sectioning**: split independent parts and combine them.
- **Voting**: run alternatives and select/aggregate.
- **Orchestrator–workers**: lead dynamically splits work among workers.
- **Evaluator–optimizer**: generate, critique, revise in a controlled loop.

### Agent loop

- Goal → reason/plan → request tool → execute/observe → choose next step → finish or stop by guardrail.
- An agent is fundamentally tool use in a loop with state.

### When an agent is justified

- **Complexity**: task is multi-step and cannot be fully specified in advance.
- **Value**: result justifies extra cost and latency.
- **Viability**: the model performs the task well enough.
- **Cost of error/recoverability**: mistakes can be detected, reviewed, or rolled back.
- If one condition fails, prefer a simpler workflow or single call.

### Guardrails and termination

- Maximum loop iterations.
- Token or cost budget.
- Per-tool and whole-run timeouts.
- Least-privilege tool set.
- Human approval before irreversible/high-impact actions.
- Explicit stop conditions in the prompt.
- Repeated-call detection for identical tool and arguments.
- Consecutive-error cap.
- User stop/cancellation.
- A task budget can help the model pace work; it is not the same as `max_tokens`.

### State management

- API conversation messages are your responsibility.
- Keep durable state externally in a DB, file, task record, or todo system.
- Make tools idempotent so retries do not duplicate side effects.
- Preserve goals and constraints across compaction.

### Multi-agent/subagent use

- Orchestrator assigns self-contained briefs to subagents.
- Each subagent has a separate context window.
- Subagents do not automatically inherit the parent conversation.
- Include all necessary inputs, constraints, and expected output in the brief.
- Subagents return concise findings to protect the lead context from noise.
- Good uses: independent research, codebase exploration, reviews, parallel modules.
- Costs: more total tokens, coordination overhead, inconsistent work, conflicting edits.
- Give parallel workers non-overlapping scopes or serialize changes to shared files.
- Use smaller models/lower effort for mechanical subtasks when evals support it.

### Ways to run agentic systems

| Option | Loop owner | Tool execution |
|---|---|---|
| Manual Messages API loop | Your code | Your code |
| SDK Tool Runner | SDK helper in your process | Your code |
| Claude Agent SDK | Harness hosted in your infrastructure | Built-in/custom tools in your infrastructure |
| Managed Agents | Anthropic | Hosted sandbox plus configured custom tools |

---

## 11. Claude Code

### What it is

- Anthropic’s agentic coding harness available in terminal and other surfaces.
- Can read/edit files, search code, run commands/tests, use git, and connect through MCP.
- Includes:
  - Agent loop.
  - Built-in tools.
  - Permissions and sandboxing.
  - Memory/instruction files.
  - Skills.
  - Subagents.
  - Hooks.
  - Context management.
- Claude Agent SDK packages the same style of harness as a library for your own infrastructure.

### `CLAUDE.md` and rules

| Location | Scope |
|---|---|
| Managed policy location | Entire organization; enterprise controlled |
| `~/.claude/CLAUDE.md` | User across projects |
| `./CLAUDE.md` or `./.claude/CLAUDE.md` | Shared project instructions |
| `./CLAUDE.local.md` | Personal project instructions; normally gitignored |
| `.claude/rules/*.md` | Modular rules; optional `paths:` scope |

- Working-directory and parent `CLAUDE.md` files are concatenated, not simply overridden.
- Subdirectory instructions load when work reaches that area.
- `@path/to/file` can import another file.
- `/init` helps generate a starting project instruction file.
- `/memory` manages memory files.
- Keep `CLAUDE.md` concise—roughly 200 lines or less in the source guidance.
- Good content:
  - Build and test commands.
  - Project conventions.
  - Architectural facts.
  - Stable “always do X” guidance.
- Move long procedures to skills.
- Move path-specific guidance to `.claude/rules/` with `paths:` frontmatter.
- `CLAUDE.md` supplies context; it does not technically enforce behavior.

### Skills

- A skill is a folder containing `SKILL.md` and optional scripts, references, or templates.
- `SKILL.md` has YAML frontmatter and procedure instructions.
- Common frontmatter fields:
  - `name`
  - `description`
  - `allowed-tools`
  - `disable-model-invocation`
  - `user-invocable`
- Locations include personal, project, plugin, and enterprise-managed skill directories.
- Invocation:
  - Automatic when the request matches the skill description.
  - Manual with `/skill-name` when user-invocable.
- `disable-model-invocation: true` makes it manual-only.
- `user-invocable: false` makes it Claude-only.
- Progressive disclosure:
  - Skill descriptions are available up front.
  - Full instructions load only when the skill is invoked.
  - Supporting files load only when needed.
- Older `.claude/commands/*.md` commands still work, but skills add resources and auto-invocation.
- A vague description prevents reliable automatic invocation.

### Rules, skills, subagents, hooks, and MCP

| Mechanism | Best use |
|---|---|
| `CLAUDE.md` / rules | Persistent knowledge, commands, standards |
| Skill | Reusable multi-step procedure loaded on demand |
| Subagent | Isolated context for noisy or specialized work |
| Hook | Deterministic lifecycle action or enforcement |
| Permission rule | Allow, ask, or deny tool use |
| MCP server | External system capability/data/prompt integration |

- Memory/knowledge → `CLAUDE.md`.
- Procedure → skill.
- Isolation/parallelism → subagent.
- Guarantee/enforcement → hook or permission.
- External integration → MCP.

### Hooks

- Hooks run configured shell commands or supported prompt/agent hooks on lifecycle events.
- Important events include:
  - `PreToolUse`: can block a tool before execution.
  - `PostToolUse`: check or format after execution.
  - `UserPromptSubmit`.
  - `Stop`.
  - `SubagentStop`.
  - `SessionStart`.
  - `PreCompact`.
  - `Notification`.
- Use hooks when a requirement must run deterministically.
- `/hooks` manages hooks.
- Put shared hooks in committed project settings, not in each developer’s local file.

### Permissions

- Reads are generally allowed; changing files, running commands, and network operations may prompt by default.
- Permission categories:
  - `allow`
  - `ask`
  - `deny`
- **Deny wins**.
- Rules can target commands/resources, for example Bash patterns, read paths, or web domains.
- Settings precedence in the source:
  1. Managed enterprise policy.
  2. Command line.
  3. Local project settings.
  4. Shared project settings.
  5. User settings.
- Important modes:
  - `default`: ask as required.
  - `acceptEdits`: automatically accept file edits.
  - `plan`: read-only planning/no modifications.
  - `bypassPermissions`: no prompts; suitable only for isolated sandboxes.
- `/permissions` views/edits rules.
- For a guaranteed read-only review, use plan mode and/or a read-only tool allowlist—not a polite prompt.

### Effective coding workflow

- Explore → plan → implement → verify → commit.
- Give Claude a concrete verification method: tests, linting, build output, or screenshots.
- It can inspect git history and diffs, prepare commits, resolve conflicts, and work with PR tooling.
- Headless/non-interactive mode: `claude -p "<prompt>"`.
- Useful commands include `/clear`, `/compact`, `/agents`, `/mcp`, `/hooks`, `/permissions`, `/model`, and `/rewind`.

---

## 12. Model Context Protocol (MCP)

### Purpose

- MCP is an open JSON-RPC 2.0 protocol for connecting AI applications to external tools, resources, and prompt templates.
- It standardizes integration and discovery.
- It does not replace the backend API; an MCP server typically wraps it.
- MCP is not a model or an agent framework.

### Host, client, and server

| Role | Owns |
|---|---|
| Host | UI, LLM interaction, clients, context selection, user consent, security policy, tool aggregation |
| Client | One connection/session to one server, capability negotiation, routing requests/responses |
| Server | Tools/resources/prompts, backend authentication, input validation, external operation execution |

- The host is the user-facing AI application, such as Claude Code, Claude Desktop, or your app.
- There is normally one MCP client per server connection inside the host.
- The server does not interact with the LLM directly and does not receive the entire conversation by default.
- The host decides exactly what context/request reaches a server.
- Host handles consent; server/backend enforces per-user authorization.

### MCP primitives

| Primitive | Controlled by | Purpose |
|---|---|---|
| Tools | Model, subject to host approval | Actions/computations |
| Resources | Application/host | Read-only context addressed by URI |
| Prompts | User | Reusable prompt templates |

### Client features offered to servers

- **Sampling**
  - Server asks the client/host to run an LLM completion.
  - Server does not need its own model API key.
  - Host can review, modify, deny, and choose the model.
  - Direction: server → host’s model.
- **Roots**
  - Client tells server which filesystem/URI boundaries are available.
- **Elicitation**
  - Server asks the user for more input through the host.

### Lifecycle and discovery

1. Client sends `initialize` with protocol version and capabilities.
2. Server responds with its capabilities.
3. Client sends `initialized`.
4. Client discovers primitives through methods such as:
   - `tools/list`
   - `resources/list`
   - `prompts/list`
5. Tool invocation uses `tools/call` with name and arguments.
6. Servers can send list-change and resource-update notifications.

### Transports

- `stdio`
  - Host launches a local server process.
  - Useful for local tools.
  - Server code runs on the local machine and inherits local security risks.
- Streamable HTTP
  - Used for remote MCP servers.
  - Replaced older HTTP+SSE transport.

### Security

- Remote HTTP MCP commonly uses OAuth 2.1-based authorization.
- Local stdio servers generally use environment/local credentials.
- Only install trusted local servers; they execute code on the machine.
- Scope credentials per server and per user.
- Host enforces user consent and data exposure policy.
- Server/backend enforces authorization for the authenticated principal.
- Treat tool descriptions and returned content as untrusted.
- Third-party MCP content can contain tool poisoning or prompt injection.

### MCP with Claude surfaces

- Claude Code is an MCP host.
- Claude Code supports MCP configuration using `claude mcp add` and project `.mcp.json`.
- MCP scopes include local, project/shared, user, and managed enterprise depending on surface/version.
- Messages API can connect to remote MCP servers using a beta MCP connector.
- The source states this requires both server declarations and an MCP toolset entry.
- In a plain custom API application, your application is the host and bridges MCP tool definitions/results into ordinary Claude tool use.

---

## 13. Model Selection, Lifecycle, and Migration

### Model families

| Family | Position | Typical uses |
|---|---|---|
| Haiku | Fastest and cheapest | Classification, extraction, routing, simple subagents, real-time UX |
| Sonnet | Balanced | Most production applications, coding, agents at scale |
| Opus | Most capable of the standard three | Difficult reasoning, complex coding, long-horizon agents |
| Higher tier such as Fable | Version-dependent top capability/price | Most demanding work |

- Start with a balanced model, then move up or down based on eval results.
- Select the smallest/cheapest configuration that meets the quality target.
- Measure cost per successful task; a weaker model can cost more through retries and extra turns.
- A more capable model at lower effort can sometimes outperform a smaller model at high effort economically.
- Consider capability, latency, cost, context window, feature support, and platform availability.

### IDs, aliases, and snapshots

- A model ID is the exact string passed in `model`.
- Older naming commonly includes dated snapshots.
- **Snapshot**: frozen behavior for reproducibility until retirement.
- **Alias**: can move to a newer snapshot, changing behavior without code changes.
- Production systems should prefer deliberate pinning and tested upgrades.
- Prototypes may use aliases for convenience.
- Some newer models use a single undated ID; naming is version-dependent.
- Use `GET /v1/models` to discover available models/capabilities instead of hard-coding every option.
- Cloud platform IDs differ:
  - Bedrock can add `anthropic.` prefixes.
  - Vertex can use `@` date notation.
- Cloud platforms may lag or differ in supported features.

### Lifecycle

- Active → Legacy → Deprecated → Retired.
- Deprecated:
  - Still works.
  - Retirement date has been announced.
- Retired:
  - Requests fail.
- Pinning prevents silent behavior movement but does **not** prevent retirement.
- Track deprecation notices and recommended replacements.

### Safe migration process

1. Inventory model IDs in configuration, code, tests, and infrastructure.
2. Read migration notes for parameter/default/feature changes.
3. Freeze a representative regression/eval dataset.
4. Baseline the current model.
5. Run the same set on the replacement.
6. Retune prompts and effort only where evidence demands it.
7. Canary a small portion of traffic.
8. Compare quality, errors, refusals, latency, tokens, cost, and cache behavior.
9. Roll out gradually.
10. Keep rollback as a configuration change.
11. Complete the migration before retirement.

### Common migration breakages

- Sampling parameters removed or changed.
- Assistant prefill removed.
- Manual `budget_tokens` replaced by adaptive thinking/effort.
- Default effort changed.
- Tool-choice support changed.
- Tokenizer changed, affecting context and cost.
- Cache is cold because caches are per model.
- Newer models interpret over-emphatic prompts too literally.

### Optimization order

- Cost:
  1. Cache stable prefixes.
  2. Trim irrelevant input and retrieval.
  3. Limit output length/shape.
  4. Lower effort where quality holds.
  5. Use a smaller model where evals permit.
  6. Batch non-urgent work.
- Latency:
  1. Stream for earlier visible output.
  2. Cache long prefixes.
  3. Lower effort/disable unnecessary thinking.
  4. Use a smaller model.
  5. Reduce output length.
  6. Parallelize safe independent calls.

---

## 14. Evaluation, Testing, and Debugging

### Why evaluation is necessary

- LLM output is nondeterministic and open-ended.
- One successful run proves little.
- Temperature 0 does not make behavior deterministic enough to skip evals.
- Evaluate every meaningful change to model, prompt, effort, tools, retrieval, or orchestration.

### Evaluation vocabulary

- **Eval dataset**: representative normal, edge, and adversarial inputs.
- **Golden dataset**: inputs with known-correct human-verified labels/outputs.
- **Frozen regression set**: unchanged set reused across changes for comparability.
- **Success criteria**: measurable thresholds defined before running the test.

### Grader types

| Grader | Strength | Limitation |
|---|---|---|
| Code-based | Exact/objective checks such as schema, regex, tests | Cannot judge nuance |
| LLM-as-judge | Relevance, faithfulness, tone, completeness at scale | Bias and calibration risk |
| Human | Best nuanced ground truth and calibration | Slow, costly, variable |

- Prefer deterministic code graders whenever possible.
- Use LLM judges for subjective dimensions with a clear rubric.
- Validate LLM judges against human-labeled examples.
- Watch for position bias, verbosity bias, and self-preference.
- Pairwise comparison is often more reliable than absolute scores.
- Swap A/B positions to reduce position bias.
- Ask a judge for reasoning followed by a constrained verdict.
- Use multiple runs and confidence intervals for statistical reliability.

### Accuracy versus quality

- Accuracy concerns correctness against expected facts/labels.
- Quality also includes relevance, helpfulness, tone, format, safety, latency, and cost.
- A factually correct but unusable-format response is still a failed product response.

### Silent failures to detect

- HTTP 200 with `max_tokens` truncation.
- HTTP 200 with refusal.
- Schema-valid but semantically incorrect JSON.
- Correctly shaped but wrong tool arguments.
- Required tool not called.
- Hallucinated claim of action completion.
- Agent says “done” without producing the side effect.
- Quality drift when an alias moves.
- Retrieval provides the wrong evidence while generation appears fluent.

### Failure classification and likely fix

| Class | Typical fix |
|---|---|
| Prompt/instruction | Clarify system rule, rationale, constraints, or examples |
| Context/retrieval | Improve chunking, relevance, order, or source coverage |
| Tool | Improve descriptions/schema, validation, and actionable errors |
| Reasoning | Increase effort, thinking, or decomposition |
| Format | Structured output/schema constraint |
| Platform | Timeout handling, retry/backoff, capacity/fallback |
| Safety | Guardrails, privilege reduction, injection containment |

### Testing agent loops

- Mock the API client with recorded response trajectories.
- Include cases such as:
  - Normal text completion.
  - `tool_use`.
  - Parallel tool use.
  - Tool error.
  - `max_tokens`.
  - Refusal.
  - Repeated-call loop.
- Keep deterministic control-flow unit tests separate from probabilistic quality evals.
- Do not require a live model call in every unit test.

### Observability and debugging

- Log, with privacy controls:
  - Exact model ID.
  - Prompt version.
  - Parameters including thinking and effort.
  - Redacted request/response content.
  - `stop_reason`.
  - Token usage and cache fields.
  - Latency and time to first token.
  - Tool calls, results, and errors.
  - Trace ID across all agent steps.
- Replay traces and find the **first incorrect step**, not only the final bad answer.
- Sample real production traffic into ongoing evaluations.
- Alert on drift in quality, refusal, truncation, cost, latency, and tool failures.
- Redact PII and secrets, restrict log access, and set a retention policy.

---

## 15. Security and Safety

### Threats

| Threat | Meaning | Main containment |
|---|---|---|
| Direct prompt injection | User attempts to override instructions | System policy, validation, least privilege |
| Indirect prompt injection | Malicious instructions inside data/tool output | Treat data as untrusted, restrict post-read actions |
| Jailbreak | Attempt to obtain disallowed content | Model safeguards, policy prompt, output moderation |
| Data leakage | Secrets, PII, system data, or other-user data exposed | Keep secrets out, scope data, filter output |
| Excessive agency | Agent can do more harm than task requires | Least privilege, sandbox, approvals |

### Principles

- Treat every model output as untrusted input to the next system component.
- Treat retrieved content and tool results as data, not instructions.
- Authentication proves identity; authorization decides permitted actions.
- The model is never an authorization layer.
- Enforce authorization against the authenticated user in tool/backend code.
- Keep API keys and secrets in environment variables or secret stores.
- Do not place secrets in prompts or general logs.
- Let server-side execution use credentials without exposing them to the model.
- Validate tool input and model output before using either.
- Use allowlists for paths, commands, URLs, and domains where appropriate.
- Sanitize generated HTML to prevent XSS and generated shell/SQL before execution.
- Use scoped, read-only credentials when possible.
- Require approval before payments, deletes, deployments, external emails, and other high-impact actions.
- Sandbox code execution in isolated containers/VMs with limited filesystem/network access.
- Apply budgets, rate limits, anomaly monitoring, and tool-call auditing.

### Breaking the injection-to-action chain

- A dangerous pattern is: read malicious content → follow its hidden instruction → use a privileged outbound tool.
- Break it by:
  - Separating untrusted-reading and privileged-action stages.
  - Removing unnecessary outbound tools.
  - Requiring approval for consequential actions.
  - Checking action intent against the real user request.
  - Scoping credentials and destination domains.

---

## 16. Production Architecture, Cost, and Performance

### Reference architecture responsibilities

- API gateway:
  - Authentication.
  - Per-user quotas and rate limits.
- Stateless application service:
  - Request assembly.
  - Prompt/tool selection.
  - Validation.
- Session/task store:
  - Conversation history.
  - Durable agent state.
  - User preferences.
- Retrieval layer:
  - Select relevant context.
- Interactive path:
  - Stream through SSE/WebSocket.
- Async path:
  - Queue → workers → Claude/Batch API → result store.
- API client resilience:
  - Timeouts.
  - Backoff/jitter.
  - Circuit breaker.
  - Fallbacks.
- Observability:
  - Logs, metrics, traces, usage, cost, latency, quality.

### Interactive versus offline processing

- Streaming Messages API:
  - Chat and interactive UI.
  - Improves time to first token.
- Message Batches API:
  - Non-urgent bulk work.
  - Asynchronous.
  - Roughly 50% cheaper in the source.
  - Can take up to 24 hours.
  - Results may be unordered; join them using `custom_id`.
  - Does not stream individual results as chat output.

### Reliability

- Configure generous timeouts for long generations.
- Remember retries can multiply wall-clock time.
- Smooth bursts with queues and concurrency limits.
- Respect `retry-after`.
- On sustained 5xx/529 failures, trip a circuit breaker.
- Degrade gracefully using a cached result, smaller model, reduced capability, or clear “try later” state.
- Avoid rotating API keys to evade organization-level limits.
- Separate workloads through throttling, scheduling, and queue priorities—not assumptions that each key has independent limits.

### Cost formula and behavior

- Cost = ordinary input + cache writes/reads at their rates + output.
- Thinking is billed as output.
- Output verbosity is often a major cost lever.
- Agent costs can grow superlinearly as the expanding history is resent every step.
- Caching reduces repeated-prefix input price.
- Compaction/retrieval reduces the number of input tokens.

### Optimization playbook

1. Cache stable prompts, tools, and shared documents.
2. Remove unused tools and boilerplate.
3. Retrieve fewer, more relevant chunks.
4. Ask for concise output or structured data.
5. Batch offline work.
6. Lower effort where evals show no quality loss.
7. Route simpler tasks to smaller models.
8. Parallelize independent calls/tool operations safely.
9. Control concurrency and queue around rate limits.
10. Evaluate cost per completed task, not per request.

### Customer quotas

- Record each response’s usage against the correct end customer.
- Enforce quotas in your application before accepting new work.
- `max_tokens` alone is not a monthly budget.
- Do not estimate usage only from character counts.

---

## 17. Deployment Patterns and Responsibility Boundaries

| Pattern | Loop/harness owner | Tool execution | Best fit |
|---|---|---|---|
| API app/workflow | Your application | Your app for client tools; Anthropic for server tools | Most product features |
| Customer-controlled tools | Your loop or hosted loop | Your network/environment | Private systems/data |
| Self-hosted full harness | Your Agent SDK/framework deployment | Your infrastructure | Maximum runtime/compliance control |
| Managed Agents | Anthropic | Anthropic-hosted sandbox plus connected custom tools | Long-running hosted agents |

### Responsibility rules

- Anthropic serves the model and safety classifiers.
- Anthropic executes explicitly enabled server tools.
- You execute and secure client/custom tools.
- You run API/Agent SDK loops unless using a managed-agent service.
- You store conversation and task state in ordinary API patterns.
- Managed-agent sessions can retain session state for that managed surface.
- You remain responsible for:
  - End-user authorization.
  - Consent policy.
  - Approvals.
  - Monitoring.
  - Tool security.
  - Data-retention and residency configuration.
- With client tools, only returned `tool_result` data reaches the model.
- With server tools/managed sandboxes, execution occurs on hosted infrastructure; review data-boundary requirements.
- “Data must remain in our network” points to customer-executed tools or a self-hosted harness.
- The SDK Tool Runner is a loop helper, not the full Agent SDK harness.
- Neither Tool Runner nor Agent SDK hosts infrastructure for you.
- Managed Agents is the option where Anthropic can host both loop and sandbox.

---

## 18. Secondary Features to Recognize

### Claude/API platform terms

- **Console / Claude Platform**: keys, workbench, usage, and workspace management.
- **Workspaces**: organizational subdivisions for keys, limits, and spend.
- **Admin API**: organization management and usage/cost reports using admin credentials.
- **Files API**: upload once and reference by `file_id`.
- **Citations**: model points to exact passages in supplied documents.
- **Computer use**: screen, mouse, and keyboard tool schema.
- **Text editor/bash tools**: Anthropic-defined client tools executed by your environment.
- **Memory tool**: client-side file-based memory across sessions.
- **Tool search**: defer-load large tool catalogs and discover tools on demand.
- **Zero Data Retention**: contractual no-retention option whose model availability varies.
- **Priority Tier**: capacity arrangement for higher availability; not universal.
- **Inference geography**: version-dependent control over inference region.
- **Service tier**: version-dependent service-priority setting.
- `metadata.user_id`: can support abuse tracking.

### Documents and content blocks

- Put images/documents before related text when possible.
- PDFs can be supplied by base64 or Files API reference.
- Use document citations when verifiable evidence is the requirement.
- Preserve thinking-before-tool ordering.
- In a tool-result user message, place `tool_result` blocks before ordinary text where required.

### Advanced MCP

- `sampling/createMessage` lets a server ask the host for a completion.
- Model preferences from the server are hints; the host remains in control.
- Resource subscriptions can notify clients when a resource changes.
- `list_changed` notifications can announce tool/resource/prompt catalog changes.

### Advanced agent design

- Explicit state machines such as plan → act → verify → done make agents more testable.
- Handoffs transfer ownership plus necessary state.
- Parallel researchers plus a synthesizer can help genuinely parallelizable work.
- Debate/critique patterns cost more; use only when evals prove value.

### Legacy terms

- **Text Completions API**: retired pre-Messages API using `Human:`/`Assistant:` style prompts.
- **Assistant prefill**: old technique removed on 4.6+.
- **`budget_tokens`**: legacy thinking-spend control, replaced on new models by adaptive thinking and effort.
- **HTTP+SSE MCP transport**: replaced by Streamable HTTP.

---

## 19. High-Value Distinctions to Memorize

| Do not confuse | Correct distinction |
|---|---|
| Claude API vs Claude Code | Model API versus full coding harness |
| Tool Runner vs Agent SDK | SDK loop helper versus Claude Code-like harness library |
| Agent SDK vs Managed Agents | You host versus Anthropic hosts loop/sandbox |
| Workflow vs agent | Code chooses steps versus model chooses steps |
| `CLAUDE.md` vs skill | Always-on project context versus on-demand procedure |
| Skill vs subagent | Instructions in current/forked procedure versus separate agent context |
| Prompt/rule vs hook/permission | Advisory guidance versus deterministic enforcement |
| `.claude/rules/` vs skills | Path-scoped conventions versus invoked procedures |
| Structured output vs tool use | Shape final response versus request an action |
| `required` vs `enum` | Property presence versus allowed values |
| Schema-valid vs semantically correct | Correct shape versus correct real-world meaning |
| `max_tokens` vs effort | Hard output cap versus behavioral reasoning/work dial |
| Compaction vs context editing | Summarize versus clear |
| Caching vs compaction | Reuse unchanged tokens versus reduce tokens sent |
| Streaming vs Batch | Earlier interactive delivery versus cheaper async processing |
| Cache write vs read | Premium creation versus discounted reuse |
| Alias vs snapshot | Moving reference versus fixed behavior until retirement |
| Deprecated vs retired | Still works with end date versus no longer available |
| Host vs client vs server | Policy/LLM/UI versus connection/session versus capability execution |
| MCP tool vs resource vs prompt | Model-controlled action versus app context versus user template |
| Sampling vs tool call | Server asks host for LLM completion versus model asks server for action |
| Client tool vs server tool | Your environment executes versus Anthropic executes |
| Thinking vs redacted thinking | Reasoning block versus encrypted safety-redacted legacy reasoning |
| Authentication vs authorization | Who you are versus what you may do |
| HTTP success vs task success | 200 response versus complete, correct, validated result |

---

## 20. Scenario-to-Answer Decision Rules

- Chatbot forgot earlier information → application failed to resend relevant history.
- Response is cut off with HTTP 200 → inspect `stop_reason`; likely `max_tokens`.
- Intermittent 429 → honor `retry-after`, back off with jitter, reduce/constrain traffic.
- Intermittent 529/5xx → capped exponential backoff and jitter; circuit-break after sustained failure.
- 400 validation error → fix the request; do not retry unchanged.
- Must parse reliable JSON → `output_config.format` JSON schema plus semantic validation.
- Tool arguments must match a schema → strict tool definition plus business validation.
- Correct JSON shape but wrong values → silent semantic failure; add business/source checks and evals.
- Same large stable prefix repeatedly sent → prompt caching.
- Cache hit remains zero → inspect dynamic prefix content, tool changes/order, model switch, prefix length, TTL.
- Shared document with different questions → cache breakpoint after document, before question.
- Agent slows and ignores instructions after many tool calls → context accumulation; compact/clear/delegate/retrieve.
- Huge changing knowledge base → retrieval, not dumping the whole corpus.
- Fixed invoice processing pipeline → workflow/prompt chain, not autonomous agent.
- Open-ended research with unknown steps → agent may be justified with guardrails.
- Agent repeats identical calls → repeated-call detection, max steps, failure cap, and explicit stop condition.
- Two tool calls returned together → execute both and return all results in one user message.
- Tool times out/fails → matching `tool_result` with `is_error: true` and actionable detail.
- Wrong tool repeatedly selected → improve tool descriptions and evaluate selection.
- Need deeper reasoning → raise effort/use thinking after eval evidence.
- Simple high-volume classifier is slow → lower effort and/or use Haiku-class model.
- Thinking-enabled tool loop produces 400 after history cleanup → restore all signed thinking blocks unchanged.
- Model behavior changed without deploy → alias may have moved; pin and test snapshots.
- Pinned model receives deprecation notice → test replacement, canary, migrate before retirement.
- Team rule must be guaranteed in Claude Code → hook and/or permission, not `CLAUDE.md` text.
- Long repeatable checklist → skill, not bloated `CLAUDE.md`.
- Noisy repository exploration → subagent.
- External service access in Claude Code → MCP server.
- Need read-only code review → plan mode or read-only permission/tool policy.
- Sensitive action such as payment/deployment → code-enforced approval before action.
- Prompt says user is an admin → ignore as authorization; check SSO/authenticated identity in backend.
- Data/tool content tells agent to ignore rules → indirect prompt injection; contain through architecture.
- Need source-verifiable medical/policy answer → attach documents and use citations/grounding.
- Need customer preferences in future sessions → external store/memory; prompt cache is not durable memory.
- Need bulk nightly processing → Message Batches API.
- Need interactive chat → streaming Messages API.
- Need local/private-system tool execution → customer-controlled client tools/self-hosted harness.
- Need Anthropic-hosted agent runtime → Managed Agents, subject to data and feature requirements.
- Need embeddings → Anthropic offers no embedding model in the source; use a specialized provider such as Voyage AI.

---

## 21. Last-Day Recall Sheet

### Numbers and exact facts

- Required Messages fields: `model`, `max_tokens`, `messages`.
- Retry: 429, 500, 529; fix rather than retry 400/401/403/404/413.
- Cache breakpoints: maximum 4.
- Cache TTL: 5 minutes default; 1 hour optional.
- Cache write: 1.25× for 5 minutes; 2× for 1 hour.
- Cache read: about 0.1×.
- Old thinking minimum: 1024 `budget_tokens`, and budget must be below `max_tokens`.
- Batch: about 50% discount, asynchronous, up to 24 hours.
- Practice exam: 53 questions, 120 minutes, passing scaled score 720.

### Recite from memory

- Tool loop: request → `tool_use` → validate/authorize/execute → matching `tool_result` → continue.
- MCP: host owns LLM/consent/policy; client owns connection; server exposes and executes capabilities.
- Structured output: `required` means presence; `enum` means permitted values; neither proves truth.
- Context: compact summarizes; context editing clears; caching reuses.
- Claude Code: knowledge in `CLAUDE.md`; procedure in skill; isolation in subagent; enforcement in hook/permission; external integration in MCP.
- Models: alias moves; snapshot is fixed; pinning does not prevent retirement.
- Security: model is never an authorization boundary.
- Quality: HTTP 200 and valid JSON do not prove the task succeeded.

### Final exam checklist

- [ ] I can draw the tool-use loop without notes.
- [ ] I can explain MCP host, client, server, tool, resource, prompt, and sampling.
- [ ] I know cache order, breakpoint count, TTLs, costs, scope, and invalidators.
- [ ] I know old `budget_tokens` versus adaptive `output_config.effort`.
- [ ] I know why thinking blocks must be returned unchanged.
- [ ] I can distinguish API, Claude Code, Tool Runner, Agent SDK, and Managed Agents.
- [ ] I can choose between `CLAUDE.md`, rule, skill, subagent, hook, permission, and MCP.
- [ ] I can distinguish alias/snapshot and deprecated/retired.
- [ ] I can explain schema validity versus semantic correctness.
- [ ] I can identify direct and indirect prompt injection.
- [ ] I know when to use streaming, Batch, caching, retrieval, and compaction.
- [ ] I check the requirement before choosing the most sophisticated option.

---

## 22. Recommended Practice Plan

1. Read this reference once to build the complete map.
2. Take Mock Set 1 under timed, closed-book conditions.
3. For every miss:
   - Identify the concept, not only the answer letter.
   - Re-read its handbook chapter and “Common Exam Traps.”
   - Write one sentence explaining why each distractor is wrong.
4. Take Set 2 after one or two days and compare domain scores.
5. Repeat with Sets 3 and 4, spacing attempts.
6. Save Set 5 for the final preparation period.
7. Use practice mode only after the first timed attempt.
8. Revisit weak domains until you can explain them aloud without notes.
9. In the last days, review Sections 19–21 and Chapter 17 of the handbook.
10. Aim for at least 80% raw on unseen timed sets.

