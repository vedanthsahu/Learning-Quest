## 45. Nova Stage 2: Conversation History

### 45.1 What Broke

Stage 1's statelessness (§44.6) is the top user complaint: Nova asks users to repeat context every message, and cannot answer simple follow-up questions ("what about next week?") that depend on anything said earlier in the same conversation.

### 45.2 Why

A model has no memory of its own between API calls (§2.5) — every request is entirely self-contained. "Memory" within a single conversation must be engineered explicitly by re-sending prior turns as part of the context window (§15.5) on every subsequent request; the model only ever "remembers" what's actually included in that request's prompt.

### 45.3 Candidates and Their Costs

**Option A — send the full conversation history every turn:** Simplest to implement, but token cost (§15.9) and prefill latency (§15.7) grow with every turn, and a long-running conversation will eventually exceed the context window (§15.5) entirely. **Option B — truncate to the most recent N turns:** Bounds cost/latency but silently loses earlier context — a user referencing something from many turns ago gets an answer as if Nova never knew it, a confusing, inconsistent failure mode. **Option C — summarize older turns into a compact running summary, keeping recent turns verbatim:** Bounds token growth while preserving the *gist* of older context, at the cost of an additional summarization step (extra latency/cost per turn) and the risk of the summary itself losing some specific detail a later question might need.

### 45.4 Chosen Solution

A hybrid of B and C: recent turns (the last several exchanges) are kept verbatim for precise, faithful short-term context; older turns are periodically compressed into a running summary (§24.5's context-compression mechanism) rather than dropped outright — bounding total context growth while preserving continuity, directly implementing §24.7's context-window-management discipline as an ongoing, per-conversation process rather than a one-time decision.

### 45.5 What It Enabled

Multi-turn conversations that feel continuous to users, follow-up questions resolved correctly, and — critically — a bounded, predictable token-growth curve per conversation regardless of how long a session runs, directly preventing the unmanaged-context-growth root cause that Part III (§32.6, §33.6) repeatedly identified as one of the most common production incidents.

### 45.6 The New Tradeoff This Introduced

The summarization step adds latency and cost to every turn once a conversation exceeds the verbatim-retention window, and any information lost in summarization is now genuinely unrecoverable — a real, evaluated (§29) accuracy-vs-cost tradeoff, not a free improvement. Additionally, tokens are now consumed by history on every request, directly reducing the budget available for anything Stage 4's RAG (§47) will later need to add to the same context window — the first concrete instance of §15.10's context-window-allocation tension actually appearing in Nova's architecture.

### 45.7 Engineering Intuition

> **Why not just always send the full history until the context window is actually exceeded?** Because cost and prefill latency (§15.6-15.7) degrade gradually well before the hard context-window ceiling is hit — waiting for the hard limit produces a worse, later-and-bigger problem than managing growth proactively.

> **Why summarize rather than simply drop old turns entirely?** Dropping loses information a user may reference again; summarizing preserves the gist at a fraction of the original token cost — a deliberate middle ground between §45.3's Option A and B costs.

### 45.8 Decision Tree: Choosing a Context-Management Strategy for Conversation History

```
Are conversations typically short (a few turns)?
  YES -> Send full history verbatim (§45.3 Option A) -- summarization
         overhead isn't justified yet.
Are conversations long-running and users reference much earlier
context?
  YES -> Use the hybrid verbatim-recent + summarized-older approach
         (§45.4).
Is verbatim precision on OLDER turns critical for your use case
(e.g., a legal or medical context where exact wording matters)?
  YES -> Consider retrieval-based memory (previewed in §48) instead
         of lossy summarization for older turns.
```

### 45.9 Python Snippet: Hybrid Verbatim + Summarized Conversation History

```python
# Nova Stage 2: bounds context growth (§45.4) by summarizing
# older turns while keeping recent turns verbatim.

def build_context(conversation_turns, verbatim_window=6, summarize_fn=None):
    if len(conversation_turns) <= verbatim_window:
        return conversation_turns  # short conversation, no summary needed

    older_turns = conversation_turns[:-verbatim_window]
    recent_turns = conversation_turns[-verbatim_window:]

    running_summary = summarize_fn(older_turns)  # §24.5's compression
    summary_message = {"role": "system",
                        "content": f"Earlier conversation summary: {running_summary}"}

    return [summary_message] + recent_turns
    # Token cost now grows with verbatim_window (bounded) plus one
    # compact summary, NOT with total conversation length (§45.6).
```

### 45.10 Further Reading

- §15.5 (Context Window), §24.5 (Context Compression), §24.7 (Context Window Management) — the direct mechanisms this stage implements.

---
