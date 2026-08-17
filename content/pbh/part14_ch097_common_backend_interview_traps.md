## 97. Common Backend Interview Traps

### 97.1 The Premature Technology Name

Stating "I'll use Kafka for this" in the first minute, before requirements are established, is the single most common trap this Part has already named (companion §93.4) — worth repeating here specifically as a *trap* rather than only a phase-ordering suggestion, because it's often not a knowledge gap but a nervous habit under interview pressure. **The fix**: physically pause after stating requirements and ask yourself "what does this component actually need to do" before naming anything — the same technology-named-last discipline this entire handbook has practiced in every single chapter since §0.2's nine-step pipeline.

### 97.2 The Uniform "Add Caching" Reflex

Proposing caching as the answer to every performance question, regardless of the actual access pattern, is a trap because it reveals memorized-solution pattern-matching rather than diagnosis — companion §74's entire "why is Redis not helping" chapter exists because this exact reflex, applied without checking whether the underlying computation is genuinely expensive or genuinely re-requested, produces a cache that doesn't help. **The fix**: state the specific read/write ratio or repeat-access pattern that justifies caching *before* proposing it, exactly as §94.3's URL-shortener example does explicitly.

### 97.3 The "Just Use a Distributed Lock" Reflex

Proposing a distributed lock as the default answer to any concurrency question, without first asking whether the actual operation can be made atomic another way (a single atomic database operation, an atomic Redis command like `INCR`, companion §61.4), is a trap because distributed locks are genuinely harder to get right than most candidates' answers acknowledge (companion §76.2's deadlock-risk discussion) — a strong candidate names the simpler atomic-operation option first and reaches for a distributed lock only when the operation genuinely can't be expressed atomically.

### 97.4 Ignoring the Stated Scale

Designing an elaborate, horizontally-sharded, multi-region architecture for a stated scale of "a few hundred requests per day" is a trap in the opposite direction from §97.1-97.3 — it signals an inability to calibrate complexity to actual requirements (companion §108.10's proportionality principle), which is scored just as negatively as under-engineering a genuinely high-scale system. **The fix**: explicitly restate the scale numbers from Phase 2 before proposing Phase 3's design, and let those numbers visibly drive the complexity level chosen.

### 97.5 Treating Every Failure as Equally Likely and Equally Severe

Spending equal design attention on "what if the entire data center goes down" and "what if this one field is missing from the request" is a trap — a strong candidate triages failure modes by actual likelihood and actual impact (the same reasoning companion §67.9's circuit-breaker tradeoffs apply to production systems generally) rather than listing every conceivable failure with uniform weight, which reads as checklist-following rather than genuine risk judgment.

### 97.6 Not Stating Assumptions Out Loud

Silently assuming "I'll assume this is read-heavy" and designing accordingly, without ever saying so, is a trap because the interviewer has no way to correct a wrong assumption they can't hear — and a design built on an unstated, incorrect assumption looks like a *design* failure to an interviewer who doesn't know it was actually a *communication* failure. **The fix**: narrate every assumption as you make it, explicitly inviting correction ("I'll assume reads dominate writes here — let me know if that's wrong").

### 97.7 Over-Defending an Early Design Choice

When an interviewer's pushback (companion §96.5) reveals a genuine gap in an earlier choice, defending that choice rather than updating it is a trap — real engineering involves revising decisions when new information arrives (exactly companion §78.3's "what would make us revisit this" clause, and §92.2's demonstration that two of the capstone's own thirteen ADRs were genuinely revisited), and an interviewer reads defensive rigidity as a worse signal than an interviewer reads a candidate saying "good point, let me reconsider that" and adjusting.

### 97.8 Mini Lab

Re-watch or re-read your own answer to one of §94-95's worked examples (or a recording of a real practice interview, if you have one) and check it against each of this chapter's seven traps explicitly, one at a time — most candidates find they've fallen into at least one without noticing during the interview itself, which is exactly why a deliberate, checklist-style post-hoc review like this one is worth doing regularly.

---
