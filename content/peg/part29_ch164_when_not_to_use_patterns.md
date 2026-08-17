## §164. When Not to Use Design Patterns

### 1. The Vocabulary

- **Pattern forcing** — reaching for a named design pattern because you know it, not because the
  problem actually needs it — recognizable by a solution that's harder to follow than the plain
  version it replaced.
- **Accidental complexity** — complexity introduced by the solution itself, as opposed to essential
  complexity inherent to the actual problem; unnecessary pattern use is a common source of the
  former.
- **YAGNI, applied to patterns specifically** — the same "don't build for hypothetical future needs"
  principle from §120, applied to abstraction layers: a Strategy pattern with exactly one strategy
  that's never had a second implementation in two years wasn't a strategy, it was one class with
  extra indirection.
- **Premature abstraction** — introducing an interface, factory, or plugin point before there are
  at least two real, concrete cases that need to vary — abstracting from a single example is
  usually guessing at the wrong shape anyway.

### 2. Where It Sits, and Why Teams Use It

This chapter exists because §116-118 and §163 teach the patterns, but knowing a pattern's name is
also exactly what makes it tempting to use where it isn't needed — a specific, well-documented
failure mode sometimes called "pattern fever," especially common right after first learning a set
of patterns. The corrective isn't "avoid patterns" — it's applying the same tradeoff discipline
from §120 to pattern usage specifically: name the concrete problem the pattern solves, and confirm
it's actually present, before reaching for it.

### 3. What Actually Breaks

- **A Factory for a class with exactly one implementation, with no second one planned** — pure
  indirection with no actual flexibility benefit, since there's nothing to switch between.
- **An interface introduced for a dependency that will realistically never have a second
  implementation** — dependency injection and interfaces earn their cost at genuine boundaries
  (§119); applied reflexively everywhere, they just add navigation overhead to reading the code.
- **A Strategy pattern with one strategy** — the tell-tale sign of premature abstraction: check
  whether a second, real case has ever actually been added; if not after a meaningful period, the
  abstraction was speculative, not earned.
- **Choosing a pattern for its name recognition in an interview or design review, not its fit** —
  naming an impressive-sounding pattern that doesn't actually solve the stated problem is a
  specific version of §120's "naming a pattern without a reason" failure, and experienced
  reviewers notice it quickly.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I only introduce an abstraction — interface, factory, strategy — once there are at least two
  real cases that need to vary, not in anticipation of a hypothetical future one."
- "If I find a pattern making code harder to follow rather than easier, that's a sign it was
  forced rather than fitting the actual problem."
- "I treat 'do we need this abstraction yet' the same way I treat any other tradeoff — state the
  concrete benefit, not just the pattern's name."

### 5. Interview-Ready Answer

> "Knowing pattern names is useful, but I try to apply the same discipline to using them as to any
> other architectural choice — I want a concrete reason a pattern is needed now, not just that I
> know its name. A Factory or Strategy with only one real implementation and no second one in
> sight is usually a sign the abstraction was premature; I'd rather write the plain version and
> introduce the pattern later, once a second real case actually shows up and makes the need
> concrete."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §107 (Engineering Heuristics & Rules of Thumb)
chapter for further worked examples of over-engineering and its cost; this book's §120 (choosing
an architecture: tradeoff vocabulary) for the same discipline applied one level up, at the
architecture-decision level.

---
