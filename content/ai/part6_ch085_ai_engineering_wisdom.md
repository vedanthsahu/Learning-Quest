## 85. AI Engineering Wisdom

### 85.1 Rules of Thumb

- **Measure before you optimize, always.** Every case study in §82-83 that went wrong did so because an assumption stood in for a measurement — token counts, cache-hit rates, retrieval recall. None of this handbook's optimizations are safe to apply speculatively (§15.13, §81.4).
- **Tokens, not requests, are your unit of capacity.** Estimate everything in tokens from day one (§43.4) — a request-based mental model hides the real cost/latency driver.
- **Output tokens cost more than input tokens — architect accordingly.** Favor techniques that constrain generation length (§33.7) over techniques that only trim input.
- **The cheapest fix is usually upstream.** A generation-quality problem is disproportionately likely to be a retrieval problem (§34.1, §67.5) — check upstream before tuning downstream.
- **If you haven't tested your fallback path, you don't have one.** A configured-but-never-exercised fallback (§31.7, §68.6) fails silently exactly when you need it most.
- **Every reasoning-model feature's real cost is hidden until you measure reasoning tokens directly.** This is this handbook's single most frequently recurring root cause (§33.6, §80.4, §83.5) for a reason.

### 85.2 Common Misconceptions

- **"RAG is a database."** It's a multi-stage pipeline (chunking, embedding, retrieval, reranking, grounding) — a vector database is one component within it (§67.6).
- **"Embeddings contain knowledge."** They're a similarity-search index pointing to knowledge; the facts live in the retrieved text (§67.7).
- **"A bigger context window solves a context problem."** It raises the ceiling; it doesn't fix what's filling the room (§67.3).
- **"Agents are strictly more capable than workflows, so use them."** Capability isn't the relevant axis — predictability, cost, and evaluability are (§67.2, §70.1).
- **"More documents in the corpus can only help."** More candidates competing in ranking can crowd out the truly relevant one (§67.5, §77.7).
- **"A validated evaluation judge stays validated."** LLM-as-judge requires periodic re-validation against human ratings — it can drift just like anything else (§29.3).

### 85.3 Counterintuitive Behaviors

- **Low GPU compute utilization can mean you're out of capacity, not that you have spare capacity** — check KV-cache occupancy before concluding otherwise (§37.3, §82.4, §80.6).
- **"We didn't change anything" doesn't mean nothing changed.** A floating model alias, an embedding-model provider update, or corpus growth past an ANN index's tuning threshold can all silently alter behavior with zero code changes on your side (§78.2, §77.7, §83.7).
- **A guardrail tightened in response to one incident can create a new, different incident** (disproportionate false positives for an underrepresented user segment, §83.6) — every security fix needs its own evaluation, not just a sensitivity dial turned up.
- **Reflection and self-critique don't help if the model's blind spot caused both the error and the failure to notice it** — genuine independence (Generator-Critic, §69.2) sometimes matters more than an extra pass.
- **Adding a reranker can make results worse if first-stage recall is already the problem** — a second stage cannot promote a document that was never retrieved in the first place (§38.5, §77.8).
- **The most expensive-sounding fix (bigger model, more GPUs) is very often not the actual fix** — this handbook's case studies (§82-83) repeatedly found the real fix cheaper and more specific than the first instinct.

### 85.4 Production Lessons

- **A postmortem that doesn't produce a new golden-dataset example didn't actually prevent recurrence** (§39.7, §42.4).
- **Cross-tenant data leakage is the one failure mode where "we'll fix it properly later" is never an acceptable answer** (§42.5, §54.6, §82.6) — treat it at maximum severity from the first report.
- **Every layer you add (routing, caching, guardrails, reranking) has to justify its own cost against a simpler predecessor, every time** — sophistication is not free, and this handbook's patterns (§68-74) are deliberately ordered from simplest to most complex for this reason.
- **The gap between "the framework supports X" and "X is actually configured and running"** (continuous batching, §27.3; prompt caching, §24.6) is where a large fraction of real production underperformance lives.
- **Silent failure fallbacks are more dangerous than loud ones.** A summarization step that silently falls back to "include everything raw" on error (§82.5) turns a transient bug into an unbounded resource leak — fail closed, not open, for anything touching context or cost budget.

### 85.5 Engineering Principles

- **Problem before technology, always** (§0.1) — the ordering discipline underlying this entire handbook applies as much to a two-minute interview answer (§61) as to a two-year production system.
- **Evidence before complexity** (§43.6, §56.3, §67) — every escalation in this handbook's pattern catalog (simple prompt → pipeline → agent → multi-agent) should be justified by a demonstrated gap in its predecessor, not adopted by default.
- **Structural enforcement beats instructional enforcement** — a schema constraint (§30.10) or a tenant-scoping wrapper (§54.9) holds even when a model is manipulated or wrong; a prompt instruction alone does not.
- **Every fix introduces a new tradeoff — name it explicitly** (§43.5, §56.3) — an architecture presented with no stated cost is a sign the tradeoff hasn't actually been thought through, not that one doesn't exist.
- **Stakes should calibrate rigor, not just architecture** (§65, §84.14) — the same twelve-step framework applies to a FAQ bot and a healthcare assistant, but how much weight each step carries should visibly differ.

### 85.6 Tradeoff Tables

| Decision | Favors Option A | Favors Option B |
|---|---|---|
| RAG vs. Fine-Tuning | Knowledge changes often, needs citations (§67.1) | Stable behavioral/stylistic shift, ample quality data (§26.7) |
| Workflow vs. Agent | Steps known in advance, need predictability (§70.1) | Steps genuinely can't be known upfront (§25.1) |
| Routing vs. Cascade | Request complexity predictable upfront (§68.4) | Complexity distribution unpredictable, want to avoid misclassification risk (§68.5) |
| Sliding Window vs. Summarization | Short conversations, simplicity valued (§71.7) | Long conversations, need to preserve older gist |
| Two-Stage vs. Three-Stage Retrieval | Single-tenant, no access control needed (§73.1) | Multi-tenant, structural filtering required (§73.2) |
| Semantic Cache vs. No Cache | High query redundancy, tolerance for approximate matches (§72.2) | Low redundancy, or high-stakes domain requiring exact freshness |
| LoRA vs. Full Fine-Tuning | Default starting point, most tasks (§26.3) | Only after LoRA is evaluated as demonstrably insufficient |

### 85.7 Mental Models Worth Internalizing

- **The token-economics chain** (§15) is the single mental model underlying every cost and latency number in this handbook — characters → tokenizer → tokens → embeddings → context → attention → latency → GPU memory → cost.
- **The retrieval-vs-generation split** (§34.1, §35.1) is the single most valuable diagnostic lens for any "bad answer" complaint — always check which half of the pipeline actually failed before investigating further.
- **The capability/cost/latency triangle** (§1.5) reframes nearly every model-selection and routing decision as a tradeoff among three axes, never a search for a single "best" model.
- **Stakes calibrate rigor** (§65, §85.5) — the same mechanisms, weighted differently by domain consequence, explain why a healthcare assistant and a FAQ bot look architecturally similar but operationally very different.

### 85.8 The Final Decision Tree: What This Entire Handbook Reduces To

```
Facing any new AI engineering decision -- design, diagnosis, or
production incident -- ask, in order:

1. What is the ACTUAL problem, stated without naming any
   technology yet? (§0.1, §61 Steps 1-2)
2. Is there evidence this problem exists, or am I solving a
   hypothetical? (§43.6, §67)
3. What is the SIMPLEST mechanism in this handbook's catalog
   (§68-76) that could address it?
4. What would that mechanism cost -- in tokens, latency, and
   engineering complexity -- and have I actually measured this,
   not assumed it? (§15, §81)
5. What NEW tradeoff does this introduce, and who is responsible
   for monitoring it going forward? (§43.5, §56.3)

If you can answer all five without naming a specific technology
until step 3, you are engineering. If you started with a
technology name, you were reciting -- stop and restart at step 1.
```

### 85.9 Closing Note

Parts I-V of this handbook taught what AI systems are made of and how they fail. Part VI's job was different: to compress the judgment an experienced AI engineer applies to *any* unfamiliar system — named product, interview question, or live production incident — into a repeatable process. If §61's twelve steps, §66's translation skill, and §85.8's final decision tree feel like the same underlying habit of mind by now, applied to progressively less familiar situations, that repetition was deliberate — it is, in fact, the entire point of this Part.

### 85.10 Further Reading

- Every chapter cross-referenced throughout §61-85 — this chapter is a distillation, not a substitute, for the depth those chapters provide.

---
