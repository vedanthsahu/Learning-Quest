## Appendix A: Glossary

**Amortized Complexity** — The average cost per operation across a sequence of operations, even
when individual operations occasionally cost much more (e.g. dynamic array resizing, §1).

**ANN (Approximate Nearest Neighbor)** — Nearest-neighbor search that trades exactness for speed
at scale, e.g. HNSW (§27).

**Backtracking** — Recursive exploration of a decision tree that abandons a branch the instant
it's known invalid (§38).

**Balance Factor** — In an AVL tree, the height of a node's left subtree minus its right
subtree's height; must stay within ±1 (§12).

**Bloom Filter** — A probabilistic set-membership structure with no false negatives but a
tunable rate of false positives (§22).

**Clustered Index** — An index whose leaf nodes store the actual row data, not a pointer to it
(InnoDB's primary key design, §46).

**Compaction** — The background process merging multiple LSM Tree SSTables into fewer, larger
ones (§25).

**Consistent Hashing** — A technique bounding key remapping to roughly 1/N of keys when a node
is added/removed from a distributed system (§24).

**Curse of Dimensionality** — The collapse of a KD-Tree's (or similar) pruning effectiveness as
the number of dimensions grows large (§27).

**DAG (Directed Acyclic Graph)** — A directed graph with no cycles; the precondition for
Topological Sort (§42).

**Divide & Conquer (D&C)** — Solving a problem by splitting it into independent subproblems,
solving each, and combining results (§36).

**Dynamic Programming (DP)** — D&C applied to problems with overlapping subproblems, caching
each distinct subproblem's answer once (§37).

**Fan-Out / Postings List** — In an inverted index, the list of document IDs containing a given
term (§53).

**Greedy-Choice Property** — The property that a locally optimal choice is always part of some
globally optimal solution, making a greedy algorithm provably correct (§39).

**Hash Flooding** — A denial-of-service technique exploiting worst-case hash table collisions to
degrade O(1) operations to O(n) (§7).

**HNSW (Hierarchical Navigable Small World)** — A layered graph structure for approximate
nearest-neighbor search, scaling well to high-dimensional embeddings (§27).

**Inverted Index** — A mapping from term to the documents containing it, the reverse of the
natural document-to-words direction (§53).

**Load Factor** — The ratio of entries to capacity in a hash table, used to trigger resizing
(§7).

**LSM Tree (Log-Structured Merge Tree)** — A write-optimized storage structure using an
in-memory buffer plus append-only on-disk files, merged periodically (§25).

**Memtable** — The in-memory write buffer of an LSM Tree, flushed to disk once full (§25).

**Merkle Tree** — A tree where every node's hash is derived from its children's hashes, enabling
O(log n) difference detection between datasets (§26).

**MVCC (Multi-Version Concurrency Control)** — A database technique keeping multiple row
versions alive so readers never block writers (§45).

**Monotonic Stack/Deque** — A stack or deque kept in strictly increasing or decreasing order,
used for next-greater-element and sliding-window-maximum problems (§4, §6, §31).

**Optimal Substructure** — A property where an optimal solution to a problem contains optimal
solutions to its subproblems — required by both DP (§37) and greedy (§39).

**Path Compression** — A Union-Find optimization that flattens the tree during `find`, speeding
up future queries (§20).

**Rotation** — A local, O(1) tree restructuring that preserves BST ordering while changing
balance, used by AVL (§12) and Red-Black Trees (§13).

**SSTable (Sorted String Table)** — An immutable, sorted, on-disk file produced by flushing an
LSM Tree's memtable (§25).

**Topological Order** — An ordering of a DAG's nodes such that every edge points from earlier to
later in the order (§42).

**Union by Rank** — A Union-Find optimization attaching the shorter tree under the taller one
during `union` (§20).

**Virtual Runtime (vruntime)** — The Linux CFS scheduler's measure of accumulated CPU time,
used as the Red-Black Tree's sort key (§49).

**Write Amplification** — The ratio of actual bytes written to disk versus logical bytes written
by the application, a key LSM Tree tuning metric (§25).

---
