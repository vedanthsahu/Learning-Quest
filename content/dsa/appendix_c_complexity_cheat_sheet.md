## Appendix C: Master Complexity Cheat Sheet

*Every structure and algorithm's Big-O, consolidated in one place. All times average-case unless
marked (W) for worst-case.*

### Data Structures

| Structure | Access | Search | Insert | Delete | Space | Chapter |
|---|---|---|---|---|---|---|
| Array | O(1) | O(n) | O(n) | O(n) | O(n) | §1 |
| Dynamic Array | O(1) | O(n) | O(1) am. | O(n) | O(n) | §1 |
| Linked List (singly) | O(n) | O(n) | O(1)* | O(1)* | O(n) | §3 |
| Linked List (doubly) | O(n) | O(n) | O(1)* | O(1)* | O(n) | §3 |
| Stack | O(n) | O(n) | O(1) | O(1) | O(n) | §4 |
| Queue | O(n) | O(n) | O(1) | O(1) | O(n) | §5 |
| Deque | O(n) | O(n) | O(1) | O(1) | O(n) | §6 |
| Hash Table | — | O(1) | O(1) | O(1) | O(n) | §7 |
| Bitmap | O(1)/bit | O(1)/bit | O(1) | O(1) | O(n) bits | §8 |
| Binary Search Tree | — | O(log n), O(n)(W) | O(log n), O(n)(W) | O(log n), O(n)(W) | O(n) | §11 |
| AVL Tree | — | O(log n) | O(log n) | O(log n) | O(n) | §12 |
| Red-Black Tree | — | O(log n) | O(log n) | O(log n) | O(n) | §13 |
| B-Tree | — | O(log_M n) | O(log_M n) | O(log_M n) | O(n) | §14 |
| B+ Tree | — | O(log_M n) | O(log_M n) | O(log_M n) | O(n) | §15 |
| Heap | O(1) min/max | O(n) | O(log n) | O(log n) | O(n) | §16 |
| Trie | — | O(k), k=key length | O(k) | O(k) | O(total chars) | §18 |
| Union-Find | — | O(α(n)) ≈ O(1) | O(α(n)) ≈ O(1) | — | O(n) | §20 |
| Skip List | — | O(log n) expected | O(log n) expected | O(log n) expected | O(n) | §21 |
| Bloom Filter | — | O(k), no false neg. | O(k) | not supported | O(m) bits | §22 |
| LRU Cache | O(1) | O(1) | O(1) | O(1) | O(capacity) | §23 |
| Consistent Hash Ring | — | O(log n) | O(log n) | O(log n) | O(n) | §24 |
| LSM Tree | — | O(k log n), k=SSTables | O(log n) amortized | O(log n) amortized | O(n) | §25 |
| Merkle Tree | — | O(log n) diff | O(n) build | — | O(n) | §26 |
| KD-Tree | — | O(log n) low-dim, O(n) high-dim | O(log n) | O(log n) | O(n) | §27 |
| HNSW | — | O(log n) typical (approx.) | O(log n) typical | rarely supported | O(n) | §27 |

*Linked list insert/delete is O(1) only once positioned at the relevant node; O(n) to first
locate that node by value.

### Algorithms

| Algorithm | Time | Space | Chapter |
|---|---|---|---|
| Linear Search | O(n) | O(1) | §28 |
| Binary Search | O(log n) | O(1) iterative, O(log n) recursive | §29 |
| Two Pointers (pair sum, sorted) | O(n) | O(1) | §30 |
| Sliding Window | O(n) | O(k) | §31 |
| Prefix Sum (build + query) | O(n) build, O(1) query | O(n) | §32 |
| Difference Array (update + reconstruct) | O(1) update, O(n) reconstruct | O(n) | §33 |
| Merge Sort | O(n log n) | O(n) | §34 |
| Quicksort | O(n log n) avg, O(n²)(W) | O(log n) | §34 |
| Heapsort | O(n log n) | O(1) | §34 |
| Counting Sort | O(n + k) | O(k) | §34 |
| Naive Recursive Fibonacci | O(2^n) | O(n) call stack | §35 |
| D&C (general, Master Theorem) | T(n)=aT(n/b)+O(n^d) | varies | §36 |
| Dynamic Programming (typical 1D) | O(n) | O(n), often reducible to O(1) | §37 |
| Dynamic Programming (typical 2D) | O(n·m) | O(n·m), often reducible to O(min(n,m)) | §37 |
| Backtracking (N-Queens, subsets) | Exponential (inherent) | O(depth) | §38 |
| Greedy (Activity Selection, Huffman) | O(n log n) | O(n) | §39 |
| DFS | O(V + E) | O(V) | §40 |
| BFS | O(V + E) | O(V) | §41 |
| Topological Sort | O(V + E) | O(V) | §42 |
| Dijkstra (heap-based) | O((V+E) log V) | O(V) | §43 |
| Bellman-Ford | O(V·E) | O(V) | §43 |
| Kruskal's MST | O(E log E) | O(V) | §44 |
| Prim's MST (heap-based) | O((V+E) log V) | O(V) | §44 |

---
