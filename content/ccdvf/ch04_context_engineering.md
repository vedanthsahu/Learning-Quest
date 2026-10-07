## 4. Context Engineering

### 4.1 The context window [B]

The context window is the total tokens the model can attend to in one request: **system + tools + every message (including tool results and thinking) + the output being generated**. Current Claude models offer up to **1M tokens** (Haiku 4.5 offers 200K) **(version-dependent)**. A bigger window is capacity, not a strategy.

If input plus `max_tokens` exceeds the window, the request errors. Claude doesn't silently drop the oldest messages for you.

### 4.2 Context accumulation [B][C]

Because the API is stateless (Ch. 1), every turn resends history. In agents it's worse: each tool call appends a `tool_use` *and* its `tool_result` (logs, file contents, search results).

```
turn:      1      5       20        60
input:   2K → 18K → 140K → 600K+     cost ↑  latency ↑  quality ↓ (signal buried in noise)
```

What happens if you do nothing: cost and latency rise every turn, important early instructions compete with mountains of stale tool output, and eventually you hit the limit and the request fails. **Context does not forget on its own.** Something has to remove or condense it: your code, a server feature, or the harness.

### 4.3 Tools for managing it

| Technique | What it does | Owner |
|---|---|---|
| **Explicit pruning** | Your app drops or truncates old turns and tool results | You |
| **Summarization / compaction** | Replace old history with a summary | You, the API **(beta compaction)**, or Claude Code (`/compact`, auto-compact) |
| **Context editing** | API clears old tool results or thinking blocks automatically **(beta)** | API |
| **Retrieval (RAG)** | Fetch only the relevant chunks per question | You |
| **Memory / external state** | Write facts to a file or DB and re-read on demand (memory tool, notes files) | You or the harness |
| **Subagents** | Do noisy work in a separate context and return only the result | Harness (Claude Code, Agent SDK) |

**(version-dependent)** API names: server-side compaction (`compact-2026-01-12` beta) *summarizes*; context editing (`context-management-2025-06-27`, strategies such as `clear_tool_uses_…`) *clears*. If you use compaction you must append the full `response.content`, including compaction blocks, back into history.

### 4.4 Retrieval vs dumping everything in [A→B]

You know RAG. The Claude-specific point: a 1M window tempts you to paste the whole corpus. Prefer retrieval when:

- the corpus is larger than the window or changes often;
- cost and latency matter (every token is billed every turn unless cached);
- precision matters (irrelevant context measurably degrades answers).

Prefer whole documents in context when the task needs cross-document reasoning over a bounded set, such as "compare these 3 contracts". Then **cache that stable prefix** (Ch. 7).

### 4.5 Prioritization and placement [B]

- Put the most important, stable instructions in `system`; reference material next; the live question last.
- Keep only what the *current* step needs. Old tool outputs can usually be summarized to one line ("searched logs; no errors after 14:02").
- Mind caching: pruning or editing **early** history breaks the cached prefix. Prefer append-only histories plus periodic compaction over constantly rewriting turn 3.

### 4.6 Context in agents [D]

Long-running agents need a **context budget policy**: what's always kept (goal, constraints, current plan), what's summarized (completed sub-tasks), and what's dropped (raw tool dumps). Claude Code does this with auto-compaction, `/clear`, `/compact` and subagents. In your own loop you implement it, or use the API's compaction and context-editing features.

### Common Exam Traps

- Context doesn't automatically forget. Accumulation continues until you prune, summarize or hit the limit.
- A larger context window doesn't fix irrelevant-context degradation; retrieval and pruning do.
- Compaction (summarize) is not context editing (clear). Both differ from caching (which reuses, not shrinks).
- Rewriting early history invalidates the cache from that point on.
- Thinking and tool results count toward context and cost.

### Check Yourself

1. An agent's latency triples after 40 tool calls, and answers start ignoring the original constraints. Diagnose and propose two fixes.
2. Which reduces tokens sent: prompt caching or compaction?
3. You must answer questions across 10,000 internal docs that change daily. Long context or retrieval?
4. Where do you keep the agent's goal so it survives summarization?

**Answers**

1. Context accumulation from tool results is burying the constraints. Fixes: compact or summarize completed steps, clear old tool results (context editing), push noisy work into subagents, and keep constraints in the system prompt.
2. Compaction reduces tokens. Caching makes repeated tokens cheaper and faster but still sends them.
3. Retrieval. Too large and too volatile to stuff into context.
4. In the system prompt or a persistent "always keep" block, not in early messages that get summarized away.
