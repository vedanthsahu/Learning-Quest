## §4. Stacks

### 1. Summary

A stack is a Last-In-First-Out (LIFO) collection supporting `push` (add to top) and `pop`
(remove from top), both O(1). Don't confuse a stack with a queue (§5, FIFO) — the only
difference is which end you remove from, but that single difference changes which real-world
problems each one solves. In Python, a plain `list` used with `.append()`/`.pop()` (no index
argument) *is* an efficient stack — both operations are O(1) amortized at the end of a list.

### 2. Why Does It Exist?

Many real processes are naturally "undo the most recent thing first" — backtracking out of a
recursive call, undoing the last editor action, matching the most recently opened bracket. A
stack is the structure whose access pattern matches that exactly, with no need to track anything
beyond "what's on top."

### 3. Mental Model

A stack of plates: you can only add or remove from the top. To reach the third plate down, you
must remove the two above it first. There is no "reach into the middle" operation — if a problem
needs that, it needs a different structure.

### 4. Basic Implementation

```
struct Stack:
    items = []                     # array-backed; Python list works directly

function push(stack, value):
    stack.items.append(value)      # O(1) amortized

function pop(stack):
    return stack.items.pop()       # O(1), removes and returns the last element

function peek(stack):
    return stack.items[-1]         # O(1), look without removing
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Push | O(1) amortized |
| Pop | O(1) |
| Peek (top) | O(1) |
| Search by value | O(n) |
| Space | O(n) |

### 6. Visualization

```
push(1) push(2) push(3):        pop():
   | 3 | <- top                   | 2 | <- top (3 removed)
   | 2 |                          | 1 |
   | 1 |
   +---+                          +---+

Call stack during recursion (factorial(3)):
   factorial(1)  <- currently executing, top of call stack
   factorial(2)
   factorial(3)  <- bottom, called first
```

### 7. Real-World Usage

Every function call in every language uses a call stack — this is why deep, unbounded recursion
causes a stack overflow, and why recursive algorithms (§35 Recursion) have an implicit O(depth)
space cost even with no explicit data structure. Undo/redo functionality in editors, the browser
back button, and bracket/expression matching (validating `{[()]}`) are all direct stack
applications. The JVM, CPython interpreter, and every compiled language's runtime maintain an
explicit call stack for exactly this LIFO reason.

### 8. Common Interview Questions

Any "matching pairs" or "nesting validity" problem (valid parentheses, HTML tag matching) is a
stack problem — push opening symbols, pop and compare on closing symbols. "Evaluate this
postfix/infix expression" is a stack problem. Monotonic stack — maintaining a stack where values
are kept in increasing or decreasing order, popping elements that violate the order as you scan
— is the technique behind "next greater element," "daily temperatures," and "largest rectangle in
a histogram"; if a problem asks for the nearest larger/smaller element to the left or right of
each position, think monotonic stack immediately (see also Sliding Window, §31, where the same
idea appears as a monotonic deque).

### 9. Key Takeaways

- Stacks are LIFO — push/pop/peek all O(1), no access to non-top elements.
- The call stack is an implicit stack behind every recursive algorithm; recursion depth is a
  real space cost, not just a Big-O abstraction.
- Bracket/nesting-validity and expression-evaluation problems are the classic stack signature.
- The monotonic stack pattern turns an apparent O(n²) "for each element, scan the rest" problem
  into O(n) — recognize it whenever the question involves "next/previous greater/smaller".

---
