## Appendix D: Interview Question Bank

*Every chapter's interview questions, consolidated here by chapter for quick review. See §58 for
the reverse direction — problem phrasing mapped to likely structure/algorithm.*

### Part I — Linear Data Structures

**§1 Arrays**: subarray sum/max/product problems → prefix sum/sliding window/two pointers ·
rotate an array in place · find the missing number · two sum.
**§2 Strings**: anagram/palindrome/substring detection · concatenation-in-a-loop cost · longest
substring without repeats · naive vs. KMP/Rabin-Karp substring search cost.
**§3 Linked Lists**: fast/slow pointer cycle detection · find the middle node · reverse a linked
list iteratively · Nth-from-end node.
**§4 Stacks**: valid parentheses/nested tag matching · evaluate postfix/infix expressions ·
monotonic stack for next-greater-element and daily-temperatures-style problems.
**§5 Queues**: BFS-based level-order and shortest-unweighted-path problems · circular buffer
design · implement a queue using two stacks.
**§6 Deque**: sliding window maximum/minimum via monotonic deque · design a browser history ·
bounded undo/redo with `deque(maxlen=N)`.
**§7 Hash Tables**: duplicates/frequency counting · two sum · design a cache (paired with
eviction-order structure) · why worst case is O(n) (collision chains, hash flooding).
**§8 Bitmaps & Bitsets**: XOR-based missing-number/single-non-duplicate tricks · track which of
N flags are enabled · popcount · bitmask DP.

### Part II — Non-Linear Data Structures

**§9 Trees**: implement preorder/inorder/postorder/level-order traversal · height/diameter/
balance checks via bottom-up recursion.
**§10 Binary Trees**: maximum depth, diameter, invert a binary tree · serialize/deserialize ·
choosing the right traversal order.
**§11 BST**: validate a BST (full range-check, not just parent-child) · k-th smallest via
inorder · lowest common ancestor in O(log n).
**§12 Balanced/AVL**: implement AVL insertion with rotations · check height-balance · why
Red-Black is preferred over AVL in production.
**§13 Red-Black**: know the five invariants exist and why · why chosen over AVL for writes ·
recognize as the structure behind TreeMap/std::map/Linux CFS.
**§14 B-Trees**: why databases use B-Trees/B+Trees over balanced binary trees (disk I/O, not
Big-O) · what happens on node overflow (split-and-promote).
**§15 B+Trees**: why B+Tree specifically over plain B-Tree (leaf-linking for range scans) · how a
database answers a range query efficiently.
**§16 Heaps**: K largest/smallest, K most frequent · merge K sorted lists · design a priority
queue · building a heap is O(n), not O(n log n).
**§17 Priority Queues**: "most urgent next from a changing set" framing · design a task
scheduler with priorities · distinguishing the ADT from its heap implementation.
**§18 Trie**: implement autocomplete/spell-checker · longest common prefix · word search against
a dictionary (build a trie of the dictionary first).
**§19 Graphs**: choosing adjacency list vs. matrix · representing a social/road/dependency
network.
**§20 Union-Find**: number of connected components · detect a cycle in an undirected graph ·
accounts-merge-style problems.
**§21 Skip Lists**: design an O(log n) insert/search/delete structure without tree rotations ·
know Redis Sorted Sets as the concrete precedent.
**§22 Bloom Filters**: check-if-seen-before at massive scale without storing every item · why no
false negatives but possible false positives · no deletion support.
**§23 LRU Cache**: design an O(1) get/put LRU cache · thread-safety and LFU-variant follow-ups.
**§24 Consistent Hashing**: design a distributed cache/shard data across changing servers · why
plain modulo hashing fails on resize · role of virtual nodes.
**§25 LSM Trees**: why choose Cassandra/RocksDB over a relational DB for write-heavy workloads ·
write/read/space amplification · why compaction is needed.
**§26 Merkle Trees**: how Git detects diverged history efficiently · how two replicas find
what's out of sync without transferring everything.
**§27 Vector Indexes**: find similar documents/images at scale · why KD-Trees fail in high
dimensions (curse of dimensionality) · accuracy/speed tradeoff of ANN search.

### Part III — Core Algorithms

**§28 Searching Fundamentals**: explicit triage (sorted? repeated queries? exact match?) before
picking an approach.
**§29 Binary Search**: boundary-condition correctness (`<=` vs `<`) · binary search on the answer
· search in a rotated sorted array.
**§30 Two Pointers**: Two Sum II, 3Sum, Container With Most Water · remove duplicates/partition
in place.
**§31 Sliding Window**: longest substring/subarray under a condition · sliding window
maximum/minimum via monotonic deque.
**§32 Prefix Sum**: number of subarrays summing to K (with a hash table) · static-array
range-sum queries.
**§33 Difference Arrays**: max value under many overlapping range updates · car
pooling/meeting-room-style overlap counting.
**§34 Sorting**: implement merge sort/quicksort · when counting/radix sort's O(n) applies ·
quicksort's O(n²) worst case and mitigation · stability's importance for secondary sorts.
**§35 Recursion**: convert recursive to iterative with an explicit stack · identifying base case
and termination.
**§36 Divide & Conquer**: maximum subarray sum (D&C version) · closest pair of points · counting
inversions.
**§37 Dynamic Programming**: climbing stairs, house robber, coin change, longest increasing
subsequence, 0/1 knapsack · space-optimization of 2D tables.
**§38 Backtracking**: generate all subsets/permutations/combinations · N-Queens · Sudoku solver ·
word search in a grid.
**§39 Greedy**: activity/interval scheduling · minimum meeting rooms · prove-or-disprove greedy
correctness (0/1 Knapsack counterexample).
**§40 DFS**: path existence/enumeration · cycle detection (directed vs. undirected differ) ·
number of islands.
**§41 BFS**: shortest path/minimum steps in unweighted graphs · word ladder, minimum knight moves
· multi-source BFS.
**§42 Topological Sort**: course schedule (and detect impossibility) · build system dependency
resolution · alien dictionary.
**§43 Shortest Path**: shortest path with weighted non-negative edges (Dijkstra) · cheapest
flights within K stops · detect a negative cycle (Bellman-Ford, arbitrage).
**§44 MST**: connect all cities/servers at minimum cost · Kruskal's vs. Prim's justification ·
minimum cost to connect all points.

### Part IV — Real-World Engineering

Each Part IV chapter's own "Interview Questions This Connects To" section (§45-55) frames a
systems-design-style question directly tied to that system's architecture — read the specific
chapter for the full scenario, since these are framed as "how would you design/explain X," not
discrete Q&A pairs.

---
