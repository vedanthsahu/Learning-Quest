## §36. Divide & Conquer

### 1. Summary

Divide & Conquer (D&C) solves a problem by splitting it into independent subproblems of the same
type, solving each recursively, and combining their results. Merge sort (§34) — split in half,
sort each half, merge — is the canonical example. Don't confuse D&C with plain Recursion (§35) —
all D&C algorithms are recursive, but not all recursion is D&C; D&C specifically requires the
subproblems to be *independent* (no overlap) and *combinable*. That independence is precisely the
property Dynamic Programming (§37) drops — DP's subproblems *do* overlap, which is the single
sentence that connects these two chapters.

### 2. Why Does It Exist?

Some problems can be split into pieces that don't depend on each other at all — sorting the left
half of an array doesn't need any information from sorting the right half. Recognizing that
independence lets you solve each piece separately (often recursively, sometimes even in parallel)
and combine results, frequently turning an O(n²) problem into O(n log n).

### 3. Mental Model

Splitting a large task among independent teams: each team works on its own third of the problem
with zero coordination needed until the very end, when their results are stitched together. The
"stitching together" step (the *combine* step) is often where the real algorithmic cleverness
lives — in merge sort it's the O(n) merge; in the classic "maximum subarray" D&C solution, it's
correctly handling the case where the best answer straddles the split point.

### 4. Basic Implementation (general template)

```
function divide_and_conquer(problem):
    if problem is small enough:
        return solve_directly(problem)          # base case
    left_half, right_half = divide(problem)      # split into independent pieces
    left_result = divide_and_conquer(left_half)
    right_result = divide_and_conquer(right_half)
    return combine(left_result, right_result)    # often the hardest part to get right

# Concrete: finding max subarray sum crossing the midpoint (Kadane-adjacent D&C variant)
function max_crossing_sum(array, low, mid, high):
    left_sum = -infinity; total = 0
    for i from mid down to low:
        total += array[i]
        left_sum = max(left_sum, total)
    right_sum = -infinity; total = 0
    for i from mid+1 to high:
        total += array[i]
        right_sum = max(right_sum, total)
    return left_sum + right_sum                   # combine step
```

### 5. Time & Space Complexity

| Algorithm | Complexity | Why |
|---|---|---|
| Merge Sort (§34) | O(n log n) | log n split levels, O(n) combine (merge) work per level |
| Binary Search (§29) | O(log n) | log n split levels, O(1) combine work per level |
| Max subarray sum (D&C version) | O(n log n) | log n levels, O(n) combine work per level |
| Master Theorem (general tool) | T(n) = a·T(n/b) + O(n^d) resolves to a closed form
  based on comparing a vs. b^d | used to analyze any D&C recurrence without deriving from scratch |

### 6. Visualization

```
Merge sort as D&C:                     Max subarray straddling the split:

  [5,2,8,1,9,3]                        left half best: ...  ]
   /          \                        right half best: [ ...
[5,2,8]     [1,9,3]                    CROSSING best: must include the midpoint boundary
 /   \       /   \                     explicitly -- this is the "combine" step's whole job;
[5,2][8]  [1,9][3]                     neither the left nor right recursive call can find it
 ...merge...      ...merge...          on its own, because it spans BOTH halves.
```

### 7. Real-World Usage

Merge sort's use in external, disk-backed sorting (database `ORDER BY` on data too large for
memory) and in distributed computing (MapReduce's "map" phase processes independent chunks in
parallel, mirroring D&C's independence requirement, before a "reduce"/combine phase) are direct
real-world D&C applications. Any embarrassingly-parallel workload — where subtasks genuinely
don't depend on each other — is a systems-level expression of the same D&C independence property.

### 8. Common Interview Questions

"Maximum subarray sum" has both a D&C solution (O(n log n), this chapter) and a simpler O(n)
dynamic programming solution (Kadane's algorithm, effectively a 1D DP, §37) — knowing both exist,
and that the DP version is strictly better here, is itself a useful thing to say in an interview.
"Closest pair of points" and "counting inversions in an array" are classic D&C problems where the
combine step (handling pairs that straddle the split) is the crux of the difficulty, not the
split itself.

### 9. Key Takeaways

- D&C requires genuinely independent subproblems — the combine step (often the hardest part to
  design correctly) merges their results, frequently having to handle cases that straddle the
  split point.
- The Master Theorem gives a fast way to derive a D&C algorithm's complexity from its recurrence
  shape (a subproblems of size n/b, plus O(n^d) combine work) without re-deriving from scratch.
- The very next chapter, Dynamic Programming (§37), is best understood as "D&C, but for problems
  whose subproblems overlap" — memoizing those overlapping results is DP's entire addition.
- Distributed "map" phases (independent chunk processing) are a direct systems-level analogue of
  D&C's independence requirement.

---
