## 9. Claude Code

### 9.1 What it is [B]

**Claude Code** is Anthropic's **agentic coding tool**. It runs in your terminal (also IDE extensions, a desktop app and the web) and works directly in your repository: it reads and edits files, runs commands and tests, searches code, uses git, and connects to external systems via MCP. It is a **harness around Claude models**: the agent loop, built-in tools, permissions, memory files, skills, subagents and hooks.

The **Claude Agent SDK** is the same harness packaged as a library for building your own agents.

### 9.2 Claude Code vs Claude API (your mock weakness) [C]

| Question | Claude API | Claude Code |
|---|---|---|
| Who runs the loop? | You | Claude Code |
| File, shell and git access? | Only via tools you define and execute | Built-in (Read, Write, Edit, Bash, Glob, Grep, WebFetch…) |
| Project instructions? | You put them in `system` | `CLAUDE.md` auto-loaded |
| Reusable procedures? | Your code (or API Skills via container) | **Skills** (`SKILL.md`), slash commands |
| Safety model | Your code | **Permission rules and modes**, hooks, sandboxing |
| Context management | You | Auto-compaction, `/compact`, `/clear`, subagents |
| Typical use | Product features inside your application | Developer productivity and agentic coding tasks |

Definitions on one side don't appear on the other. A tool in an API request isn't available in Claude Code; Claude Code's CLAUDE.md doesn't affect your API calls.

### 9.3 Instructions: CLAUDE.md and rules [B]

| File | Scope |
|---|---|
| Managed policy CLAUDE.md (OS-level path) | Whole organization; can't be excluded by users |
| `~/.claude/CLAUDE.md` | You, all projects (user/global) |
| `./CLAUDE.md` or `./.claude/CLAUDE.md` | The project, shared with the team via git |
| `./CLAUDE.local.md` | You, this project only (gitignored) |
| `.claude/rules/*.md` | Modular project rules; **`paths:` frontmatter** scopes a rule to matching files (loaded only when working on them) |

- Files in the working directory and **every parent** load at launch and are *concatenated*, not overridden. CLAUDE.md files in subdirectories load **on demand** when Claude reads files there.
- `@path/to/file` imports other files.
- `/init` generates a starter CLAUDE.md; `/memory` edits memory files.
- Keep each CLAUDE.md short (around 200 lines or less): build and test commands, conventions, "always do X".
- **CLAUDE.md is context, not enforcement.** To *guarantee* a behaviour (block an action), use **permissions or hooks**.

### 9.4 Skills and SKILL.md [B][C]

A **skill** is a folder with a **`SKILL.md`** (YAML frontmatter plus instructions) and optional supporting files (scripts, references, templates).

```
.claude/skills/release-notes/
  SKILL.md          ← frontmatter: name, description (+ optional fields)
  template.md
  scripts/collect.sh
```

```yaml
---
name: release-notes
description: Draft release notes from merged PRs. Use when asked for a changelog or release notes.
allowed-tools: Bash(gh *) Read          # pre-approves these for this turn
disable-model-invocation: true          # optional: manual /release-notes only
---
1. Collect merged PRs since the last tag ...
```

- **Locations:** personal `~/.claude/skills/`, project `.claude/skills/`, plugins, and enterprise-managed.
- **Invocation:** Claude **auto-invokes** when your request matches the `description`, or you type **`/skill-name`**. `disable-model-invocation: true` means manual only; `user-invocable: false` means Claude-only.
- **Progressive disclosure:** only the *description* sits in context up front. The full SKILL.md loads when invoked, and supporting files are read only if needed. That's why many skills can be installed cheaply.
- **Skills replaced custom slash commands.** The older `.claude/commands/*.md` still work and create the same `/name` command; skills add supporting files and auto-invocation.
- **(version-dependent)** Agent Skills also exist on the **API** (attached through a code-execution container) and in claude.ai. Same SKILL.md format, different surface.

### 9.5 Skills vs rules vs subagents vs hooks vs MCP [C]

| Thing | What it is | Loaded/run | Use for |
|---|---|---|---|
| **CLAUDE.md / rules** | Always-on (or path-scoped) instructions | Every session (rules with `paths`: when relevant) | Conventions, commands, standards |
| **Skill** | Packaged procedure plus resources | On demand (by description or `/name`) | Repeatable multi-step tasks: "how to do X here" |
| **Subagent** (`.claude/agents/*.md`) | Separate Claude with **its own context window**, prompt, tool allowlist and model | Delegated by the main agent or explicitly | Isolating noisy work (search, review), parallelism, specialized roles |
| **Hook** | **Your shell command** run on lifecycle events (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SessionStart`…) | Deterministically, by the harness | Enforcement: block commands, auto-format, logging, notifications |
| **MCP server** | External tools, resources and prompts over a protocol | Connected via `claude mcp add` or `.mcp.json` | Access to GitHub, DBs, Jira, internal APIs |

Rule of thumb: **knowledge → CLAUDE.md; procedure → skill; isolation → subagent; guarantee → hook or permission; external capability → MCP.**

### 9.6 Permissions [B]

- Tools that change things (Edit, Write, Bash, network) ask before running by default. Reads are generally allowed.
- **Rules** in `settings.json` under `permissions.allow` / `ask` / `deny`, for example `Bash(npm test)`, `Bash(git push *)` or `Read(./.env)` in deny. Deny wins.
- **Settings scopes:** managed (enterprise policy, highest) > command line > local `.claude/settings.local.json` > project `.claude/settings.json` (shared) > user `~/.claude/settings.json`.
- **Permission modes (version-dependent names):** `default` (ask), `acceptEdits` (auto-accept file edits), `plan` (read-only planning, no changes), `bypassPermissions` (skip prompts; only for sandboxes). Newer versions add an auto-approval mode with safety checks.
- `/permissions` views and edits the rules.

### 9.7 Agentic coding workflow and git [D]

- Effective loop: **explore → plan (plan mode) → implement → verify (tests, lint) → commit**. Give Claude a way to verify its work, such as tests or screenshots.
- Claude Code reads git history and diffs, writes commits and messages, resolves conflicts, and creates PRs (with `gh`). It runs in CI and GitHub Actions or headless with `claude -p "…"` (non-interactive).
- Useful commands: `/init`, `/clear` (new context), `/compact`, `/agents`, `/mcp`, `/hooks`, `/permissions`, `/model`, `/rewind` (checkpoints).

### Common Exam Traps

- The API doesn't read CLAUDE.md, run hooks, or have built-in file tools. That's Claude Code (or the Agent SDK).
- A **skill** isn't a **subagent**. A skill adds instructions or procedure into the current context (unless configured to fork); a subagent has its *own* context window.
- **CLAUDE.md is advisory context**; **hooks and permissions are enforcement**.
- Skills load **on demand** via their description; CLAUDE.md loads **every session**.
- A skill's `description` decides auto-invocation. A vague description means it never triggers.
- `.claude/settings.json` is shared (committed); `.claude/settings.local.json` and `CLAUDE.local.md` are personal.
- `bypassPermissions` isn't a productivity default; it's for isolated sandboxes.

### Check Yourself

1. The team wants "always run `pytest -q` before committing" enforced, not merely suggested. CLAUDE.md, skill, or hook?
2. A 30-step deployment checklist used weekly. CLAUDE.md or skill?
3. Exploring a huge codebase floods the main context. What feature helps?
4. Where do personal, uncommitted project preferences go?
5. A developer defines a `run_sql` tool in their API app and expects Claude Code to have it. Correct?

**Answers**

1. A hook (`PreToolUse` on the commit command, or a `Stop`/`PostToolUse` check), plus possibly a permission rule. CLAUDE.md alone is advisory.
2. A skill. It's a procedure loaded on demand; keep CLAUDE.md short.
3. A subagent (separate context; returns a summary). The built-in Explore agent does this.
4. `CLAUDE.local.md` (and `.claude/settings.local.json` for settings).
5. No. API tool definitions exist only in that API request. In Claude Code you'd expose it via an MCP server (or a script the Bash tool can run).
