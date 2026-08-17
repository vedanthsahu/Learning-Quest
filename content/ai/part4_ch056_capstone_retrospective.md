## 56. Capstone Retrospective: Full Architecture Decision Record Log for Nova's Evolution

### 56.1 The Purpose of This Retrospective

Having built Nova across twelve stages (§44-55), this chapter steps back and reviews the evolution as a single connected sequence of decisions — an Architecture Decision Record (ADR) log in the style the companion handbook establishes (companion capstone chapters) — specifically to surface the patterns that recurred across stages, since those recurring patterns, not any single stage's specific decision, are the transferable engineering lesson of this capstone.

### 56.2 The Full ADR Log, Summarized

| Stage | What Broke | Chosen Solution | New Tradeoff Introduced |
|---|---|---|---|
| 1. Chatbot (§44) | Nothing (starting point) | Minimal API call, no memory/RAG/tools | Statelessness frustrates users |
| 2. History (§45) | No memory within a conversation | Hybrid verbatim + summarized history | Context-window budget now contested |
| 3. Streaming (§46) | Rising time-to-first-token | Cache-optimized prompt structure | Cache-hit rate becomes load-bearing |
| 4. RAG (§47) | No access to org-specific knowledge | Naive RAG with grounding/citation | New retrieval-quality and hallucination surface |
| 5. Memory (§48) | No cross-session memory | Distilled semantic/episodic long-term memory | Second retrieval system, its own staleness risk |
| 6. Tools (§49) | Can't take real actions | Narrow, schema-constrained tools | New security surface, tool-abuse risk |
| 7. Multi-Tool (§50) | Can't chain tool results | ReAct with `max_steps` safeguard | Cost/latency variance rises sharply |
| 8. Agents (§51) | Can't handle open-ended tasks | ReAct + explicit reflection | Highest cost/latency variance; looping risk |
| 9. Evaluation (§52) | Regressions shipped undetected | Golden dataset + regression gate, incident-first | Evaluation infra itself needs ongoing investment |
| 10. Guardrails (§53) | Growing, unaddressed attack surface | Layered, risk-targeted defenses | Latency/cost added; false-positive tuning needed |
| 11. Enterprise (§54) | Single-tenant architecture can't serve multiple customers | Shared infra, structural tenant-scoping everywhere | Every future feature must be tenant-scoping-reviewed |
| 12. Global (§55) | Latency and data-residency across geographies | Multi-region, tenant-pinned | Peak operational complexity; cross-region consistency |

### 56.3 The Recurring Pattern: Every Fix Consumed a Shared, Scarce Resource

Reviewing the table above, nearly every stage's "new tradeoff introduced" column touches one of three shared, scarce resources established as early as §15: **context-window budget** (contested by history in §45, RAG in §47, tools in §49, memory in §48 — directly §15.10's optimization-target framework playing out across an entire product's evolution, not just a single chapter's mechanism); **cost/latency predictability** (progressively eroded by every capability addition from Stage 4 onward, culminating in Stage 8's agentic variance); and **the scope of what must be verified correct on every future change** (retrieval quality from Stage 4, security from Stage 10, tenant isolation from Stage 11, each adding a permanent item to every subsequent stage's design-review checklist). This is the single most transferable lesson of the capstone: **AI product evolution is not additive** — each new capability doesn't just add its own value, it also adds a permanent claim on every scarce resource every future stage must also share.

### 56.4 Why the Five-Question Framework Mattered

§43.5's five-question framework (What broke? Why? Candidates and costs? Chosen solution? New tradeoff?) forced every stage to be justified against real, specific evidence rather than generic best-practice — Stage 9's evaluation investment, for example, was motivated by a real two-week-undetected regression (§52.1), not an abstract "evaluation is good practice" argument. This discipline — building only in response to a demonstrated, specific limitation — is directly the antidote to the premature-architecture mistake §1.7 and §43.6 warned against from the capstone's very first chapter, and is why Nova's architecture at Stage 12 looks meaningfully different from (and more justified than) a system designed to have all twelve stages' capability from day one.

### 56.5 What Nova's Evolution Does NOT Cover

This capstone deliberately did not include several realistic paths a real product might also take: fine-tuning (§9, §26) was never adopted, because no stage's "what broke" ever pointed to a genuine behavioral-adaptation need that RAG, prompting, or tool use couldn't address more cheaply — directly validating §9.7/§26.7's "when NOT to fine-tune" principle by never manufacturing an artificial need for it. Similarly, Graph RAG (§23.7) and Self-RAG (§23.8) were never adopted, since naive/advanced RAG's evaluated performance never demonstrated the specific multi-hop or relationship-traversal gap those variants exist to fix. This absence is itself instructive: a real engineering process, followed honestly, adopts sophisticated techniques only when evidence demands them, not because a handbook's catalog of options exists.

### 56.6 Engineering Intuition

> **What is the single most important habit this capstone modeled?** Never build a stage's solution before its "what broke" is a real, specific, evidenced limitation — every stage in this capstone was a response to a concrete failure, never a preemptive architecture decision.

> **Why does the ADR table (§56.2) matter more than any single stage's individual chapter?** Because the connections between stages — how Stage 2's context-budget tradeoff directly constrained Stage 4's RAG design, how Stage 6's security surface directly motivated Stage 10's guardrails — are the actual systems-engineering lesson; each chapter in isolation only shows half of that lesson.

> **What would over-engineering have looked like across this entire capstone?** Building Stage 11's multi-tenant architecture or Stage 12's multi-region deployment at Stage 1 — exactly the mistake this capstone's stage-by-stage, evidence-driven discipline was designed to demonstrate avoiding.

### 56.7 Closing: How to Apply This Capstone's Discipline to a Real Product

```
Before adding ANY new capability to a real AI product, ask:
1. What SPECIFIC, evidenced limitation is this solving (§43.5's
   "what broke")? If the answer is speculative, don't build it yet.
2. What shared resource (context budget, cost/latency
   predictability, review-checklist scope, §56.3) will this new
   capability permanently consume more of?
3. What is the SPECIFIC new tradeoff this introduces, and who
   owns monitoring/managing it going forward?
If you can't answer all three concretely, you are very likely
building ahead of evidence -- the single most common and costly
mistake this entire capstone was structured to help you avoid.
```

### 56.8 Further Reading

- §43 (Capstone Intro) — revisit the original requirements and five-question framework this retrospective evaluates against.
- §1.7 (AI Product Lifecycle), §9.7/§26.7 ("When NOT to Fine-Tune") — the principles this capstone's actual evolution validated by never needing to override them.

---
