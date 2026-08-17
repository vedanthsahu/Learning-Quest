## §57. Hard-Choice Decision Trees

*The selection tables in §56 cover the easy cases. This chapter walks through the decisions
that genuinely have two defensible answers, and the specific question that resolves each.*

### Array vs. Linked List?

```
Do you need random access by index (arr[47] directly)?
├── Yes -> Array (§1) -- linked lists are O(n) for this, always
└── No -> Do you need frequent insert/delete in the middle, at a KNOWN position?
          ├── Yes -> Linked List (§3) -- O(1) once you're at the node
          └── No -> Array is still simpler and more cache-friendly -- use it
```
In practice, Python code almost never hand-rolls a linked list — `collections.deque` (§6) covers
the "need O(1) at both ends" case, and `list` covers everything else.

### Hash Table vs. TreeMap/BST-backed Map?

```
Do you need sorted iteration, range queries (all keys between X and Y), or floor/ceiling lookups?
├── Yes -> Balanced BST / Red-Black Tree (§11, §13) -- O(log n), maintains order
└── No -> Hash Table (§7) -- O(1) average, no ordering overhead
```
Default to the hash table unless you specifically need one of the ordered operations — most code
doesn't.

### BFS vs. DFS?

```
Do you need the SHORTEST path (fewest edges) in an unweighted graph, or level-by-level processing?
├── Yes -> BFS (§41)
└── No -> Do you need to explore ALL paths, detect cycles, or do a topological-sort-style
          post-order computation?
          ├── Yes -> DFS (§40)
          └── No (just need reachability, either works) -> DFS is usually simpler to write
              recursively
```

### Heap vs. Sorted Structure for "Top-K"?

```
Do you need the top K elements ONCE, from a static collection?
├── Yes, and K is small relative to n -> Heap of size K (§16) -- O(n log K)
├── Yes, and K is close to n -> just sort everything (§34) -- O(n log n), simpler
└── No, you need top-K continuously as elements are ADDED over time
    -> Heap (§16) -- maintain it incrementally, O(log n) per insert
```

### Dynamic Programming vs. Greedy?

```
Does a provably-optimal LOCAL choice always lead to a globally optimal solution
(greedy-choice property + optimal substructure, §39)?
├── Yes, and you can prove it (or it's a KNOWN greedy-safe problem, e.g. activity
│   selection, Huffman coding, MST via Kruskal/Prim) -> Greedy (§39) -- faster, simpler
└── No, or you're not sure -> Dynamic Programming (§37) -- always correct if the
    recurrence is right, at the cost of more time/space than greedy would need
```
When in doubt, default to DP and only switch to greedy once you can actually articulate *why*
the greedy choice is safe for this specific problem — see §39's 0/1 Knapsack counterexample for
what happens when greedy is assumed without proof.

### Kruskal's vs. Prim's for MST?

```
Is the graph sparse (E close to V) or is it given as a list of edges already?
├── Yes -> Kruskal's (§44) -- sort edges, Union-Find (§20) for cycle detection
└── No, the graph is dense (E close to V^2) or given as an adjacency structure
    -> Prim's (§44) -- grows outward via a priority queue (§17), avoids sorting ALL edges upfront
```

### B-Tree vs. B+Tree vs. Red-Black Tree for an index?

```
Is this an in-memory ordered structure (e.g. a language's TreeMap)?
├── Yes -> Red-Black Tree (§13) -- no disk I/O concerns, fewer rotations than AVL
└── No, this is a disk-backed database/filesystem index
    -> Do range queries (scan a range of keys) matter?
       ├── Yes -> B+Tree (§15) -- leaf-linking makes range scans efficient
       └── No, mostly point lookups -> B-Tree (§14) is sufficient, though B+Tree
           is still the more common real-world default (§45-46)
```

---
