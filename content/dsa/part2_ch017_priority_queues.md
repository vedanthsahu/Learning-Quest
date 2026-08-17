## §17. Priority Queues

### 1. Summary

A priority queue is an *abstract data type*: a collection where each element has a priority, and
`extract` always returns the highest (or lowest) priority element — not necessarily the one
inserted first, unlike a plain Queue (§5). Don't confuse the interface with its implementation: a
Heap (§16) is the standard way to *build* a priority queue efficiently (O(log n) insert/extract),
but a priority queue could in principle be backed by a sorted array or even a plain list — just
with worse complexity. When people say "priority queue" in an interview, they almost always mean
"use a heap," but it's worth knowing these are conceptually distinct layers.

### 2. Why Does It Exist?

Plenty of real scheduling problems care about "most urgent next," not "arrived first" or "any
order at all" — an emergency room doesn't treat patients FIFO. A priority queue is the interface
that captures that requirement directly, independent of which concrete structure implements it.

### 3. Mental Model

An airport priority boarding line: passengers aren't served in arrival order (that's a plain
queue) — first-class and urgent passengers cut ahead regardless of when they arrived, based
purely on their assigned priority.

### 4. Basic Implementation

```
# Priority queue backed by a heap (the standard, efficient approach) -- see §16
struct PriorityQueue:
    heap = []                              # min-heap by default; negate values for max-heap

function push(pq, priority, item):
    heap_insert(pq.heap, (priority, item))  # O(log n), see §16

function pop(pq):
    priority, item = heap_extract_min(pq.heap)   # O(log n)
    return item

# Python in practice: heapq module directly on tuples (priority, item)
import heapq
pq = []
heapq.heappush(pq, (2, "task_b"))
heapq.heappush(pq, (1, "task_a"))          # lower number = higher priority, by convention
priority, task = heapq.heappop(pq)          # returns (1, "task_a") first
```

### 5. Time & Space Complexity

| Operation | Heap-Backed (standard) | Sorted-Array-Backed | Unsorted-List-Backed |
|---|---|---|---|
| Push | O(log n) | O(n) — insertion point shift | O(1) |
| Pop highest priority | O(log n) | O(1) | O(n) — must scan for max |
| Peek highest priority | O(1) | O(1) | O(n) |

### 6. Visualization

```
Tasks pushed with priorities (lower = more urgent): (3,"cleanup") (1,"fire alarm") (2,"email")

Heap-backed priority queue always pops in priority order regardless of push order:
pop() -> (1, "fire alarm")
pop() -> (2, "email")
pop() -> (3, "cleanup")

(Contrast with a plain Queue, §5, which would pop in push order: cleanup, fire alarm, email --
 wrong for this use case entirely.)
```

### 7. Real-World Usage

Operating system process schedulers assign priorities and always dispatch the highest-priority
runnable process next — conceptually a priority queue, even where the concrete implementation is
a Red-Black tree ordered by virtual runtime (Linux CFS, §49) rather than a literal heap.
Kubernetes' scheduler (§50) and cloud task/work queues (§54) that support priority levels are
priority queues at the interface level. Dijkstra's algorithm (§43) is defined in terms of "always
process the next-closest unvisited node" — literally a priority-queue-driven algorithm, with a
heap as the concrete backing structure.

### 8. Common Interview Questions

Any question phrased as "always process the most urgent/closest/largest next, from a changing
set" is a priority queue signature — distinguish it from "top-K of a fixed set" (still a heap,
but a slightly different framing, see §16). "Implement a task scheduler with priorities" is
directly asking for this ADT, implemented with a heap. Confusing priority queue (ADT) with heap
(implementation) in an explanation is a common, easily-avoided slip — naming both layers
explicitly reads as more precise in an interview.

### 9. Key Takeaways

- Priority Queue is the *interface* ("always give me the highest-priority item next"); Heap
  (§16) is the standard *implementation* that makes that interface efficient — keep the two
  layers distinct in your own explanations.
- A heap-backed priority queue gives O(log n) push/pop; naive alternatives (sorted array,
  unsorted list) trade that for an O(n) cost somewhere.
- OS schedulers, Kubernetes' scheduler, and Dijkstra's algorithm are all priority-queue-driven
  at the conceptual level, even when the concrete backing structure varies (heap vs. Red-Black
  tree, §49).
- "Most urgent next from a changing set" is the phrase to listen for.

---
