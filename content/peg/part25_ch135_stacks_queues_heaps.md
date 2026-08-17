## §135. Stacks, Queues, and Heaps

### 1. The Vocabulary

- **Stack (LIFO)** — last-in, first-out; push and pop both happen at the same end. Used for
  matching/nesting problems (balanced parentheses), undo history, and function call stacks.
- **Queue (FIFO)** — first-in, first-out; add at one end, remove from the other. Used for BFS
  (§136) and any "process in the order received" logic.
- **Heap (priority queue)** — a tree-based structure that keeps the minimum (min-heap) or maximum
  (max-heap) element accessible in O(1), with O(log n) insertion and removal — used whenever you
  need "the smallest/largest so far" repeatedly, not just once.
- **Monotonic stack** — a stack kept in strictly increasing or decreasing order by popping elements
  that violate the order before pushing a new one — the specific technique behind "next greater
  element" style problems.

### 2. Where It Sits, and Why Teams Use It

These three show up constantly because they each answer a specific access-pattern question a
plain array or hash map doesn't answer efficiently: a stack answers "what was the most recent
unmatched thing," a queue answers "what's been waiting longest," and a heap answers "what's the
current smallest/largest of everything I've seen so far" without re-scanning everything each time.
"Top K" problems (find the K largest elements in a stream) are the canonical heap use case
precisely because a heap avoids re-sorting the whole dataset on every new element.

### 3. What Actually Breaks

- **Using a list and re-sorting on every insertion instead of a heap** — turns an O(log n) "top K"
  operation into an O(n log n) full re-sort, repeated every time, when only the current
  smallest/largest actually needs to be tracked.
- **Balanced-parentheses-style problems solved without a stack** — trying to track nested,
  matching structure with counters alone breaks the moment there's more than one type of bracket
  or any real nesting depth.
- **Confusing a heap's structure with a sorted array** — a heap only guarantees the root is the
  min/max, not that the rest of the structure is sorted; iterating a heap's internal array
  directly in order is a real, subtle bug.
- **Using a stack where a queue was needed (or vice versa)** — BFS implemented accidentally with a
  stack silently turns into a DFS-like traversal, producing a different, wrong traversal order for
  problems that specifically depend on level-by-level processing (§136).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I reach for a heap specifically for 'smallest/largest K so far' problems, since it avoids
  re-sorting the whole dataset on every update."
- "I use a stack for nested or matching structure — parentheses, undo history — and a queue for
  strict arrival-order processing, including BFS."
- "I know a heap only guarantees ordering at the root, not across the whole structure."

### 5. Interview-Ready Answer

> "I pick between these three based on the access pattern the problem actually needs: a stack when
> I need the most recent unmatched item, like validating nested structure; a queue when strict
> first-in-first-out order matters, which is also what makes BFS work correctly; and a heap
> whenever I need the current smallest or largest value repeatedly as data streams in, since it
> avoids re-sorting from scratch on every insertion the way a naive list-based approach would."

### 6. Go Deeper

companion DSA Engineering Handbook's §4 (Stacks), companion DSA Engineering Handbook's §5
(Queues), and companion DSA Engineering Handbook's §16 (Heaps) chapters for full implementation
details and monotonic-stack worked examples; this book's §136 (BFS/DFS) for how queues and stacks
underlie graph traversal specifically.

---
