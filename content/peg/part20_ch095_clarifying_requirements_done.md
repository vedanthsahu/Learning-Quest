## §95. Clarifying Requirements and Defining "Done"

### 1. The Vocabulary

- **Functional requirement** — what the system must actually do.
- **Non-functional requirement** — how well it must do it (performance, security, availability)
  — often unstated but just as real as functional requirements.
- **Acceptance criteria** — the specific, checkable conditions that determine whether a piece of
  work satisfies its requirement.
- **Edge case vs. happy path** — the normal, expected flow versus the unusual, boundary, or
  error-condition inputs that also need defined behavior.
- **"Done"** — in a mature team, means tested, deployed, and monitored — not just "code written."

### 2. Where It Sits, and Why Teams Use It

Vague requirements are one of the most common sources of wasted work — building the wrong thing
correctly is still wasted effort. Clarifying up front, even briefly, is consistently cheaper than
discovering a misunderstanding after implementation.

### 3. What Actually Breaks

- **Starting implementation before clarifying an ambiguous requirement** — building based on an
  assumption that turns out to be wrong means redoing work that clarifying up front would have
  avoided entirely.
- **Only functional requirements discussed, non-functional ones left implicit** — "the feature
  works" but nobody discussed expected load, latency requirements, or security implications,
  which then surface as problems after the fact instead of being designed for from the start.
- **No explicit acceptance criteria** — "done" becomes a matter of opinion between the person who
  built it and the person reviewing/accepting it, a recipe for friction and rework.
- **"Done" meaning only "code merged"** — work that's merged but not yet deployed, or deployed but
  not monitored, isn't actually done in any meaningful sense — problems in the untested gap
  between "merged" and "actually verified working in production" are a common, avoidable source
  of surprises.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I ask clarifying questions before starting on anything genuinely ambiguous, rather than
  guessing and hoping."
- "I explicitly ask about non-functional requirements — expected load, latency, security — not
  just functional behavior."
- "My definition of 'done' includes tested, deployed, and monitored, not just 'code written.'"

### 5. Interview-Ready Answer

> "Before starting on anything ambiguous, I clarify — what's the actual expected behavior, what
> are the edge cases, and just as importantly, what are the non-functional requirements like
> expected load or latency, since those are often left unstated but matter just as much as the
> functional behavior. And I hold 'done' to a higher bar than 'code merged' — it means tested,
> deployed, and actually monitored in production, since the gap between merged and verified-
> working is where a lot of avoidable surprises live."

### 6. Go Deeper

companion Software Systems Handbook's §92 (High-Level Design (HLD): The Architect's Repeatable
Framework) chapter (requirements-gathering as the first, most important step of any design
process).

---
