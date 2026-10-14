## Mock Exam Set 3: Question Paper

**53 questions · 120 minutes · pass target 72%** (5 are multiple-response; they say how many to choose and are scored all-or-nothing).

**[Take Set 3 in timed exam mode](/content/ccdvf/mock-exams/index.html?set=3)** (opens the exam runner in a new tab, with a timer, flagging, scoring and a per-domain breakdown).

To work from this page instead: write your answers down, then check them against the matching *Set 3: Answer Key* chapter. This is an unofficial practice paper written to the published CCDV-F blueprint, not real exam content.

---

### Question 1

Developers ask an assistant about a library version released after the model's training cutoff, and it confidently describes APIs that don't exist. What is the best remedy?

- **A.** Use a larger `max_tokens` so it has room to recall the newer library APIs in detail
- **B.** Tell the model in the system prompt that its training data is fully up to date
- **C.** Supply current docs at request time (retrieval or web search) and answer from them
- **D.** Raise the temperature so the model considers newer possibilities beyond its usual answers

### Question 2

To decide whether a code change is safe, a system sends the same diff to three independent Claude reviews with slightly different prompts and flags the change if two or more raise a security concern. Which pattern is this?

- **A.** Parallelization (voting)
- **B.** Routing
- **C.** Evaluator–optimizer
- **D.** Prompt chaining

### Question 3

During a regional incident, the Claude API returns sustained 529 errors for 15 minutes. Every request in the service retries up to its limit, threads pile up, and unrelated features slow down. What pattern would have helped most?

- **A.** Raise every timeout to 10 minutes
- **B.** Retry immediately with no backoff to get through faster
- **C.** A circuit breaker: after sustained failures, pause calls for a cooldown and degrade gracefully (cache, fallback, "try later")
- **D.** Send each request twice in parallel and use whichever returns first

### Question 4

After automatic compaction, a long-running agent sometimes "forgets" its multi-step plan and redoes steps it already finished. What is the most robust remedy?

- **A.** Ask Claude to repeat the full plan at the start of every message so it stays in recent context
- **B.** Use a model with a bigger context window so compaction triggers far less often during the run
- **C.** Keep the plan and progress in durable external state that the agent re-reads
- **D.** Turn compaction off for the whole run so that the plan is never summarized away from the history

### Question 5

A developer stores a third-party payment API key in the system prompt with the note "never reveal this key", so that Claude can include it in requests. What is the correct design?

- **A.** Keep it in the system prompt; the instruction prevents leaks
- **B.** Split the key across two messages
- **C.** Keep secrets out of prompts: the tool reads the key from a secret store and calls the payment API server-side
- **D.** Move the key to the first user message

### Question 6

A user returns a week later to continue a support conversation in a web app built on the Messages API. What must the application do for Claude to have the earlier context?

- **A.** Nothing; the API keeps each conversation for 30 days and restores it automatically on the next call
- **B.** Load the stored history (or a summary of older parts) from its own database and resend it
- **C.** Send the same `metadata.user_id`, and the API restores the conversation
- **D.** Re-enable the original prompt cache entry, which holds the full conversation from the previous week

### Question 7

An orchestrator agent delegates mechanical subtasks (extracting fields from hundreds of short documents) to subagents, then synthesizes the results. Which model allocation is most cost-effective?

- **A.** The smallest model for the orchestrator and the largest model for the extraction subagents, since extraction volume is higher
- **B.** Use the most capable model everywhere, for consistency across all steps
- **C.** The same model at maximum effort for every step
- **D.** A fast Haiku-class model (or low effort) for mechanical subagents; the stronger model for orchestration

### Question 8

To save tokens, an app deletes the oldest exchange from the beginning of the conversation on every turn. Prompt-cache reads collapsed to almost zero. What is a better strategy?

- **A.** Delete from the middle of the conversation instead
- **B.** Disable caching for long conversations
- **C.** Keep the history append-only and compact it periodically in larger steps, so the cached prefix stays stable
- **D.** Move the whole history into the system prompt each turn

### Question 9

A team starts using Claude Code on an existing repository and wants a good starting `CLAUDE.md` that captures build commands and conventions. What is the recommended approach?

- **A.** Leave `CLAUDE.md` empty; Claude Code learns the conventions automatically between sessions
- **B.** Create one `CLAUDE.md` per file in the repository
- **C.** Paste the entire README and every design document into `CLAUDE.md`, so nothing about the project is ever missed
- **D.** Run `/init` to generate a starter `CLAUDE.md`, then trim it to commands, conventions and gotchas

### Question 10

A team runs 10,000 batch requests that all share the same 20K-token reference document, followed by a different question each. They want to minimize cost further. What is accurate?

- **A.** Mark the shared prefix with `cache_control`; caching and batch discounts combine, though hits are less predictable
- **B.** Prompt caching can't be used with the Batch API
- **C.** The batch discount already includes caching, so any `cache_control` markers in batch requests are ignored
- **D.** Switch the batch requests to streaming mode, so that they qualify for both the batch discount and the caching discount

### Question 11

A batch ETL job calls the Messages API without streaming and with a very large `max_tokens` for long transformations. The SDK raises an error recommending streaming for requests expected to take a long time. What is the appropriate change?

- **A.** Disable the SDK's timeout entirely
- **B.** Switch to a model with a larger context window so long transformations fit in a single request
- **C.** Stream these long requests (accumulating the final message), or split them into smaller units
- **D.** Lower `max_tokens` until the warning disappears, even if some outputs end up truncated as a result

### Question 12

A company re-scores 3 million archived support tickets for a quarterly report due in two weeks. Which change cuts cost the most without hurting the requirement?

- **A.** Run the job through the Message Batches API: about 50% cheaper, asynchronous, and well within the deadline
- **B.** Send synchronous requests during off-peak hours
- **C.** Use maximum effort to avoid re-runs
- **D.** Stream the responses

### Question 13

A developer builds the user turn that returns tool output as `[{"type": "text", "text": "Here are the results:"}, {"type": "tool_result", "tool_use_id": "toolu_01", "content": "..."}]`. The API returns a 400. What is wrong?

- **A.** `tool_result` blocks must come first in that user message's content; text can only follow them
- **B.** The `tool_use_id` must be omitted whenever a text block is present in the same message
- **C.** `tool_result` blocks must be sent in the system prompt
- **D.** Tool results must be sent in an assistant-role message that directly follows the original tool call

### Question 14

A team wants Claude Code to create and update tickets in their internal ticketing system, which has a REST API. Which extension mechanism fits best?

- **A.** A subagent named "ticketing"
- **B.** A `CLAUDE.md` section listing the endpoints
- **C.** A `Stop` hook
- **D.** An MCP server that wraps the ticketing REST API and exposes tools such as `create_ticket`

### Question 15

Which Claude Code hook event can **block** a tool call before it executes, for example to stop `Bash` commands matching a dangerous pattern?

- **A.** `PreToolUse`
- **B.** `SessionStart`
- **C.** `Notification`
- **D.** `PostToolUse`

### Question 16

A browsing agent reads arbitrary web pages and can call an HTTP request tool. Its context also contains an internal API token for convenience. Which TWO changes most reduce the exfiltration risk from malicious pages? (Choose TWO.)

- **A.** Tell the model in the system prompt never to reveal the token under any circumstances
- **B.** Base64-encode the token in the prompt so it isn't readable
- **C.** Keep secrets out of the model's context; tools authenticate server-side
- **D.** Restrict outbound requests (allow-lists or approval), especially after reading untrusted pages
- **E.** Use temperature 0 so the agent's behaviour is predictable

### Question 17

Which TWO statements about retry behaviour with the official Anthropic SDKs are correct? (Choose TWO.)

- **A.** Your own retry layer should add jitter so clients don't retry in lockstep
- **B.** Retries with no backoff are fine for 529 errors, since the overload is usually brief
- **C.** A 404 for a model ID is transient and should be retried a few times
- **D.** The SDKs retry connection errors, 429 and 5xx automatically, twice by default, with backoff
- **E.** A 401 should be retried after one second, because new keys can take time to propagate

### Question 18

Which statement correctly distinguishes a **deprecated** model from a **retired** one?

- **A.** A deprecated model can only be called through the Batch API until it is retired, at a higher price
- **B.** They mean the same thing
- **C.** Deprecated still works until a set retirement date; retired no longer serves requests
- **D.** Deprecated models return errors, while retired models keep working for existing customers indefinitely

### Question 19

A reporting agent only needs to read sales data, but it was given database credentials with full write access "to be safe". Which principle does this violate, and what is the fix?

- **A.** Defence in depth: add a second write-enabled account as a backup in case the first one fails
- **B.** Least privilege: use read-only, table-scoped credentials
- **C.** Fail-safe defaults: add a prompt rule forbidding writes, and keep the full-access credentials
- **D.** Separation of duties: let the model decide when a write is genuinely needed and log each one

### Question 20

A team is deciding whether an autonomous agent is appropriate for a task. Which finding is the strongest argument **against** using an agent?

- **A.** The task requires several tool calls in an order that depends on intermediate results
- **B.** Mistakes would be undetectable and irreversible, with no tests or reviews
- **C.** The task is valuable to the business and its users
- **D.** Claude performs well on this type of task in evals

### Question 21

For one turn, a team wants Claude to answer in plain text without calling any tools, but it wants to keep the same tool definitions in the request so the cached prefix isn't invalidated. Which option fits?

- **A.** Set `tool_choice: {"type": "any"}` so that Claude answers directly without choosing a tool
- **B.** Set `disable_parallel_tool_use: true` so no tool calls can be made during that turn
- **C.** Remove the `tools` array for that one request, then add it back on the next turn as before
- **D.** `tool_choice: {"type": "none"}`, keeping the tools defined

### Question 22

A team needs full control over every step of a simple agent: custom logging of every request, custom retry logic per tool, and no extra dependencies beyond the base SDK. Which approach fits best?

- **A.** Managed Agents, configured with the team's custom logging and retry settings for each tool
- **B.** The Claude Agent SDK, with all built-in tools enabled and the team's logging added through hooks
- **C.** A manual tool-use loop on the Messages API
- **D.** Claude Code in headless mode, wrapped by a script that logs every request it makes

### Question 23

In a long multi-turn chat with a stable system prompt, the team wants each new request to reuse everything from the previous turns cheaply. Where should caching be applied?

- **A.** Nowhere; caching works only for documents, not for conversations, so multi-turn chats can't use it
- **B.** Only on the system prompt and never on the messages, because conversation turns change too often to be cached
- **C.** On the latest message (or via automatic caching), so each request reads the prior prefix and writes the new tail
- **D.** On the first user message only

### Question 24

A deployment agent can run tests, build images and deploy to staging and production. Where does human approval belong?

- **A.** Before running the unit tests, so a human confirms the test command is safe
- **B.** Nowhere, as long as the full test suite passes before each deployment
- **C.** Before every image build, so each build is reviewed by an engineer
- **D.** Before deploying to production

### Question 25

A request using a server tool (web search) returns `stop_reason: "pause_turn"` after a long multi-step search. What should the application do?

- **A.** Execute the web search locally in your own code and return the results as a `tool_result` block on the next request
- **B.** Append the assistant content as-is and send a follow-up request so Claude continues the paused turn
- **C.** Treat it as a failure and retry the original request from scratch with a longer timeout
- **D.** Raise `max_tokens`, because `pause_turn` means the output was truncated

### Question 26

An e-commerce checkout calls Claude to flag suspicious order notes before payment. The product requirement is a decision within 2 seconds, at high volume, and the task is a simple three-way classification. Which approach best fits?

- **A.** Synchronous calls to a small, fast model with low effort and a compact output, checked on evals
- **B.** Stream the response so the first tokens arrive sooner
- **C.** Use the most capable model at maximum effort so that no suspicious note is ever misclassified at checkout
- **D.** Queue the notes for the Message Batches API and read the results once checkout completes

### Question 27

For a straightforward three-step task (fetch a record, summarize it, email the summary), an engineer proposes six cooperating agents with a planner, a critic and a supervisor. What is the main concern?

- **A.** Multi-agent systems can't use tools
- **B.** Multi-agent adds token cost, latency and coordination failures that a simple sequential task doesn't justify
- **C.** Agents can't pass data to one another
- **D.** Each agent needs its own API key

### Question 28

A developer asks a current model, "Can you suggest some improvements to this function?" Claude replies with suggestions but doesn't change the code. The developer wanted the edits made. Which prompt follows current guidance?

- **A.** "Can you maybe suggest a few improvements to this function, if you have time?"
- **B.** "Think carefully about whether any improvements to this function could possibly be made, and consider them."
- **C.** "Suggest improvements!!! IMPORTANT!!!"
- **D.** "Refactor this function to improve readability and performance, then return the updated code."

### Question 29

A service regularly hits its **input**-tokens-per-minute limit. Which TWO changes most directly help? (Choose TWO.)

- **A.** Cut unnecessary input: trim stale history, retrieve fewer chunks, drop unused tools
- **B.** Remove backoff from the retry logic so queued requests finish sooner
- **C.** Create additional API keys in the same organization to spread the input tokens across them
- **D.** Raise `max_tokens` on each request
- **E.** Smooth traffic with a queue and concurrency control

### Question 30

Monitoring shows that some streamed responses return HTTP 200, start producing text, and then end without a `message_stop`. The stream contains an `error` event of type `overloaded_error`. How should the client handle this?

- **A.** Disable streaming permanently, since streamed connections are what cause the overload errors
- **B.** Handle stream `error` events: treat the output as incomplete and retry with backoff
- **C.** Ignore it, because the initial HTTP 200 status means the full response was delivered successfully
- **D.** Raise `max_tokens` so the stream has enough budget to reach `message_stop` before ending

### Question 31

Answer quality dropped last Tuesday, but nobody can tell which of three prompt edits deployed that week caused it, or which requests used which version. What practice would have prevented this?

- **A.** Use the model family alias so newer models fix regressions
- **B.** Disable prompt caching so prompt changes apply instantly
- **C.** Version prompts as configuration, deploy them deliberately, and log the prompt version and model ID with each request
- **D.** Keep prompts in a shared document that people edit directly

### Question 32

Claude emits three parallel `tool_use` blocks, but the backend they call can't handle concurrent requests. What is the simplest correct handling?

- **A.** Ignore every call except the first, since the backend can only handle one at a time anyway
- **B.** Return an error for two of the calls so Claude retries them later
- **C.** Run the calls one after another in your code, then return all three results in a single user message
- **D.** Return the three results in three separate user messages, one at a time, as each sequential call finishes

### Question 33

A shopping assistant must answer questions about a catalogue of 2 million products whose prices and stock change hourly. Which design is most appropriate?

- **A.** Rely on the model's training data for product details, which already covers most major retailers' items
- **B.** Include the top 1,000 products in a fixed prompt and tell Claude to answer only about those items
- **C.** Put the full catalogue in the system prompt and cache it, so every product is always available to Claude
- **D.** A live search or lookup tool (or retrieval) over the current catalogue

### Question 34

A team enables adaptive thinking with the thinking display set to omitted. The UI shows only short answers, yet output-token usage and cost are far higher than the visible text suggests. Why?

- **A.** Omitted thinking is free, so the extra cost must be coming from cache writes on each request
- **B.** Thinking still happens and is billed as output, even when not displayed
- **C.** Omitted thinking is billed as input tokens, which are cheaper, so it shouldn't change the bill much
- **D.** The API double-counts output tokens whenever streaming is enabled alongside thinking

### Question 35

A support agent can issue refunds through a `issue_refund` tool. Which TWO guardrails are most appropriate? (Choose TWO.)

- **A.** Code validation of each refund (order exists, owned by customer, amount ≤ paid) plus per-run caps
- **B.** Streaming responses so supervisors can watch the agent work in real time
- **C.** Code-enforced human approval for refunds above a threshold
- **D.** A system-prompt instruction to be careful with refunds and to double-check amounts
- **E.** A larger model, so mistakes are less likely

### Question 36

Which TWO statements about prompt caching are correct? (Choose TWO.)

- **A.** Output tokens are cached and reused across requests with the same prompt
- **B.** `cache_read_input_tokens` above 0 on a repeat request confirms a hit
- **C.** A request can contain up to 4 cache breakpoints
- **D.** Enabling caching makes the very first request cheaper
- **E.** Caches are shared across organizations that send identical prompts

### Question 37

An MCP server fetches a long report and needs an LLM to summarize it before returning results. The server must not hold its own model API key, and the host should stay in control of model use. Which MCP feature fits?

- **A.** Prompts
- **B.** Resources, which let the server attach the report for the host to summarize later
- **C.** Roots, which grant the server access to the host's model within defined boundaries
- **D.** Sampling: the server asks the client/host to run a completion for it

### Question 38

A team adds `cache_control` at the end of a stable system prompt, but `cache_read_input_tokens` stays at 0 across requests that look identical. What should they check first?

- **A.** Whether every request sets temperature to 0, which caching requires to match prefixes exactly
- **B.** Whether the prefix bytes truly match (timestamps, IDs, tool order) and meet the minimum length
- **C.** Whether streaming is enabled, since streamed requests bypass the prompt cache entirely on most current models
- **D.** Whether `max_tokens` is above 4,096

### Question 39

A debugging agent starts failing with context-limit errors after about 50 steps, even though the user's messages are short. What is the most likely cause?

- **A.** Tool calls and results (logs, file contents, search output) accumulate, and the whole history is resent each turn
- **B.** The system prompt grows by itself every turn
- **C.** The model's context window shrinks as the conversation ages
- **D.** `max_tokens` is counted once per step

### Question 40

An app lets users upload a screenshot of an error dialog and ask "what does this mean?" How should the request be structured?

- **A.** A user message with an image block (base64, URL or file reference) followed by a text block with the question
- **B.** Paste the base64 string into the system prompt text
- **C.** Send the image in one request and the question in the next
- **D.** Describe the image in words yourself, since Claude can't see images

### Question 41

A legal research tool answers questions over long court opinions, and answers sometimes include claims that aren't in the opinion. Which prompting technique most directly grounds the answers?

- **A.** Ask Claude to answer as briefly as possible, which leaves less room for unsupported claims to appear
- **B.** Extract the relevant quotes first, then answer only from those quotes
- **C.** Place the question before the opinion so Claude knows what to look for while it reads the text
- **D.** Raise the temperature so that answers vary and the unsupported claims average out across runs

### Question 42

A prompt's instructions say "answer in two sentences", but its five examples each show four-sentence answers. Output length is inconsistent. What is the fix?

- **A.** Make the examples consistent with the instruction (two-sentence answers), since contradictions confuse the model
- **B.** Remove the instruction and keep the examples
- **C.** Add three-sentence examples to average them out
- **D.** Set `max_tokens` to 50 to force short answers

### Question 43

A pipeline always wants the *final answer* in a fixed JSON shape. Claude doesn't need to choose between actions. Which mechanism fits best?

- **A.** A tool definition that Claude may or may not call, with `tool_choice` left on `auto`
- **B.** Stop sequences that cut the response off at the closing brace of the JSON object
- **C.** A prompt instruction to "respond in JSON" with no schema, plus a JSON parser that retries on failure
- **D.** Structured outputs: a JSON schema in `output_config.format`

### Question 44

A developer worries that installing 40 skills in Claude Code will bloat every session's context. How do skills actually load?

- **A.** Skills are compiled into the model ahead of time and use no context at all, however many are installed
- **B.** Skills load only if they are listed by name in the project's `CLAUDE.md`
- **C.** Every skill's full `SKILL.md` and supporting files load at the start of each session
- **D.** Only names and descriptions load up front; full `SKILL.md` on invocation, supporting files as needed

### Question 45

A developer's `~/.claude/settings.json` allows `Bash(git push *)`, but the project's `.claude/settings.json` denies `Bash(git push *)`. What happens when Claude Code tries to run `git push origin main` in that project?

- **A.** The user setting wins, because personal settings always override project settings
- **B.** The push is blocked: deny rules take precedence over allow rules, whichever scope defines them
- **C.** Claude Code alternates between the two rules depending on which file was edited most recently
- **D.** The project rule is ignored unless the developer runs `/permissions` to activate it

### Question 46

A team builds an eval suite for a summarization feature *after* launch and finds it hard to decide whether a score of 78% is good or bad. What was missing?

- **A.** Success criteria defined up front: specific, measurable targets such as factual consistency ≥ 95%
- **B.** More random test inputs
- **C.** Running the whole eval suite at temperature 0, so that every score is exactly reproducible between runs
- **D.** A larger, more capable model to grade the summaries more strictly than the current one

### Question 47

After migrating to a newer Claude generation, a team sees that the same documents produce noticeably more input tokens, and costs rose even though traffic didn't change. What is the most likely explanation?

- **A.** The new model bills cached tokens at the full input price, which inflates every repeated request
- **B.** The documents were silently translated before processing
- **C.** The new tokenizer maps the same text to more tokens; re-measure with `count_tokens`
- **D.** Token counts are random and vary from request to request, so occasional increases are expected

### Question 48

A team using the Claude Agent SDK wants to give the agent a custom `lookup_customer` function implemented in their own Python code. What is the standard approach?

- **A.** Describe the function in the system prompt; the SDK generates a callable stub automatically
- **B.** Custom tools aren't supported; use Managed Agents instead
- **C.** Edit the SDK's built-in tool list in its installed source code, then rebuild the package with the new function
- **D.** Expose it as an MCP tool (for example via an in-process SDK MCP server) and allow it in the options

### Question 49

A team migrates a prompt that ends with a partial assistant turn (`{"role": "assistant", "content": "{"}`) to force JSON output. On a current model, the request returns HTTP 400. What is the recommended fix?

- **A.** Move the prefill text into the last line of the system prompt
- **B.** Remove the prefill and use structured outputs (a JSON schema in `output_config.format`) to guarantee the shape
- **C.** Prefill with `[` instead of `{`
- **D.** Change the prefill message's role to `user`

### Question 50

A financial firm's agent uses two tools: `query_ledger`, which reaches an internal API that isn't reachable from the internet, and Anthropic's web search tool. Which statement correctly describes where each tool executes?

- **A.** Claude executes `query_ledger` directly once it has been given the internal endpoint URL in the prompt
- **B.** Both tools are executed by the firm's application, which calls a search provider for web results itself
- **C.** Both tools are executed by Anthropic's infrastructure, which connects to the ledger API over the firm's VPN
- **D.** `query_ledger` runs in the firm's app; web search runs on Anthropic's side

### Question 51

Deep into a long Claude Code session on one feature, the context is crowded with old exploration, but the developer wants to keep working on the *same* feature with its key decisions intact. Which command fits?

- **A.** Exit, then run `claude -p` with a summary of the work so far
- **B.** `/compact`, optionally with instructions on what to keep
- **C.** `/clear`, then summarize the key decisions again from memory
- **D.** `/init`

### Question 52

An agent has 30 tools, many with overlapping names such as `get_data`, `fetch_data` and `data_lookup`. Claude often picks the wrong one. What is the best improvement?

- **A.** Consolidate overlapping tools; give the rest distinct names and clear when-to-use descriptions (tool search for huge catalogues)
- **B.** Force `tool_choice: any` so Claude always calls something
- **C.** Raise effort so Claude reasons more about tool choice
- **D.** Paste all 30 schemas into the system prompt as text

### Question 53

A tax-preparation assistant gives generic, shallow answers. What is the simplest prompt change most likely to improve domain depth and tone?

- **A.** Give Claude a specific role in the system prompt (e.g. a senior tax accountant), with audience and expectations
- **B.** Put the role in an assistant message at the start of `messages`
- **C.** Raise `max_tokens` so that Claude has enough room to give deep, detailed answers on every tax question it receives
- **D.** Add a user message asking Claude to "please be smart and thorough"
