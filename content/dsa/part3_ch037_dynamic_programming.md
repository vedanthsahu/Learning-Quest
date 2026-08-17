## §37. Dynamic Programming

### 1. Summary

Dynamic Programming (DP) is Divide & Conquer (§36) applied to problems whose subproblems
*overlap* — instead of solving the same subproblem repeatedly (as naive recursion would, §35),
DP caches each unique subproblem's answer once and reuses it. There are two equivalent
implementation styles: **memoization** (top-down — recurse normally, but check a cache first) and
**tabulation** (bottom-up — build up a table of subproblem answers iteratively, starting from the
smallest). Don't confuse "DP" with "just recursion" — the caching of overlapping results is the
entire point; a recursive solution with no overlapping subproblems (like merge sort, §36) gains
nothing from memoization and isn't really "DP" in the meaningful sense.

### 2. Why Does It Exist?

Naive recursive solutions to problems like Fibonacci or edit distance recompute the exact same
subproblem an exponential number of times (naive Fibonacci is O(2^n), see §35). DP recognizes
that there are actually only O(n) or O(n²) *distinct* subproblems, no matter how many times
they're each re-requested, and caching each one's answer the first time collapses the total work
to the number of distinct subproblems.

### 3. Mental Model

Think of DP as "recursion with a notebook": every time you're about to solve a subproblem,
check the notebook first — if you've already solved it, just read the answer instead of
recomputing. The entire DP skill is (a) correctly identifying what the subproblems are and how
they relate (the recurrence), and (b) deciding whether to fill the notebook top-down (as
requested, i.e. memoization) or bottom-up (in a predetermined order, i.e. tabulation).

### 4. Basic Implementation

```
# Top-down: memoization (recursion + cache)
function fib_memo(n, cache={}):
    if n <= 1: return n
    if n in cache: return cache[n]
    cache[n] = fib_memo(n-1, cache) + fib_memo(n-2, cache)
    return cache[n]                          # O(n), each subproblem solved exactly once

# Bottom-up: tabulation (iterative, no recursion, no call-stack risk)
function fib_tabulation(n):
    if n <= 1: return n
    table = [0] * (n + 1)
    table[1] = 1
    for i in range(2, n + 1):
        table[i] = table[i-1] + table[i-2]    # build up from smallest subproblems
    return table[n]

# Classic 2D DP: edit distance (Levenshtein) between two strings
function edit_distance(a, b):
    dp = 2D table of size (len(a)+1) x (len(b)+1)
    for i in range(len(a)+1): dp[i][0] = i     # base cases: transform to/from empty string
    for j in range(len(b)+1): dp[0][j] = j
    for i in range(1, len(a)+1):
        for j in range(1, len(b)+1):
            if a[i-1] == b[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[len(a)][len(b)]
```

### 5. Time & Space Complexity

| Problem | Naive Recursion | DP (memoized/tabulated) |
|---|---|---|
| Fibonacci(n) | O(2^n) | O(n) time, O(n) space (or O(1) with rolling variables) |
| Edit distance (strings of length m, n) | O(3^(m+n)) | O(m·n) time, O(m·n) space (often
  reducible to O(min(m,n)) with a rolling-row optimization) |
| 0/1 Knapsack (n items, capacity W) | O(2^n) | O(n·W) time and space |

### 6. Visualization

```
Naive Fibonacci recursion tree for fib(5) -- massive overlap (highlighted subtrees repeat):
                    fib(5)
                 /          \
            fib(4)          fib(3)
           /      \          /    \
      fib(3)    fib(2)   fib(2)  fib(1)
      /   \      /  \      /  \
  fib(2) fib(1) ...  ...  ...  ...
  <- fib(3), fib(2) each computed multiple times -> exactly what memoization eliminates

DP table for edit_distance("cat", "cut"):
      ""  c  u  t
  ""   0  1  2  3
  c    1  0  1  2
  a    2  1  1  2
  t    3  2  2  1     <- answer: 1 (substitute 'a' for 'u')
```

### 7. Real-World Usage

Diff tools (`git diff`, `diff` utility) compute edit distance / longest-common-subsequence via
exactly this DP table to find a minimal set of line changes between two file versions. Sequence
alignment in bioinformatics uses the same edit-distance DP structure. Route/pricing optimization
(shortest path with additional constraints, resource-allocation/knapsack-style budget problems)
in logistics and finance are real, production DP applications, not just interview exercises.

### 8. Common Interview Questions

The reliable DP-recognition process: (1) can the problem be broken into subproblems, (2) do those
subproblems overlap (if not, it's D&C, §36, not DP), (3) can you write a recurrence relating a
subproblem to smaller ones. "Climbing stairs," "house robber," "coin change," "longest increasing
subsequence," and "0/1 knapsack" are the standard drilling set, each a slightly different
recurrence shape worth recognizing by name. A very common, valuable follow-up is "can you reduce
the space complexity" — many 2D DP tables (like edit distance above) only ever need the previous
row, collapsing O(m·n) space to O(min(m,n)).

### 9. Key Takeaways

- DP = D&C (§36) for problems with *overlapping* subproblems — caching each distinct subproblem's
  answer once is the entire mechanism, whether done top-down (memoization) or bottom-up
  (tabulation).
- The skill is identifying the recurrence (how a subproblem relates to smaller ones) — the
  caching itself is mechanical once the recurrence is correct.
- Tabulation avoids recursion's call-stack depth risk (§35) entirely, which matters for large n
  in Python specifically, given its low default recursion limit.
- Diff tools and sequence alignment are genuine, widely-used real-world DP applications — this
  is not a purely academic technique.

---
