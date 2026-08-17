## §132. Big-O Notation and Talking About Complexity

### 1. The Vocabulary

- **Big-O notation** — describes how an algorithm's runtime or memory use grows as input size
  grows, ignoring constant factors — the shape of the growth curve, not a stopwatch measurement.
- **Common complexities, smallest to largest growth** — O(1) constant, O(log n) logarithmic, O(n)
  linear, O(n log n) linearithmic, O(n²) quadratic, O(2ⁿ) exponential.
- **Time complexity vs space complexity** — how runtime scales with input size, versus how memory
  use scales with it — both matter, and an interview answer that only mentions one is incomplete.
- **Best/average/worst case** — the same algorithm can have different complexities depending on
  input shape (e.g., quicksort is O(n log n) average but O(n²) worst case on already-sorted input
  with a naive pivot choice).

### 2. Where It Sits, and Why Teams Use It

Big-O is the shared vocabulary for answering "will this still work when the input is 100x
bigger?" without actually running it at that scale. It's the first thing an interviewer listens
for after a working solution, and it's a real production concern too: a nested loop over a
dataset that was 100 rows in staging and is 10 million rows in production is often exactly how a
"why is this suddenly so slow" incident starts (see §102).

### 3. What Actually Breaks

- **Stating a complexity without being able to justify it** — saying "this is O(n log n)" without
  being able to point at which part of the code produces the log n factor reads as memorized
  rather than understood.
- **Ignoring space complexity entirely** — a solution that trades a huge amount of memory for
  speed might not be acceptable depending on constraints never asked about — mentioning the
  tradeoff at least once shows awareness even without solving it.
- **Confusing "big O" with "actual measured speed"** — a lower Big-O algorithm can be slower in
  practice on small inputs due to constant factors (a hash map's constant-time lookup still has
  real overhead) — Big-O describes scaling behavior, not a universal speed ranking.
- **Not distinguishing average and worst case when it matters** — presenting a hash map lookup as
  unconditionally O(1) without acknowledging the O(n) worst case under pathological collisions
  misses a real, sometimes-asked-about nuance.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I can name the complexity of a solution and point to exactly which part of the code produces
  it — usually a loop, a nested loop, or a divide-and-conquer split."
- "I mention space complexity, not just time, especially when there's an obvious tradeoff between
  the two."
- "I know Big-O describes growth as input size increases, not a literal stopwatch comparison
  between two algorithms on the same small input."

### 5. Interview-Ready Answer

> "When I state a complexity, I connect it directly to the code — a single loop over n items is
> O(n), a loop inside a loop is O(n²), a solution that repeatedly halves the search space is
> O(log n). I also mention space complexity when there's a real tradeoff, like using extra memory
> for a hash map to bring time complexity down from O(n²) to O(n). And I'm careful to describe
> average versus worst case where it actually matters, rather than treating every data structure's
> complexity as a single fixed number."

### 6. Go Deeper

DSA Engineering Handbook's Appendix C (Master Complexity Cheat Sheet) for the full per-structure/
per-algorithm complexity reference (this book's cross-reference linking only resolves numbered
chapters, not lettered appendices, so this one isn't a clickable link); this book's §139 (pattern
recognition) for how complexity reasoning feeds directly into picking the right approach.

---
