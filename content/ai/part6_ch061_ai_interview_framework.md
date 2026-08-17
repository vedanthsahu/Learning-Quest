## 61. The AI System Design Interview Framework

### 61.1 Why This Chapter Exists

Parts I-V taught how AI systems work and how to diagnose them in production. This chapter teaches something different: how an experienced AI engineer approaches an unfamiliar "design an AI system for X" question in real time, under time pressure, with incomplete information — the same skill that lets that engineer also walk into a genuinely new production system and orient quickly. This is not a list of memorized answers to memorize instead — every worked example in §62-65 is a demonstration of applying the *same* twelve-step framework below, not twelve separate scripts to learn.

### 61.2 Why Memorized Answers Fail

A candidate (or engineer) who has memorized "Design ChatGPT" will freeze on "Design an AI Meeting Assistant" — the surface details differ, but the underlying engineering questions are identical, because every AI product this handbook covers is built from the same finite set of mechanisms (RAG, memory, tools, agents, evaluation, guardrails) assembled in a business-specific order. An interviewer asking these questions is almost never testing product trivia; they are testing whether a candidate can *derive* an appropriate architecture from requirements, the way §43-56's Nova capstone derived its architecture stage by stage from what actually broke — not whether the candidate has seen this exact question before.

### 61.3 The Twelve-Step Framework

**Step 1 — Requirements Gathering.** Before any architecture, establish: who are the users, what is the core task, what does success look like, and — critically — what is explicitly *out of scope*. An interview answer that immediately jumps to "we'll use RAG with a vector database" without first stating what problem RAG is solving has skipped the step this handbook's entire ordering discipline (§0.1, "problem before technology") exists to prevent.

**Step 2 — Hidden Constraints.** Every AI system design question has at least one constraint the prompt doesn't state directly but that materially changes the architecture: Is the data private/regulated (§13.4, §54.4's tenant-scoping)? Is there a real-time freshness requirement (live web data, §58.3, vs. a static corpus, §47.4)? Is there a hard latency ceiling (a coding assistant's inline completion, §59.4, vs. a research assistant's tolerance for a multi-minute response, §58.4)? Surfacing hidden constraints explicitly, out loud, before designing is the single most differentiating behavior between a junior and senior answer.

**Step 3 — Capacity Thinking.** Following §43.4's principle, estimate in tokens, not just requests: daily active users × interactions per user × average tokens per interaction (§15.13's estimation pattern). This number immediately constrains every later decision — a system estimated at ten requests a day doesn't need the same architecture as one estimated at ten million.

**Step 4 — Latency Budget.** Decompose the acceptable end-to-end latency into its components using §15.7's chain (prefill, decode, retrieval, tool calls) and allocate a budget to each — exactly as §59.4's inline-completion-vs-chat-mode distinction demonstrates for a real product. A design that never states a latency budget cannot make a principled model-size or architecture tradeoff later.

**Step 5 — Cost Budget.** Walk §15.13's token-economics chain for the estimated volume from Step 3, and state explicitly which cost dimension (input tokens, output/reasoning tokens, retrieval, GPU time, §33) is likely to dominate for this specific product — this determines which optimization (§27.5 model routing, §24.6 prompt caching, §26 fine-tuning) is worth discussing at all.

**Step 6 — Architecture.** Only now, having established Steps 1-5, select the specific mechanisms: does this need RAG (§6, §23)? Memory (§25.5, §48)? Tools/agents (§25, §49-51)? Fine-tuning (§9, §26 — and explicitly justify why or why not, §67.1)? This step should feel like a direct, evidence-based derivation from Steps 1-5, not a menu selection made independently of them.

**Step 7 — Evaluation.** State what golden dataset (§29.2) and metrics (§29.6's faithfulness/groundedness for RAG, §29.7's cost/latency/safety dimensions) would actually prove this system works, before it ships — an architecture with no evaluation plan is, per §12.1, "shipped on faith."

**Step 8 — Guardrails.** Identify the specific security/safety risks this product's architecture introduces (§13, §30) — a system with tools has tool-abuse risk (§13.6); a system ingesting external documents has injection risk (§13.2); a system serving multiple organizations has data-leakage risk (§13.4).

**Step 9 — Security.** Beyond guardrails, address authentication, authorization, and data handling explicitly (companion §30.6's RBAC/ABAC, applied per §30.7's policy-engine pattern) — especially for any product handling regulated or sensitive data (§65's healthcare/financial examples make this unavoidable).

**Step 10 — Observability.** State what you would need to monitor (§14, §31) to know this system is healthy in production — token analytics, latency percentiles, retrieval recall, guardrail flag rates — directly answering "how would you know if this broke" before it's asked as a follow-up.

**Step 11 — Scaling.** Address what changes as usage grows by 10x or 100x — does the architecture from Step 6 still hold, or does it need model routing (§27.5), a different vector database tier (§22.9), or multi-region deployment (§55)? This is where Nova's stage-by-stage evolution (§44-55) is the single best worked reference for showing *how* an architecture legitimately changes under growth, not just that it might.

**Step 12 — Tradeoffs.** Every choice made in Steps 6-11 costs something — state it explicitly, the same discipline every capstone stage's "new tradeoff introduced" (§43.5) modeled. An answer that presents its architecture as strictly superior with no cost is a red flag to an experienced interviewer, since it signals the candidate hasn't actually thought through the design, only recited it.

### 61.4 Why This Framework Mirrors the Capstone

Nova's twelve stages (§44-55) are, not coincidentally, a worked demonstration of exactly this framework applied sequentially and incrementally — "what broke" (a gap discovered in Steps 1-5), "why," "candidates and costs" (Step 6's derivation), "chosen solution," "new tradeoff" (Step 12) repeating at every stage. Practicing this framework on interview questions and practicing it on Nova's evolution are the same underlying skill; a reader who has internalized §43-56 already has most of this framework's muscle memory.

### 61.5 Engineering Intuition

> **How long should Steps 1-2 take in a real 45-minute interview?** Proportionally more time than most candidates give them — five to ten minutes of genuine requirements/constraint discussion before any architecture is named is a strong signal, not wasted time; an interviewer who has to drag requirements out of a candidate mid-design is a bad sign regardless of how good the eventual architecture is.

> **What's the biggest tell that a candidate is reciting rather than deriving?** Naming a specific technology (a specific vector database, a specific model) before establishing the requirement it satisfies — Steps 1-5 should produce the requirement; Step 6 should be the first point any specific technology is named, exactly mirroring this handbook's "technology named last" discipline (§0.1) applied under interview conditions.

> **What would over-engineering an interview answer look like?** Proposing Agentic RAG (§23.6), multi-agent orchestration (§25.6), and fine-tuning (§26) for a simple FAQ-answering bot — precisely the premature-architecture mistake §1.7 and §43.6 warn against, now visible to an interviewer as a lack of judgment rather than a lack of knowledge.

### 61.6 Decision Tree: Applying the Framework Under Time Pressure

```
Limited time (a 30-45 minute interview)? Allocate roughly:
  Steps 1-2 (Requirements + Hidden Constraints): ~15-20% of time
  Steps 3-5 (Capacity/Latency/Cost budgets):     ~15-20% of time
  Step 6 (Architecture):                          ~30-35% of time
  Steps 7-11 (Eval/Guardrails/Security/Obs/Scale): ~20-25% of time
  Step 12 (Tradeoffs): woven throughout, not saved for the end

If the interviewer interrupts with a follow-up mid-framework:
  -> Answer it, then explicitly return to "where we were" in the
     framework -- this demonstrates the framework is a structure
     you're using deliberately, not a script you've lost your
     place in.
```

### 61.7 Further Reading

- §0.1 (Ordering Discipline), §43.5 (Five-Question Capstone Framework), §1.7 (AI Product Lifecycle) — the direct conceptual foundations this framework is built from.

---
