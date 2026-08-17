## 67. Common AI Interview Traps

### 67.1 Trap: "Fine-Tuning Is the Answer to a Knowledge or Behavior Gap"

**The trap:** A candidate hears "the model doesn't know our product catalog" or "the model doesn't follow our exact format" and immediately proposes fine-tuning. **Why it's wrong:** §9.7 and §26.7 established this explicitly — a knowledge gap is a RAG problem (retrievable, updatable, §6, §23), not a fine-tuning problem (baked-in, stale the moment facts change, requires retraining to update); a format-following gap is usually a prompting problem (§24.3's few-shot examples) solvable without any training cost at all. **What a strong answer says instead:** "Before considering fine-tuning, I'd rule out RAG for the knowledge gap and better prompting for the format gap — fine-tuning is justified specifically for a stable behavioral/stylistic shift that prompting can't achieve, with sufficient quality training data to do it safely (§26.6)." Nova's capstone (§56.5) explicitly never needed fine-tuning across twelve stages — citing this is a strong, concrete demonstration of the principle in practice.

### 67.2 Trap: "Agents Are More Capable, So They're the Better Architecture"

**The trap:** Given a choice between a deterministic workflow and an agent, a candidate defaults to the agent because it sounds more sophisticated or "AI-native." **Why it's wrong:** §8.2 established the deterministic-workflow-versus-agent distinction specifically because agents trade predictability and cost/latency stability for flexibility (§36's entire chapter exists because of the reliability cost this trade introduces) — a task with a known, fixed sequence of steps should be a deterministic workflow, full stop, regardless of whether an agent *could* also accomplish it. **What a strong answer says instead:** "I'd only reach for an agent if the task genuinely requires adaptive, not-fully-predictable-in-advance decision-making (§25.1) — if the steps are knowable ahead of time, a deterministic workflow is more reliable, cheaper, and easier to evaluate."

### 67.3 Trap: "Bigger Context Window Solves the Problem"

**The trap:** Facing a context-budget constraint (§15.5, §24.7), a candidate proposes simply using a model with a larger context window rather than addressing what's consuming the budget. **Why it's wrong:** §17.5 established attention's quadratic scaling — a larger context window doesn't just cost more tokens (§15.9), it costs disproportionately more compute for the same proportional increase in length, and §19.7 warned that "supports a 1M-token window" and "performs well given close to 1M tokens" are different claims requiring separate validation. **What a strong answer says instead:** "Before reaching for a larger context window, I'd ask what's actually filling the current one — unmanaged history (§45), unnecessarily large retrieved chunks (§21.6), or genuinely necessary content — and apply compression (§24.5) or better retrieval before assuming more raw capacity is the fix."

### 67.4 Trap: "A Bigger/Newer Model Is Always Better"

**The trap:** When quality is insufficient, a candidate's default fix is "use a bigger or newer model." **Why it's wrong:** §1.5's capability/cost/latency triangle establishes this as a real tradeoff, not a strictly dominant choice — a bigger model costs more and is often slower (§15.7, §15.9), and §34-35 established that many quality problems are actually retrieval or grounding failures that a bigger generation model does nothing to fix. **What a strong answer says instead:** "I'd first diagnose whether this is a retrieval problem or a generation problem (§34.5's recall check) before concluding a bigger model is needed at all — and if it is a generation-capability gap, I'd confirm this via evaluation (§29) rather than assuming."

### 67.5 Trap: "More Documents in the Corpus Always Improves RAG"

**The trap:** A candidate assumes that adding more documents to a RAG corpus can only help, never hurt. **Why it's wrong:** §34.3 and §38.5 both establish concrete mechanisms by which more documents can *reduce* retrieval quality — more candidate documents competing in ranking increases the chance of irrelevant-but-superficially-similar content outranking the truly relevant document, especially without a reranking stage (§21.7) or well-tuned ANN parameters (§21.5) for the new, larger scale. **What a strong answer says instead:** "Adding documents changes retrieval's difficulty, not just its coverage — I'd re-evaluate recall/precision (§21.8) after any significant corpus growth, and consider whether reranking or metadata filtering becomes necessary at the new scale."

### 67.6 Trap: "RAG Is a Database"

**The trap:** Treating "add RAG" as equivalent to "add a database" — a single architectural component that, once installed, is done. **Why it's wrong:** RAG is a *pipeline* (§6.3, §23) with many independently-tunable and independently-failing stages (chunking §21.6, embedding §20, retrieval algorithm §21.5, reranking §21.7, grounding/prompting §23.9) — a vector database (§22) is only one component within it, specifically the storage/search layer, not the whole system. **What a strong answer says instead:** "RAG isn't a single component I add — it's several stages I need to design and evaluate independently: how documents are chunked, how they're embedded, how they're retrieved and ranked, and how the retrieved content is used in generation."

### 67.7 Trap: "Embeddings Are Knowledge"

**The trap:** Treating an embedding as if it directly contains retrievable facts, rather than as a similarity-search index pointing to where facts live. **Why it's wrong:** §3.2 and §20.2 establish that an embedding is a geometric representation of meaning for comparison purposes — it enables *finding* relevant text, but the actual knowledge is in the retrieved text itself, not in the embedding vector; conflating the two leads to confused reasoning about embedding drift (§20.7), which affects *findability*, not the underlying facts' correctness. **What a strong answer says instead:** "The embedding model's job is making relevant content findable via similarity — the facts themselves live in the source documents; an embedding-model change can break retrieval without ever touching the actual knowledge."

### 67.8 Trap: "Prompt Engineering Is Architecture"

**The trap:** Treating careful prompt wording as a substitute for making real architectural decisions (retrieval design, evaluation, guardrails). **Why it's wrong:** §7 and §24 place prompt engineering as one layer within a larger system — a perfectly-worded prompt cannot compensate for poor retrieval (§34), a missing evaluation practice (§29), or absent guardrails (§30); this handbook's entire ordering discipline (§0.1) exists specifically to prevent "we'll fix it with a better prompt" from substituting for genuine architectural analysis. **What a strong answer says instead:** "I'd treat prompt design as one tunable layer within the architecture, not a substitute for it — if a quality problem persists after reasonable prompt iteration, the fix is very likely upstream (retrieval, §34) or downstream (evaluation/guardrails, §29-30) of the prompt itself."

### 67.9 Trap: "Memory Is Just Conversation History"

**The trap:** Treating "add memory" as equivalent to "send the previous messages back to the model" — conflating short-term context-window memory with genuine long-term memory. **Why it's wrong:** §25.5 and §48 establish these as architecturally distinct: conversation history (§45) exists only within the current context window and conversation; true long-term memory persists across sessions and requires its own retrieval infrastructure (§48.3) with semantic/episodic distinctions — a candidate proposing "memory" who only describes sending prior turns has described Stage 2 (§45), not Stage 5 (§48). **What a strong answer says instead:** "I'd distinguish within-conversation history, which is just context management, from cross-session memory, which requires a separate persistent, retrievable store — these solve genuinely different problems and fail in different ways."

### 67.10 Engineering Intuition

> **What do all nine traps have in common?** Each one substitutes a single, appealing-sounding fix (bigger model, more context, fine-tuning, more documents) for the actual diagnostic work (§34, §35, §29) that determines whether that fix addresses the real root cause — every trap is, structurally, a shortcut around this handbook's Part III diagnostic discipline.

> **How should a candidate respond if they realize mid-answer they've fallen into one of these traps?** Say so directly — "actually, let me reconsider that; a bigger model wouldn't fix a retrieval problem" is a stronger signal of genuine understanding than continuing confidently down an incorrect path, exactly mirroring the reflection principle (§25.4) this handbook teaches for agents applied to the candidate's own reasoning.

### 67.11 Further Reading

- §9.7, §26.7 ("When NOT to Fine-Tune"), §34 (Retrieval Quality), §35 (Hallucination Diagnosis) — the direct diagnostic chapters underlying nearly every trap in this chapter.

---
