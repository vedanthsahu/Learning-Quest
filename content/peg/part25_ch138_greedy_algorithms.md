## §138. Greedy Algorithms and When They Work

### 1. The Vocabulary

- **Greedy algorithm** — makes the locally optimal choice at each step, without reconsidering
  earlier choices, and never backtracks.
- **Greedy-choice property** — the specific property a problem must have for greedy to produce a
  correct global answer: a locally optimal choice must never prevent reaching the globally optimal
  solution.
- **Exchange argument** — the standard technique for *proving* a greedy approach is correct: show
  that any optimal solution can be transformed into the greedy solution without making it worse.
- **Greedy vs DP** — both build a solution incrementally, but greedy never looks back to reconsider
  a choice, while DP explicitly considers multiple choices and keeps the best; a problem where
  greedy fails is very often a DP problem instead.

### 2. Where It Sits, and Why Teams Use It

Greedy algorithms are attractive because they're usually simpler and faster than DP — but only a
subset of problems actually have the greedy-choice property, and the interview skill being tested
is recognizing which category a problem falls into, not just knowing the word "greedy." Classic
correct greedy examples: interval scheduling (always pick the meeting that ends earliest), and
coin change with certain coin systems (not all — this is a common trap, covered below).

### 3. What Actually Breaks

- **Applying greedy to a problem without the greedy-choice property** — the classic trap example is
  coin change with an arbitrary coin denomination set: greedy (always take the largest coin that
  fits) works for US currency but produces a wrong, suboptimal answer for some denomination sets —
  this exact example is why "greedy feels right" isn't sufficient justification on its own.
- **No justification for why greedy is correct here** — presenting a greedy solution without being
  able to explain *why* the locally optimal choice can't hurt the global outcome reads as guessing,
  even if the answer happens to be correct.
- **Confusing "greedy is simpler" with "greedy is safer"** — greedy solutions are often shorter and
  faster to write, which is exactly what makes it tempting to reach for one without first checking
  whether the problem actually supports it.
- **Missing that a problem is greedy when DP would also work but be overkill** — the opposite
  failure: reaching for a full DP table when a simpler, provably-correct greedy pass would do,
  costing unnecessary complexity in an interview answer.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Before committing to a greedy approach, I ask whether a locally optimal choice can ever prevent
  reaching the true optimum — if I can't justify that, I default to considering DP instead."
- "I know the classic trap: greedy coin-change works for some denomination systems and silently
  fails for others — that's the shape of bug greedy introduces when misapplied."
- "I use interval scheduling (pick the earliest-ending option first) as my mental reference example
  for when greedy is provably correct."

### 5. Interview-Ready Answer

> "I reach for greedy when I can actually justify that a locally optimal choice never closes off
> the globally optimal solution — interval scheduling, where always picking the earliest-ending
> option is provably correct, is my reference case. If I can't make that argument, I don't trust a
> greedy approach just because it feels intuitive — the classic coin-change trap is a good example
> of greedy looking right and being wrong for certain inputs — and I fall back to dynamic
> programming instead."

### 6. Go Deeper

companion DSA Engineering Handbook's §39 (Greedy Algorithms) chapter for the full exchange-argument
proofs and worked examples including interval scheduling and Huffman coding; this book's §137
(recursion/backtracking/DP) for the fallback technique when greedy doesn't apply.

---
