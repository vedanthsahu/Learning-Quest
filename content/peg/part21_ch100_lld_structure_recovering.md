## §100. LLD Structure and Recovering When You Don't Know the Answer

### 1. The Vocabulary

- **LLD (Low-Level Design)** — the class/interface/data-structure level of a design: entities,
  responsibilities, relationships, and applicable patterns — the detail level below HLD (§99).
- **Entities and responsibilities** — the core objects/classes involved and specifically what
  each one owns, before jumping to code.
- **Recovering gracefully** — explicitly, calmly acknowledging a knowledge gap and reasoning
  toward a plausible answer, rather than either guessing confidently and wrong, or freezing.

### 2. Where It Sits, and Why Teams Use It

LLD interviews test a different skill than HLD — actual object-oriented or structural design
reasoning at the code level — and the "I don't know" moment, handled well, is often a stronger
signal of real seniority than knowing every answer, since nobody actually knows everything and
how you handle a gap says a lot.

### 3. What Actually Breaks

- **Jumping straight to code before naming entities and responsibilities** — writing method
  signatures before establishing what the core objects even are and what each one is responsible
  for tends to produce a design that has to be substantially reworked once the actual
  responsibilities become clear.
- **Not applying a relevant, well-known pattern where one genuinely fits** — reinventing a
  structure that a standard pattern (strategy, observer, factory, etc.) already solves cleanly can
  read as not recognizing the shape of the problem — though forcing a pattern where it doesn't
  fit is the equal and opposite mistake.
- **Guessing confidently when you don't actually know** — presenting a wrong answer with total
  confidence, if caught, damages credibility more than admitting the gap would have.
- **Freezing or deflecting entirely on a gap** — the opposite failure: "I don't know" with nothing
  after it wastes the opportunity to demonstrate the reasoning process, which is often what's
  actually being evaluated, more than the specific fact.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I identify entities and their responsibilities before writing any method signatures or code."
- "I reach for a well-known pattern when the problem's shape genuinely matches one, rather than
  reinventing or forcing a fit that isn't there."
- "When I don't know something, I say so directly, then reason toward the most plausible answer
  out loud, rather than guessing confidently or going silent."

### 5. Interview-Ready Answer

> "For LLD, I start with entities and their responsibilities before touching code, since getting
> that wrong means reworking everything built on top of it. I reach for known patterns when the
> problem's shape actually matches one, without forcing a fit that isn't there. And when I hit a
> genuine knowledge gap, I say so plainly and then reason toward the most plausible answer out
> loud — that's usually a stronger signal than either guessing with false confidence or going
> quiet, since it shows how I actually think through something I don't already know."

### 6. Go Deeper

companion Software Systems Handbook's §104 (Interview Translation: What the Interviewer Is
Actually Testing) chapter; companion Python Backend Engineering Handbook's §93 (The Backend
Interview Framework) chapter; companion DSA Engineering Handbook's §58 (Interview Pattern
Recognition Guide) chapter.

---
