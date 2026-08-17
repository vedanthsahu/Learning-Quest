## §6. Deque (Double-Ended Queue)

### 1. Summary

A deque supports O(1) insertion and removal at *both* ends — it's a strict superset of both a
stack (use only one end) and a queue (use the front and back for dequeue/enqueue respectively).
Don't confuse the abstract "deque" concept with Python's concrete `collections.deque` class —
the class is one specific, highly-optimized implementation (a doubly linked list of fixed-size
blocks, not a naive node-per-element linked list), and is the practical, correct choice any time
you'd otherwise reach for a stack or queue in Python.

### 2. Why Does It Exist?

Some problems genuinely need to add or remove from both ends — a sliding window that grows on
the right and shrinks on the left, a work-stealing scheduler where a thread takes from its own
back but other threads steal from the front. A plain stack or queue can't do this; a deque
generalizes both.

### 3. Mental Model

A deck of cards where you can deal from the top or the bottom, and add a new card to either end
— no restriction on which side you use, unlike a stack (top only) or queue (front out, back in
only).

### 4. Basic Implementation

```
struct Deque:
    items = []                        # blocks of fixed-size arrays in practice

function append_right(deque, value):
    deque.items.push_at_back(value)   # O(1)

function append_left(deque, value):
    deque.items.push_at_front(value)  # O(1) -- this is the operation a plain
                                       # array-backed list cannot do in O(1)

function pop_right(deque):  return deque.items.pop_from_back()   # O(1)
function pop_left(deque):   return deque.items.pop_from_front()  # O(1)
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Append/pop at either end | O(1) |
| Access by index (middle) | O(n) |
| Space | O(n) |

### 6. Visualization

```
deque:  front <-> [5][2][8][1] <-> back

append_left(9):   front <-> [9][5][2][8][1] <-> back
pop_right():      front <-> [9][5][2][8] <-> back      (1 removed)

Sliding window maximum using a monotonic deque (§31 Sliding Window):
window = [3,1,-3], deque holds indices of decreasing values
as window slides, expired indices pop from the left,
smaller values pop from the right before the new one is pushed
```

### 7. Real-World Usage

`collections.deque` is Python's go-to for both stack and queue use cases in production code —
its block-based doubly-linked-list implementation gives true O(1) at both ends, unlike a plain
`list`. The monotonic-deque technique inside Sliding Window Maximum (§31) is the single most
common deque-specific algorithmic pattern. Browser history (back/forward) and undo/redo systems
that need bounded history (evict the oldest entry once a max size is hit) are natural
`deque(maxlen=N)` use cases.

### 8. Common Interview Questions

"Sliding window maximum/minimum" is the canonical deque interview question — maintaining a
monotonic deque of candidate indices as the window slides gives O(n) instead of the O(n·k) naive
re-scan. "Design a browser history" or "design an undo/redo stack with a size limit" are direct
`deque(maxlen=N)` applications. Any time a problem needs O(1) access to both the oldest and
newest element simultaneously, that's a deque signature.

### 9. Key Takeaways

- A deque generalizes both stack and queue — O(1) at both ends, strictly more capable than
  either alone.
- `collections.deque` is the practical, correct Python structure for stack/queue/bounded-history
  use cases — prefer it over a plain `list` whenever front-end operations are needed.
- The monotonic deque is the key technique behind sliding-window maximum/minimum problems.
- `deque(maxlen=N)` gives automatic bounded-history eviction for free.

---
