## 66. Interview Translation: From Question to Engineering Problem

### 66.1 The Problem: A Product Name Is Not an Engineering Specification

"Design ChatGPT" names a product, not a set of engineering requirements — §61's framework is the *process* for closing that gap; this chapter teaches the specific skill of **translation**: decomposing a product name into the ordered chain of concrete engineering sub-problems it implies, each of which maps directly onto a specific chapter of this handbook. A candidate (or engineer) who can perform this translation fluently is demonstrating the exact skill that lets them also onboard onto an unfamiliar real production system quickly, by recognizing which of its components map onto familiar mechanisms.

### 66.2 The Translation Chain: Worked in Full for "Design ChatGPT"

```
"Design ChatGPT"
  |
  v
Conversation Memory -------------------> §45, §48 (history management,
  |                                       long-term memory)
  v
Streaming ------------------------------> §19.6, §46 (perceived latency)
  |
  v
Token Management -----------------------> §15, §24.5, §24.7 (context
  |                                       budget allocation)
  v
Model Routing ---------------------------> §1.5, §27.5 (capability/cost/
  |                                       latency triangle)
  v
Prompt Assembly -------------------------> §7.2, §24.2 (system/user
  |                                       separation, templates)
  v
RAG (conditional) -----------------------> §6, §23.6 (Agentic RAG, only
  |                                       when browsing/files invoked)
  v
Caching ----------------------------------> §24.6 (prompt caching for
  |                                       repeated prefixes)
  v
Evaluation --------------------------------> §12, §29 (golden dataset,
  |                                       broad task-distribution
  |                                       coverage, §62.2)
  v
Guardrails ----------------------------------> §13, §30 (broad-scope
  |                                       content policy)
  v
Monitoring ------------------------------------> §14, §31 (token
                                              analytics, latency
                                              percentiles)
```

Each arrow in this chain is a **translation step**: a product-level capability decomposed into the specific handbook chapters that teach its mechanism, its production failure modes, and its evaluation. The chain's *order* also matters — it follows roughly the same dependency order Nova's capstone (§44-55) discovered empirically: memory before streaming refinement, streaming before token/context discipline becomes urgent, context discipline before RAG adds more pressure to the same budget, and so on.

### 66.3 Translation Is Not Always Linear

Not every product translates into a single linear chain — "Design an AI Customer Support" bot (§63.4) translates into a chain that *branches*: RAG for knowledge lookup and tools for account actions are parallel capabilities, not sequential ones, both feeding into a shared escalation-decision component. Recognizing when a product's translation is a simple chain (mirroring Nova's stage order) versus a branching or parallel structure (multiple independent capabilities converging into one decision point) is itself part of the translation skill — forcing every product into the same linear shape as ChatGPT's chain would misrepresent products like customer support or email assistants (§65.1) where several capabilities are genuinely concurrent, not sequential.

### 66.4 Translating "Hidden" Capabilities That Aren't Named Explicitly

A subtler part of translation is recognizing capabilities the question *doesn't name but structurally implies*. "Design an AI Meeting Assistant" doesn't say the word "transcription," but §64.4 identified it as the foundational, product-defining first component anyway — because generating a summary or action items structurally requires text to exist first, and audio isn't text. Similarly, "Design an Enterprise AI Assistant" doesn't say the word "RBAC," but §63.3 identified multi-tenant access control as implied by the word "Enterprise" specifically. Strong translation means surfacing these implied components explicitly, out loud, rather than only translating the words actually present in the question.

### 66.5 Using Translation to Recover from Being Stuck

Translation is also a practical recovery tool: if a candidate is asked about an unfamiliar product and freezes, restarting from "let me translate this into its component engineering problems" — memory? retrieval? tools? evaluation? guardrails? — and walking through the standard capability list (§66.2's chain, §68-74's pattern catalog) as a checklist is a legitimate, visible way to make progress, and is a more honest, more recoverable position than guessing at an architecture without a clear derivation.

### 66.6 Engineering Intuition

> **Why teach one linear chain (§66.2) if §66.3 says not everything is linear?** Because the linear chain is the right *default* starting point and the clearest to explain out loud — branching only when a specific product genuinely has parallel, independent capabilities (as identified via §61's Step 2 hidden-constraint analysis), not as a default assumption.

> **What's the biggest translation mistake candidates make?** Translating only the literally-stated words in the question and missing structurally-implied components (§66.4) — "Enterprise" implying access control, "Meeting" implying transcription, "Customer Support" implying escalation — each of these misses produces an architecture that's technically reasonable but misses the product's actual defining engineering challenge.

> **What would over-engineering the translation step itself look like?** Producing an exhaustive, twenty-node translation diagram for a simple product before establishing via §61's Steps 1-2 that most of those nodes are actually relevant — translation should track genuine requirements, not maximize diagram complexity.

### 66.7 Decision Tree: How to Translate an Unfamiliar Product Question

```
Does the question name a specific, familiar product (§62-63's
examples)?
  YES -> Use it as a reference point, but re-derive rather than
         recite (§61.2) -- confirm the same hidden constraints
         actually apply before reusing that product's architecture.
  NO (a generic or unfamiliar product name) ->
    1. Identify the core INPUT type (text, audio, structured
       data, §64.4) -- this determines what preprocessing exists
       BEFORE this handbook's core mechanisms apply at all.
    2. Identify the CORPUS scope (open/closed/none, §64.1) --
       this determines whether RAG applies and how.
    3. Identify whether the system TAKES ACTIONS with real
       consequences (§63.4, §65.4) -- this determines whether
       tools/guardrails/human-in-the-loop are central, not
       peripheral.
    4. Only then, draw the translation chain (§66.2) connecting
       these to specific handbook chapters.
```

### 66.8 Further Reading

- §43-56 (Nova Capstone) — the single best worked example of translation happening organically, stage by stage, in response to real requirements rather than as an abstract exercise.
- §61 (Interview Framework) — the broader process this chapter's translation skill is one specific step within (Steps 1-2, primarily).

---
