## §35. Recursion

### 1. Summary

Recursion is a function calling itself on a smaller version of the same problem, with a base case
that stops the recursion. Every recursive call uses a stack frame (see §4 Stacks — the call stack
is a real, implicit stack), so recursion depth is a genuine O(depth) space cost, not a free
abstraction. Don't confuse recursion with iteration purely as a stylistic choice — some problems
(tree traversal, §9-10; backtracking, §38; divide and conquer, §36) are dramatically clearer
recursively because the *problem itself* is naturally self-similar, while others (simple
accumulation over a list) gain nothing from recursion and only add call-stack overhead.

### 2. Why Does It Exist?

Some problems are naturally defined in terms of smaller instances of themselves — a tree's
subtree is itself a tree (§9); a factorial is n times the factorial of n-1. Recursion lets code
mirror that self-similar structure directly, often producing far shorter, clearer code than the
equivalent iterative version, at the cost of call-stack space and, in some languages, a real risk
of stack overflow on deep recursion.

### 3. Mental Model

Russian nesting dolls: to open the outermost doll, you deal with it, then hand off the identical
(but smaller) task to the doll inside — repeating until you reach the smallest doll, which just
opens directly with no further hand-off (the base case). Each doll "waits" (holds its stack
frame) until the one inside finishes.

### 4. Basic Implementation

```
function factorial(n):
    if n <= 1:                    # base case -- without this, infinite recursion
        return 1
    return n * factorial(n - 1)   # recursive case: smaller version of the same problem

function fibonacci_naive(n):       # illustrates the danger: exponential without memoization
    if n <= 1: return n
    return fibonacci_naive(n-1) + fibonacci_naive(n-2)     # O(2^n) -- recomputes overlapping
                                                             # subproblems repeatedly; see §37
```

### 5. Time & Space Complexity

| Aspect | Note |
|---|---|
| Call stack space | O(depth) — real memory cost, not free |
| Naive Fibonacci-style recursion | O(2^n) time if overlapping subproblems aren't cached |
| Tail recursion | Some languages optimize this to O(1) space; **Python does not** — deep tail
  recursion in Python still risks `RecursionError` |
| Max recursion depth in Python | ~1000 by default (`sys.getrecursionlimit()`) — a real,
  practical constraint |

### 6. Visualization

```
factorial(4) call stack (grows downward, unwinds upward):

factorial(4) -> waits for factorial(3)
  factorial(3) -> waits for factorial(2)
    factorial(2) -> waits for factorial(1)
      factorial(1) -> returns 1                    (base case, stack starts unwinding)
    factorial(2) returns 2*1 = 2
  factorial(3) returns 3*2 = 6
factorial(4) returns 4*6 = 24

Stack depth reached: 4 (one frame per call, all held simultaneously at the deepest point)
```

### 7. Real-World Usage

Every DFS-based tree/graph traversal (§9-10, §40) is naturally recursive, mirroring the recursive
definition of a tree itself (a tree is a node plus subtrees, which are themselves trees).
Compilers and interpreters use recursive-descent parsing, where each grammar rule maps directly
to a recursive function. JSON/XML parsing of arbitrarily nested structures is naturally recursive
for the same self-similarity reason.

### 8. Common Interview Questions

"Convert this recursive function to iterative" (usually using an explicit stack, §4, to manually
manage what the call stack would otherwise track) tests whether you understand recursion as
"call stack management," not magic. Any question involving trees, nested structures, or explicit
"divide into smaller sub-problems" is a strong recursion signal. Being asked "what's the base
case here, and does it always terminate" is really testing rigor about the parts of recursion
most likely to introduce infinite loops or stack overflows.

### 9. Key Takeaways

- Recursion mirrors self-similar problem structure directly, at the real cost of O(depth) call-
  stack space — not a free abstraction, and Python's default recursion limit (~1000) is a
  practical constraint worth knowing.
- A correct recursive function needs both a base case (that must be reachable) and a recursive
  case that provably makes progress toward it.
- Naive recursion can recompute the same overlapping subproblem exponentially many times (naive
  Fibonacci is O(2^n)) — the exact motivation for Dynamic Programming's memoization, §37.
- Tree/graph DFS (§9-10, §40), recursive-descent parsing, and nested-structure processing are the
  dominant real-world recursive applications.

---
