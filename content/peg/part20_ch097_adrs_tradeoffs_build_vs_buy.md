## §97. ADRs, Tradeoff Analysis, and Build vs Buy

### 1. The Vocabulary

- **ADR (Architecture Decision Record)** — a short, written record of a significant technical
  decision: the context, the options considered, the choice made, and why.
- **Tradeoff analysis** — explicitly naming what's gained and given up by a choice, rather than
  presenting it as obviously correct with no downside.
- **Build vs. buy** — deciding whether to build a capability in-house or use an existing
  third-party product/service for it.
- **MVP vs. scalable version** — the deliberate choice to ship something simpler first, with a
  known, accepted set of limitations, versus building for scale/completeness up front.

### 2. Where It Sits, and Why Teams Use It

These are the practices that make significant technical decisions legible to people who weren't
in the room when they were made — a decision without a recorded rationale is much harder to
revisit correctly later, when circumstances have changed and someone needs to know *why* the
original choice was made.

### 3. What Actually Breaks

- **A significant decision made with no record of why** — six months later, nobody remembers
  whether a constraint that shaped the decision still applies, and revisiting the decision means
  re-litigating it from scratch instead of building on the original reasoning.
- **Presenting a chosen approach with no tradeoffs mentioned** — makes a decision look more
  obviously correct than it actually was, which both hides real risk and makes it harder for
  someone else to push back with good reason, or to know what to watch for if the tradeoff turns
  out badly.
- **Building something that should have been bought** — reinventing a solved problem (auth,
  payments, email delivery) in-house often costs far more in ongoing maintenance than a mature
  third-party product's cost, once total cost of ownership is actually counted.
- **Buying something that should have been built** — the opposite mistake: adopting a third-party
  product for something core to the business's actual differentiation, where losing control over
  the implementation is a real strategic cost, not just a convenience tradeoff.
- **Confusing "MVP" with "the real version, just done sloppily"** — a genuine MVP has a
  deliberately scoped-down set of capabilities with known, accepted limitations; skipping quality
  or correctness within that scope isn't the same thing and creates real technical debt (§93)
  instead of a legitimate scoping decision.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "For any significant decision, I write down the context, the options considered, and why the
  chosen one won — not just the conclusion."
- "I present tradeoffs honestly, including what we're giving up, not just why the chosen option
  looks good."
- "For build vs. buy, I think about total cost of ownership — including ongoing maintenance — not
  just the upfront cost of building versus a subscription price."

### 5. Interview-Ready Answer

> "For any decision significant enough to matter later, I write a short ADR — context, options
> considered, chosen approach, and why — specifically so the reasoning survives even if I'm not
> around to explain it later. I present tradeoffs honestly rather than making a choice look
> obviously correct with no downside, since that's what lets someone else meaningfully evaluate
> or revisit the decision. And for build versus buy specifically, I weigh total cost of ownership,
> including ongoing maintenance, not just the upfront comparison — building something like auth or
> payments in-house often looks cheaper only if you ignore what it costs to maintain correctly
> over years."

### 6. Go Deeper

companion Software Systems Handbook's §102 (Engineering Decision Catalog: 10 worked decision
trees) chapter (a full library of documented architectural tradeoffs, in the exact ADR format this
chapter describes).

---
