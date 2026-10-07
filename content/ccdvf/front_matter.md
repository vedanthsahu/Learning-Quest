## 0. How to Use This Handbook

### 0.1 What this is

A compact, exam-oriented map of the Claude developer ecosystem for an engineer who already knows backend systems, RAG, async Python and production AI. It skips generic programming and generic LLM theory. It concentrates on **Claude-specific mechanics** and the **wording traps** that cost you marks on the mocks (81.1% and 75.5% before study).

It is deliberately short. Use it alongside the official course and docs, not instead of them.

### 0.2 Don't read it passively

For every chapter:

1. Learn the concept.
2. Understand where it sits in the architecture.
3. Study the example or flow.
4. Read **Common Exam Traps**.
5. Answer **Check Yourself** (Tier 1 chapters) *before* reading the answers.
6. Explain the concept out loud in two sentences.
7. Mark the **Weakness Tracker** in the last chapter.
8. After each practice exam, come back to the chapters behind every miss.

### 0.3 The four labels

Each section marks what kind of knowledge it is:

| Label | Meaning | How to treat it |
|---|---|---|
| **[A] General** | You already know this as an engineer | Skim; just map it to Claude's vocabulary |
| **[B] Claude-specific** | Anthropic's own mechanics and names | Learn precisely |
| **[C] Exam trap** | Wording that causes wrong answers | Memorize the distinction |
| **[D] Production** | Matters for real systems, less often tested | Understand the reasoning |

### 0.4 Version-dependent details

Claude's API moves fast. Where a detail depends on the model or API version, this book marks it **(version-dependent)** and gives the stable concept underneath. Exams are written at a point in time. If an option uses older terminology (for example `budget_tokens` for thinking, or assistant "prefill"), recognize it as a valid concept from that era. Then answer from the principle being tested.

Facts here were checked against Anthropic's API reference material as of **October 2026**. When in doubt, the live docs win.

### 0.5 The whole ecosystem on one page

Everything connects. Keep this picture in mind while reading:

```
                         ┌──────────────── YOUR APPLICATION (stateless calls) ───────────────┐
 user ──► app ──►  POST /v1/messages  { model, max_tokens, system, messages, tools, ... }     │
                         │                                                                    │
                         ├─ prompt engineering  → what goes in system/messages               │
                         ├─ context engineering → how much history/retrieval goes in         │
                         ├─ prompt caching      → reuse the stable prefix cheaply             │
                         ├─ thinking / effort   → how hard Claude reasons                     │
                         ├─ tool use            → Claude asks, YOUR code executes             │
                         ├─ structured outputs  → schema-constrained JSON                     │
                         └─ evaluation          → prove it works, catch silent failures       │
                                                                                               │
 Agents      = a loop of tool-use calls with state, guardrails and termination                │
 MCP         = a standard protocol to plug tools/resources into a host (Claude Code, apps)    │
 Claude Code = Anthropic's agentic coding harness: built-in tools, permissions, CLAUDE.md,     │
               skills, subagents, hooks, MCP — on top of the same models                       │
 Deployment  = who runs the loop, who runs the tools, where the data lives                     │
 Lifecycle   = model IDs, aliases, deprecation, migration, regression testing                  │
```

### 0.6 Reading order

Tier 1 (Parts 1–2) is where your misses were: API mechanics, Claude Code, skills, caching, thinking and effort, MCP boundaries, model lifecycle, context accumulation, structured output and semantic validation. Do it first and do it twice. Tier 2 (Part 3) is mostly your existing backend knowledge expressed in Claude terms. Tiers 3–4 (Part 4) are recognition only. The final chapter is your last-day sheet.
