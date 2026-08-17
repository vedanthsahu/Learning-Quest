## §16. Heaps

### 1. Summary

A heap is a complete binary tree (every level full except possibly the last, filled left to
right) satisfying the **heap property**: in a min-heap, every parent is ≤ both children (so the
minimum is always at the root); in a max-heap, every parent is ≥ both children. Don't confuse a
heap with a Binary Search Tree (§11) — a heap enforces only a parent-vs-children relationship,
not a full left-smaller/right-larger ordering, which means a heap gives O(1) access to the
min/max but *no* efficient way to search for an arbitrary value — that's a fundamentally
different guarantee than a BST's.

### 2. Why Does It Exist?

Many problems only ever need "give me the current smallest/largest, repeatedly, while the set
keeps changing" — not full sorted order and not arbitrary search. A heap gives O(1) peek and
O(log n) insert/extract for exactly that access pattern, cheaper than keeping a fully sorted
structure would be for pure repeated-min/max use.

### 3. Mental Model

Picture the heap property as a strict hierarchy: nobody's boss is smaller than them (min-heap).
The overall smallest element must be the very top boss, because everyone below is required to be
≥ their own parent, transitively. But two employees at the same level have no required
relationship to each other — that's exactly what a heap does *not* guarantee, unlike a BST.

### 4. Basic Implementation (array-backed — the standard, not a pointer-based tree)

```
# Heaps are conventionally stored in a plain array, using index arithmetic instead of
# pointers: for node at index i, parent = (i-1)//2, left child = 2i+1, right child = 2i+2

function sift_up(heap, i):                    # used after insert (append at end)
    while i > 0 and heap[parent(i)] > heap[i]:
        swap(heap, i, parent(i))
        i = parent(i)

function sift_down(heap, i):                  # used after extract_min (swap root with last)
    smallest = i
    for child in [left(i), right(i)]:
        if child < len(heap) and heap[child] < heap[smallest]:
            smallest = child
    if smallest != i:
        swap(heap, i, smallest)
        sift_down(heap, smallest)

function insert(heap, value):
    heap.append(value)
    sift_up(heap, len(heap) - 1)               # O(log n)

function extract_min(heap):
    root = heap[0]
    heap[0] = heap.pop()                        # move last element to root
    sift_down(heap, 0)                          # O(log n)
    return root
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Peek min/max | O(1) |
| Insert | O(log n) |
| Extract min/max | O(log n) |
| Build heap from n items | O(n) (not O(n log n) — a well-known, non-obvious result) |
| Search for arbitrary value | O(n) — heaps are bad at this, unlike a BST |
| Space | O(n), array-backed, no pointer overhead |

### 6. Visualization

```
Min-heap as a tree:                Same heap as an array (index-based):
        2
       / \                          index:  0  1  2  3  4  5
      5   3                         value:  2  5  3  8  9  7
     / \  /
    8  9 7

parent(3) = index (3-1)//2 = 1 -> value 5   (child 8 >= parent 5, valid)
left(0) = 2*0+1 = 1 -> value 5
right(0) = 2*0+2 = 2 -> value 3
```

### 7. Real-World Usage

The **Kubernetes scheduler** and priority-based task schedulers use heap-like structures to
always pick the next highest-priority pending item in O(log n) (see §50). Dijkstra's shortest
path algorithm (§43) and Prim's MST algorithm (§44) both use a min-heap to always process the
next-closest unvisited node efficiently. "Top-K" problems (top K frequent elements, K closest
points) are a heap's signature application — maintain a heap of size K instead of sorting
everything. Python's `heapq` module implements exactly this array-backed binary min-heap.

### 8. Common Interview Questions

"Find the K largest/smallest elements" or "the K most frequent items" is the canonical heap
question — maintain a heap of size K, O(n log K), instead of sorting the full input, O(n log n).
"Merge K sorted lists" uses a min-heap holding one candidate from each list to always emit the
global next-smallest in O(log K). "Design a priority queue" is directly asking for this
structure by another name (see §17, which formalizes the Priority Queue as the abstract
interface a heap is the standard concrete implementation of).

### 9. Key Takeaways

- A heap guarantees only parent-vs-children ordering, giving O(1) peek and O(log n)
  insert/extract for the min or max — it is not a general search structure.
- Heaps are conventionally array-backed using index arithmetic (2i+1, 2i+2, (i-1)//2), not
  pointer-based nodes — far more cache-friendly and memory-efficient than a pointer tree.
- Building a heap from n elements all at once is O(n), not O(n log n) — a frequently-missed
  detail worth remembering explicitly.
- "Top-K" and "merge K sorted things" are the two dominant heap interview signatures.

---
