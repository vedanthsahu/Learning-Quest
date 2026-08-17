## §120. Choosing an Architecture: Tradeoff Vocabulary for Interviews

### 1. The Vocabulary

- **Tradeoff framing** — presenting a decision as "X gives us A at the cost of B," rather than
  naming a single "correct" answer — the specific habit that separates a design conversation from
  a trivia recitation.
- **YAGNI (You Aren't Gonna Need It)** — a deliberate bias against building for hypothetical future
  requirements nobody has actually asked for yet.
- **Reversibility** — how expensive a decision is to undo later; cheap-to-reverse decisions
  deserve less upfront analysis than expensive-to-reverse ones (a database choice vs a variable
  name).
- **Fit-for-purpose** — choosing based on the system's actual, current requirements (§109) rather
  than what's popular, what a past project used, or what looks impressive in a design doc.

### 2. Where It Sits, and Why Teams Use It

This chapter is the connective tissue across §111-119: none of monolith-vs-microservices,
layered-vs-hexagonal, or any specific design pattern is "correct" in isolation — each is a
tradeoff, and the skill being evaluated (in an interview or in a real design review) is whether you
can name the tradeoff explicitly and connect it to the actual stated requirements, rather than
reciting a pattern because you know its name.

### 3. What Actually Breaks

- **Naming a pattern without a reason** — saying "I'd use microservices and CQRS here" without
  connecting either choice to a specific requirement reads as pattern-matching, not design
  reasoning — the single most common way strong technical knowledge fails to land as strong design
  judgment.
- **Presenting a design with no acknowledged downside** — every real architectural choice costs
  something; a design presented as having no weaknesses reads as either inexperience or a lack of
  self-review (see §99's bottleneck-naming point).
- **Over-engineering for imagined future scale** — building a sharded, event-sourced,
  microservices architecture for a product with a hundred users "in case it grows" is the YAGNI
  failure mode, and it costs real time and complexity against requirements that were never stated.
- **Under-engineering past a known, near-term requirement** — the opposite failure: ignoring a
  concretely stated future requirement (e.g., "we're onboarding an enterprise customer next
  quarter who needs SSO") because addressing it isn't needed *today*.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I try to state the cost of every choice I propose, not just the benefit — that's usually what
  an interviewer or reviewer is actually listening for."
- "I default to the simpler option unless a stated requirement justifies the more complex one —
  YAGNI, not because complexity is bad, but because unjustified complexity is a real ongoing cost."
- "I distinguish between decisions that are cheap to reverse later and ones that aren't, and spend
  my analysis time on the expensive-to-reverse ones."

### 5. Interview-Ready Answer

> "When I'm evaluating an architectural choice, I try to state it as a tradeoff explicitly — this
> gives us independent deployability at the cost of network calls and eventual consistency, for
> example — rather than presenting one option as simply correct. I default to the simpler design
> unless a stated requirement justifies more complexity, and I pay closer attention to decisions
> that are expensive to reverse later, like a database choice, than ones that are cheap to change,
> like an internal function's structure."

### 6. Go Deeper

companion Software Systems Handbook's §102 (Engineering Decision Catalog: 10 worked decision
trees) chapter for the full decision-record methodology; this book's §97 (ADRs, tradeoff analysis,
build vs buy) and §99-100 (HLD/LLD interview structure) for the surrounding interview-conversation
flow.

---
