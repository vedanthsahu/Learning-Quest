## §139. Pattern Recognition: Matching a Problem to a Technique

### 1. The Vocabulary

- **Pattern recognition (in DSA)** — matching surface features of a problem statement to a known
  technique, before writing any code — the actual skill interviews are testing, more than
  memorized solutions to specific problems.
- **Problem signature** — the recurring phrasing or constraint shape that hints at a technique
  ("find the shortest path" hints BFS; "sorted array, find a pair" hints two pointers).
- **Brute force as a starting point, not an ending point** — stating the naive solution and its
  complexity first is not a weak answer; it's the anchor everything else improves from.

### 2. Where It Sits, and Why Teams Use It

Every other chapter in this Part (§132-138) teaches one technique in isolation. This chapter is
the lookup table connecting a problem's *shape* to *which* of those techniques applies — the skill
most directly responsible for "I've never seen this exact problem before, but I still know where
to start."

**The interview drill map** (problem signature → likely technique):

| Signature | Likely Technique |
|---|---|
| "Does a pair summing to X exist?" | Hash map (§133) |
| "Sorted array, find a pair/triplet" | Two pointers (§134) |
| "Longest/shortest substring satisfying X" | Sliding window (§134) |
| "Top K elements" / "Kth largest" | Heap (§135) |
| "Shortest path, unweighted graph" | BFS (§136) |
| "Generate all combinations/permutations/subsets" | Backtracking (§137) |
| "Optimize a value; problem has overlapping subproblems" | Dynamic programming (§137) |
| "Locally optimal choice provably safe" | Greedy (§138) |
| "Nested/matching structure" | Stack (§135) |
| "Cycle detection in a linked list" | Fast/slow pointers (§134) |

### 3. What Actually Breaks

- **Pattern-matching on surface wording alone** — two problems can use similar words ("find the
  pair...") but require different techniques depending on whether the array is sorted; checking
  the actual constraints matters more than the phrasing.
- **Jumping straight to a technique without stating the brute force first** — skips the chance to
  show the *reasoning* for why a smarter approach is needed, which is often exactly what's being
  evaluated, not just the final answer.
- **Trying to force-fit the only pattern you remember** — using DP for everything because it was
  reviewed most recently, when the problem's actual shape calls for something simpler.
- **Not checking constraints before picking a technique** — input size limits in a real problem
  statement (e.g., n ≤ 20 suggests exponential/backtracking is fine; n ≤ 10⁶ rules it out) are a
  direct, explicit hint most people under time pressure forget to read.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I look for a problem's signature — sorted data, 'shortest path,' 'generate all,' 'optimize
  with overlapping subproblems' — and match it to a known technique before writing any code."
- "I always state the brute-force solution and its complexity first, even briefly, before
  improving on it."
- "I check stated input constraints explicitly — they're often a direct hint about which
  complexity class is expected."

### 5. Interview-Ready Answer

> "My process is signature-first: I look at what the problem is actually asking for — a pair in
> sorted data, a shortest path, generating all combinations, optimizing something with repeated
> subproblems — and match that shape to a known technique rather than trying to recall a specific
> memorized problem. I always start by stating the brute-force approach and its complexity, even
> briefly, since that anchors the improvement and shows the reasoning, not just the final answer."

### 6. Go Deeper

companion DSA Engineering Handbook's §58 (Interview Pattern Recognition Guide) chapter for the
full, expanded version of this drill map with worked examples per pattern; this book's §140 for
what to do once pattern recognition alone doesn't immediately produce an answer.

---
