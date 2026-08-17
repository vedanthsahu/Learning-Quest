## §83. LLM Basics: Tokens, Context Windows, and Temperature

### 1. The Vocabulary

- **LLM (Large Language Model)** — a model trained to predict the next token in a sequence, which
  turns out to be powerful enough to do a huge range of language tasks.
- **Token** — the model's actual unit of text (often a word-piece, not a whole word) — both cost
  and context limits are measured in tokens, not characters or words.
- **Context window** — the maximum number of tokens (input plus output combined) a model can
  consider at once; anything beyond it gets truncated or must be summarized/retrieved instead.
- **Prompt / system prompt** — the input given to the model; the system prompt specifically sets
  persistent behavior/instructions separate from the user's actual message.
- **Temperature** — controls randomness in the model's output; low temperature is more
  deterministic/focused, high temperature is more varied/creative.
- **Streaming response** — sending output tokens to the client as they're generated, rather than
  waiting for the full response, so the user sees text appear progressively instead of staring at
  a blank loading state.

### 2. Where It Sits, and Why Teams Use It

This is the baseline vocabulary underneath any LLM-backed feature — the terms that get thrown
around in a team conversation about "should we use a bigger model" or "why did this cost so much"
without anyone pausing to define them.

### 3. What Actually Breaks

- **Not accounting for token cost in a cost estimate** — pricing is per-token (input and output
  both), and a rough "per request" cost estimate that ignores actual token counts for realistic
  inputs/outputs can be wildly off, especially with longer conversations or documents involved.
- **Hitting the context window limit silently** — a long conversation or a large document that
  exceeds the context window gets truncated (usually from the oldest content), which can silently
  drop important earlier context without an obvious error.
- **Confusing "no streaming" with "the model is slow"** — a non-streaming implementation makes
  users wait for the entire response before seeing anything, which reads as much slower than
  streaming the same total generation time progressively.
- **Assuming temperature=0 fully eliminates variability** — it makes output much more
  deterministic and focused, but most providers don't guarantee bit-for-bit identical output every
  time even at the lowest setting.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Cost and context limits are both measured in tokens, not words or characters, and I estimate
  cost based on realistic token counts, not a rough guess."
- "I design for the context window as a hard constraint — for anything that could exceed it
  (long documents, long conversations), I need a strategy: truncation, summarization, or
  retrieval."
- "I use streaming for anything user-facing and interactive, since it makes the same total
  generation time feel dramatically faster."

### 5. Interview-Ready Answer

> "The vocabulary that matters practically: tokens are the actual unit of both cost and context
> limits, not words; the context window is a hard ceiling on how much the model can consider at
> once, which means anything that could exceed it — a long document, a long conversation — needs
> an explicit strategy rather than just hoping it fits; and streaming responses matter a lot for
> perceived speed in anything user-facing, even when the total generation time is identical."

### 6. Go Deeper

companion AI Systems Handbook's §2 (Mental Model: Transformers & LLMs) chapter and companion AI
Systems Handbook's §15 (Token Economics Deep Dive) chapter (full depth on LLM internals and
serving mechanics).

---
