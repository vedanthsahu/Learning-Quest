## 46. Nova Stage 3: Streaming Responses

### 46.1 What Broke

Even though Stage 1 already streamed responses at the token level (§44.9), as conversation history (§45) grows, prefill time (§15.7) before the first token increases — users now experience a noticeably longer pause before Nova starts responding at all, especially in long-running conversations with substantial summarized+verbatim history.

### 46.2 Why

Time-to-first-token is dominated by prefill — processing the entire input context (system prompt + history summary + verbatim recent turns, §45.4) before generation begins (§15.7) — meaning Stage 2's context-management solution, while solving the memory problem, directly increased the token volume processed during prefill on every single turn.

### 46.3 Candidates and Their Costs

**Option A — reduce context further (smaller verbatim window, more aggressive summarization):** Directly reduces prefill time, but degrades the memory quality Stage 2 was built to provide — a direct tension with §45's chosen tradeoff. **Option B — adopt prompt caching for the stable portions of the prompt:** Since the system prompt and (for a few turns at a time) the running summary are stable across consecutive requests within a conversation, caching their prefill computation (§24.6) avoids reprocessing them every turn. **Option C — invest in a faster serving path (self-hosted inference with Flash Attention, §18.5) for lower raw prefill latency:** A legitimate lever, but a substantial infrastructure investment unjustified at Nova's current stage and scale.

### 46.4 Chosen Solution

Option B: restructure Nova's prompt so the system prompt and running summary are placed first (stable, cacheable prefix) and only the most recent verbatim turns and the new user message are appended after (variable suffix) — directly applying §24.6's cache-hit-maximizing structure. This requires no new infrastructure, only a prompt-structure change, making it the highest-leverage, lowest-cost fix available at this stage.

### 46.5 What It Enabled

Meaningfully reduced time-to-first-token for continuing conversations (the common case, since most turns are not a conversation's first), directly improving perceived responsiveness (§19.6) without sacrificing any of Stage 2's memory quality, and without any new infrastructure investment — a genuine, low-cost win.

### 46.6 The New Tradeoff This Introduced

Prompt-cache hit rate is now a load-bearing performance property that must be actively monitored (§31.4's dimensional token analytics, specifically tracking cache-hit-rate) — any future change to prompt structure (adding RAG context in §47, adding tool definitions in §49) risks silently breaking the cacheable prefix ordering if done carelessly, a new category of regression Nova's team must now guard against (directly connecting forward to §32.6's real-world "prompt caching regression" root cause).

### 46.7 Engineering Intuition

> **Why fix this with prompt restructuring rather than infrastructure investment?** Because §46.3's Option B costs almost nothing to implement and directly targets the actual mechanism (repeated prefill of a stable prefix, §15.7) — infrastructure investment (Option C) is the right lever only once caching's benefit is exhausted and genuine compute-bound prefill remains the bottleneck.

> **Why must every future stage that touches the prompt structure explicitly consider cache-hit rate?** Because placing new variable content (retrieved RAG context, tool definitions) *before* the existing stable prefix would silently invalidate caching for everything after it — a subtle, easy-to-introduce regression exactly matching §32.6's diagnosed real-world root cause.

### 46.8 Decision Tree: Diagnosing and Fixing Rising Time-to-First-Token

```
Is time-to-first-token rising specifically as conversations get
longer (more turns)?
  YES -> Check whether stable prompt content (system prompt,
         summary) is positioned FIRST for caching (§24.6) --
         restructure if not, before considering infrastructure
         investment.
Is prefill latency still high even with caching correctly
structured?
  YES -> Consider reducing context further (§46.3 Option A) or
         infrastructure investment (Option C) -- only justified
         once caching's benefit is confirmed exhausted.
```

### 46.9 Python Snippet: Cache-Optimized Prompt Assembly for Nova Stage 3

```python
# Nova Stage 3: restructures the prompt so STABLE content (system
# prompt + running summary) comes first, VARIABLE content
# (recent turns + new message) comes last -- §46.4.

def build_cacheable_nova_prompt(system_prompt, running_summary,
                                  recent_turns, new_user_message):
    stable_prefix = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": f"Summary of earlier conversation: "
                                       f"{running_summary}"},
    ]
    variable_suffix = recent_turns + [
        {"role": "user", "content": new_user_message}
    ]
    return stable_prefix + variable_suffix
    # Providers supporting prompt caching (§24.6) will cache the
    # STABLE prefix across consecutive requests in this conversation,
    # reprocessing only the variable suffix each turn.
```

### 46.10 Further Reading

- §15.7 (Latency Chain), §24.6 (Prompt Caching), §32 (Production Latency Engineering) — the mechanisms and diagnostic framework this stage directly applies.

---
