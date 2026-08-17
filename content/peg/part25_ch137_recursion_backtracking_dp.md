## §137. Recursion, Backtracking, and Dynamic Programming

### 1. The Vocabulary

- **Recursion** — a function that calls itself on a smaller version of the problem, with a base
  case that stops the recursion.
- **Backtracking** — recursion that explores a choice, and explicitly undoes ("backtracks") that
  choice if it doesn't lead to a valid solution, before trying the next one — the technique behind
  "generate all combinations/permutations" problems.
- **Overlapping subproblems** — when a recursive solution recomputes the exact same smaller problem
  many times (classic example: naive recursive Fibonacci) — the signal that dynamic programming
  applies.
- **Memoization vs tabulation** — memoization caches results of a top-down recursive solution as
  they're computed; tabulation builds the same results bottom-up in a table, usually iteratively —
  both are dynamic programming, just built in opposite directions.

### 2. Where It Sits, and Why Teams Use It

These three form a natural progression: recursion is the base tool, backtracking is recursion
plus explicit undo-and-try-again for exhaustive search problems, and dynamic programming is what
you reach for once you notice a backtracking or naive-recursive solution is wastefully solving the
identical subproblem repeatedly. Recognizing "wait, I've computed this exact subproblem before" is
the single specific insight DP problems are testing for — not a totally different way of thinking,
but the same recursive thinking with a cache.

### 3. What Actually Breaks

- **Recursion without a correct or reachable base case** — infinite recursion until a stack
  overflow, usually from a base case that's technically present but never actually reached due to
  incorrect parameter changes between calls.
- **Backtracking that doesn't actually undo the choice** — forgetting to remove an element from a
  "current path" list before trying the next branch corrupts every subsequent branch's exploration
  with stale state.
- **Solving an overlapping-subproblems problem with naive recursion** — exponential time complexity
  from recomputing the same subproblem repeatedly, when memoizing those results would bring it down
  to polynomial time — the exact naive-Fibonacci-style trap.
- **Applying DP where the "optimal substructure" property doesn't actually hold** — DP requires
  that the optimal solution to the whole problem can be built from optimal solutions to
  subproblems; forcing DP onto a problem without that property produces a wrong, not just slow,
  answer.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I check any recursive solution for overlapping subproblems — if the same smaller call happens
  multiple times, that's my signal to memoize."
- "In backtracking, I'm explicit about the undo step — adding a choice, recursing, then removing it
  before trying the next option."
- "I know DP requires optimal substructure, not just repeated subproblems — I don't reach for it
  just because a problem is recursive."

### 5. Interview-Ready Answer

> "I start most of these problems with the straightforward recursive version, then check whether
> it's recomputing the same subproblem multiple times — if so, that's dynamic programming, either
> by memoizing the recursive calls or rebuilding the same logic bottom-up in a table. For problems
> that are about generating all valid combinations rather than optimizing a single value, that's
> backtracking — recursion with an explicit choose-recurse-undo pattern, where the undo step is
> often the part that's easy to forget and causes a genuinely confusing bug."

### 6. Go Deeper

companion DSA Engineering Handbook's §35 (Recursion) chapter, companion DSA Engineering
Handbook's §38 (Backtracking) chapter, and companion DSA Engineering Handbook's §37 (Dynamic
Programming) chapter for the full progression with worked examples; this book's §139 (pattern
recognition) for spotting which of these three a given problem actually calls for.

---
