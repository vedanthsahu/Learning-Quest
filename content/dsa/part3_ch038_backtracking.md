## §38. Backtracking

### 1. Summary

Backtracking is recursive (§35) exploration of a decision tree that abandons ("backtracks out
of") a partial solution the moment it's known to be invalid or unable to lead to a valid one,
rather than exploring it to completion. Don't confuse backtracking with Dynamic Programming
(§37) — DP applies when overlapping subproblems can be cached and reused; backtracking is for
problems that require enumerating *all* valid complete solutions (or finding one), where the
"subproblems" are usually not overlapping in the reusable sense, and the win comes from pruning
invalid branches early, not from caching.

### 2. Why Does It Exist?

Some problems require exploring a combinatorially large space of possible choices (which cells to
place a queen on, which numbers go in each Sudoku cell) where brute-force enumeration of every
complete possibility is prohibitively slow. Backtracking prunes the search the instant a partial
choice is already known to be invalid, avoiding the wasted work of completing an already-doomed
partial solution.

### 3. Mental Model

Exploring a maze by trying a path, and the moment you hit a dead end, walking back to the last
junction and trying a different direction — never wasting time exploring further past a point
that's already provably a dead end, in contrast to blindly trying every possible full path
from the start.

### 4. Basic Implementation (general template)

```
function backtrack(partial_solution, choices_remaining):
    if is_complete(partial_solution):
        record(partial_solution)                 # found one valid full solution
        return
    for choice in choices_remaining:
        if is_valid(partial_solution, choice):     # prune invalid choices immediately
            partial_solution.add(choice)
            backtrack(partial_solution, remaining_choices_after(choice))
            partial_solution.remove(choice)         # THE key step: undo before trying next choice

# Concrete: N-Queens
function solve_n_queens(row, columns_used, diagonals_used):
    if row == N:
        record_solution()
        return
    for col in range(N):
        if col not in columns_used and not attacks_diagonal(row, col):
            columns_used.add(col)
            solve_n_queens(row + 1, columns_used, diagonals_used)
            columns_used.remove(col)                # backtrack: undo this placement
```

### 5. Time & Space Complexity

| Problem | Brute Force (no pruning) | Backtracking |
|---|---|---|
| N-Queens | O(N^N) | Much better in practice via early pruning, though still exponential
  worst case — the win is practical, not asymptotic |
| Sudoku solver | O(9^(number of blanks)) | Same worst-case bound, but constraint-checking
  prunes the vast majority of branches in practice |
| Subsets / permutations generation | O(2^n) / O(n!) — inherent to the problem, not improvable |

Backtracking's value is almost always a *practical* speedup from pruning, not a change in
worst-case asymptotic complexity — the search space itself is inherently exponential for these
problem types.

### 6. Visualization

```
Generating subsets of [1,2,3] via backtracking (include/exclude each element):

                    []
              /            \
         include 1      exclude 1
            [1]              []
           /    \           /    \
       incl.2  excl.2   incl.2  excl.2
       [1,2]    [1]      [2]      []
       /  \     /  \     /  \     /  \
     ...  ... ...  ...  ...  ... ...  ...

Each leaf = one complete subset. "Backtrack" = after fully exploring the include-1 branch,
undo (remove 1) before exploring the exclude-1 branch -- reusing the same recursive call stack.
```

### 7. Real-World Usage

Constraint-satisfaction solvers (Sudoku, N-Queens, scheduling with hard constraints) are the
textbook backtracking application. Compiler/parser backtracking (some parsing strategies try a
grammar rule, and backtrack to try an alternative rule if it fails to match) uses the identical
try-then-undo-then-try-next-alternative pattern. Combinatorial test-case generation (enumerating
valid configurations subject to constraints) in QA tooling is a direct, practical use.

### 8. Common Interview Questions

"Generate all subsets/permutations/combinations" and "N-Queens" and "Sudoku solver" are the
standard backtracking drilling set — all follow the identical template (choose, recurse, undo).
"Word search in a grid" combines backtracking with DFS (§40) directly — recognizing when a
problem needs *all* valid solutions (or existence of at least one), rather than a single optimal
value (which would point toward DP, §37, instead), is the key initial triage.

### 9. Key Takeaways

- Backtracking explores a decision tree, pruning branches the instant they're known invalid, and
  explicitly undoes each choice before trying the next alternative — the undo step is what
  distinguishes it from plain unconditional recursive enumeration.
- Its value is almost always a practical speedup via early pruning, not a change to the
  underlying exponential worst-case bound — these problems are inherently combinatorially large.
- Distinguish from DP (§37): backtracking is for enumerating all valid complete solutions (or
  finding one under hard constraints); DP is for optimizing over overlapping subproblems with a
  single best-value answer.
- N-Queens, Sudoku, and subset/permutation generation share one identical template — learn the
  template once, not each problem separately.

---
