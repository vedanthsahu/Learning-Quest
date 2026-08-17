## 44. Nova Stage 1: Simple Chatbot

### 44.1 What Broke (Starting Point)

Nothing yet — this is Nova's first version. The starting requirement is simple: let a user send a message and receive a helpful, relevant response, with no memory of prior interactions and no access to external information beyond the model's own trained knowledge.

### 44.2 Why: The Minimum Viable Architecture

§1.7's AI product lifecycle explicitly warns against building sophisticated infrastructure (RAG, agents, fine-tuning) before validating that the core product interaction is even useful — Nova's Stage 1 is a deliberate, minimal implementation: a single API call per user message, a fixed system prompt (§7.2, §24.2) establishing Nova's persona and behavioral boundaries, and direct passthrough of the model's response to the user. No conversation history, no retrieval, no tools.

### 44.3 Candidates and Their Costs

**Option A — direct API call with a static system prompt (chosen):** Minimal engineering cost, fastest to ship, directly validates whether Nova's core persona and response quality resonate with real users before any further investment. **Option B — building conversation memory and RAG from the start:** Front-loads substantial engineering cost (§45, §47's mechanisms) before validating the core interaction is even wanted — directly the premature-architecture mistake §1.7 and §43.6 warn against. **Option C — using a smaller/cheaper model to minimize launch cost:** Viable, but risks under-validating Nova's core value proposition against a capability ceiling rather than a genuine product-market signal; deferred until model-routing (§27.5) is a measured, evidence-based optimization in a later stage.

### 44.4 Chosen Solution

Option A: a single decoder-only model (§18.2) API call per message, closed-model provider (§1.4, avoiding self-hosted inference infrastructure entirely at this stage, §10), fixed system prompt, zero-shot (§24.3) — no examples, no retrieval, no tools. Response streamed (§19.6, §27.7) to the user for perceived-latency benefit, since streaming is a near-zero-cost win available from day one.

### 44.5 What It Enabled

A working, shippable product validating Nova's core conversational quality with real users, at minimal engineering investment — the necessary precondition for justifying every subsequent stage's added complexity with real usage data rather than speculation.

### 44.6 The New Tradeoff This Introduced

Every conversation is stateless — Nova has no memory of anything said earlier in the same conversation, let alone across sessions. Real users immediately notice and are frustrated by a system that "forgets" what they just said one message ago — directly motivating Stage 2 (§45).

### 44.7 Engineering Intuition

> **Why start with zero-shot prompting and no examples rather than immediately tuning the system prompt heavily?** A minimal prompt establishes a clean baseline for evaluation (§29) as later stages add complexity — over-engineering the prompt before real usage data exists risks tuning for assumptions rather than observed behavior.

> **Why choose a closed-model API over self-hosting even a small model at Stage 1?** Self-hosting (§10, §27) requires GPU infrastructure investment (§11, §28) unjustified before any validated need for it — a closed API's per-token pricing is the correct Stage 1 tradeoff, deferred infrastructure investment until usage justifies it.

### 44.8 Decision Tree: Is Your Product Ready to Move Past Stage 1?

```
Have real users interacted with the core conversational
experience and confirmed it's valuable?
  NO  -> Stay at Stage 1 -- do not add memory/RAG/tools before
         this validation exists (§43.6, §1.7).
  YES -> Is the most common user complaint "it doesn't remember
         what I just said"?
    YES -> Proceed to Stage 2 (§45).
```

### 44.9 Python Snippet: Nova Stage 1's Complete Request Handler

```python
# Nova Stage 1: the entire request-handling logic -- deliberately
# minimal (§44.4), no memory, no retrieval, no tools.

NOVA_SYSTEM_PROMPT = (
    "You are Nova, a helpful, concise AI assistant. Answer clearly "
    "and directly."
)

def handle_message(llm_client, user_message):
    response = llm_client.chat.completions.create(
        model="gpt-4o-mini",           # smaller model for launch,
                                         # §44.3's deferred Option C
                                         # consideration
        messages=[
            {"role": "system", "content": NOVA_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        stream=True,                    # §44.4: streaming from day one
    )
    for chunk in response:
        yield chunk.choices[0].delta.content or ""
```

### 44.10 Further Reading

- §1.7 (AI Product Lifecycle), §7.2 (System Prompts) — the foundational reasoning behind this stage's deliberate minimalism.

---
