## §58. Interview Pattern Recognition Guide

*The clearest possible expression of this book's philosophy: "if you see this kind of problem,
this data structure or algorithm is probably involved." Organized by problem phrasing, not by
structure — the reverse direction from §56.*

| If the problem says... | Think... | Chapter |
|---|---|---|
| "Two Sum" / pair summing to a target (unsorted) | Hash Table (store complements seen) | §7 |
| "Two Sum" / pair summing to a target (sorted array) | Two Pointers | §30 |
| "Longest substring/subarray without/with at most K..." | Sliding Window | §31 |
| "Next greater/smaller element", "daily temperatures" | Monotonic Stack | §4, §31 |
| "Sliding window maximum/minimum" | Monotonic Deque | §6, §31 |
| "Valid parentheses", nested tag matching | Stack | §4 |
| "Design a cache with eviction" | Hash Table + Doubly Linked List (LRU) | §23 |
| "Design a leaderboard" / "rank queries" | Hash Table + Skip List (or Heap) | §21, §16-17 |
| "Top K frequent/largest/closest" | Heap | §16 |
| "Merge K sorted lists/arrays" | Heap | §16 |
| "Design a task scheduler with priorities" | Priority Queue | §17 |
| "Shortest path, unweighted / minimum number of steps" | BFS | §41 |
| "Shortest path, weighted, all non-negative" | Dijkstra | §43 |
| "Shortest path, negative weights possible" / "arbitrage" | Bellman-Ford | §43 |
| "Connect all nodes at minimum cost" | Minimum Spanning Tree | §44 |
| "Course schedule" / "build order" / dependency ordering | Topological Sort | §42 |
| "Number of connected components" / "friend circles" | Union-Find or DFS/BFS | §20, §40-41 |
| "Detect a cycle" (undirected) | Union-Find or DFS with parent-tracking | §20, §40 |
| "Detect a cycle" (directed) | DFS with recursion-stack tracking | §40 |
| "Validate a BST" | Recursive range-checking | §11 |
| "K-th smallest/largest in a BST" | Inorder traversal | §11 |
| "Serialize/deserialize a tree" | Preorder + null markers | §10 |
| "Word search in a grid against a dictionary" | Trie + DFS/backtracking | §18, §38, §40 |
| "Autocomplete" / "prefix matching" | Trie | §18 |
| "Generate all subsets/permutations/combinations" | Backtracking | §38 |
| "N-Queens" / "Sudoku solver" | Backtracking | §38 |
| "Climbing stairs" / "house robber" / "coin change" | Dynamic Programming | §37 |
| "Longest common subsequence" / "edit distance" | Dynamic Programming (2D table) | §37 |
| "0/1 Knapsack" | Dynamic Programming (NOT greedy) | §37, §39 |
| "Fractional Knapsack" / "activity selection" | Greedy | §39 |
| "Maximum subarray sum" | DP (Kadane's) or D&C | §36-37 |
| "Number of subarrays summing to K" | Prefix Sum + Hash Table | §32, §7 |
| "Range sum query, many queries, static array" | Prefix Sum | §32 |
| "Range update, many updates, one final read" | Difference Array | §33 |
| "Meeting rooms" / "overlapping intervals count" | Difference Array or Sorting | §33-34 |
| "Design rate limiter" | Sliding Window Counter or Token Bucket | §31, §54 |
| "Design a URL shortener / seen-before check at scale" | Hash Table or Bloom Filter | §7, §22 |
| "Find similar documents/images/products" | Vector Index (HNSW/ANN) | §27, §55 |
| "Design a distributed cache / shard data across servers" | Consistent Hashing | §24 |
| "Why is this write-heavy database fast" | LSM Tree | §25 |
| "How do two large datasets efficiently diff/verify sync" | Merkle Tree | §26 |
| "Fast/slow pointer", "cycle in a linked list" | Two-Pointer (tortoise and hare) | §3, §30 |
| "Anagram" / "frequency counting" | Hash Table | §7 |
| "Track which of N flags are set" | Bitmap / Bitmask | §8 |
| "Missing number" / "single non-duplicate" | XOR trick | §8 |

---
