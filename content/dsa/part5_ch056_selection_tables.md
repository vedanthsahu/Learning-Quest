## §56. Data Structure Selection Tables

*A quick "need X → use Y" lookup, cross-referencing every structure and algorithm taught in
Parts I-IV. Use this before defaulting to whatever structure is most familiar.*

### Need O(1) access by position?
| Need | Use | Chapter |
|---|---|---|
| Fixed-size, index-addressed data | Array | §1 |
| Growable, index-addressed data | Dynamic Array (Python `list`) | §1 |
| O(1) insert/delete at both ends | Deque | §6 |
| O(1) insert/delete at a known node | Linked List (doubly, for O(1) removal) | §3 |

### Need fast lookup by key?
| Need | Use | Chapter |
|---|---|---|
| Exact match only, no ordering needed | Hash Table | §7 |
| Exact match, need sorted iteration too | Balanced BST / Red-Black Tree | §11, §13 |
| Prefix matching ("starts with") | Trie | §18 |
| Approximate/probabilistic "have I seen this" at huge scale | Bloom Filter | §22 |
| Disk-backed, range-query-friendly | B+Tree | §15 |
| Vector/embedding similarity | HNSW / Vector Index | §27 |

### Need ordering or priority?
| Need | Use | Chapter |
|---|---|---|
| Always get the min/max next | Heap / Priority Queue | §16-17 |
| Full sorted order, dynamic inserts | Balanced BST / Red-Black Tree | §11-13 |
| FIFO processing order | Queue | §5 |
| LIFO / undo / nesting | Stack | §4 |
| Both ends need O(1) push/pop | Deque | §6 |

### Need to track relationships or groups?
| Need | Use | Chapter |
|---|---|---|
| Arbitrary connections, possibly cyclic | Graph | §19 |
| "Same group?" queries, incremental merging | Union-Find | §20 |
| Hierarchical, one-parent structure | Tree | §9 |

### Need caching or eviction?
| Need | Use | Chapter |
|---|---|---|
| Fixed-capacity cache, evict oldest-unused | LRU Cache (Hash Table + Doubly Linked List) | §23 |
| Distribute cache keys across changing servers | Consistent Hashing | §24 |

### Need range queries over an array?
| Need | Use | Chapter |
|---|---|---|
| Many range-SUM queries, static array | Prefix Sum | §32 |
| Many range-UPDATE operations, one final read | Difference Array | §33 |
| Best contiguous window satisfying a condition | Sliding Window | §31 |
| Pair/triple search in sorted data | Two Pointers | §30 |

### Need an algorithmic approach for an optimization problem?
| Need | Use | Chapter |
|---|---|---|
| Overlapping subproblems, need optimal value | Dynamic Programming | §37 |
| Independent subproblems | Divide & Conquer | §36 |
| Provably-safe local-choice optimum exists | Greedy | §39 |
| Need ALL valid solutions / constraint satisfaction | Backtracking | §38 |
| Shortest path, unweighted | BFS | §41 |
| Shortest path, weighted, non-negative | Dijkstra | §43 |
| Shortest path, weighted, negative edges possible | Bellman-Ford | §43 |
| Connect everything at minimum total cost | Minimum Spanning Tree | §44 |
| Valid order given dependency constraints | Topological Sort | §42 |

### Need write-heavy or high-throughput storage?
| Need | Use | Chapter |
|---|---|---|
| Write-optimized storage engine | LSM Tree | §25 |
| Verify/diff large datasets efficiently | Merkle Tree | §26 |
| Sorted structure without tree-rotation complexity | Skip List | §21 |

---
