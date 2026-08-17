## §20. Union-Find (Disjoint Set)

### 1. Summary

Union-Find (a.k.a. Disjoint Set Union, DSU) maintains a collection of disjoint (non-overlapping)
sets, supporting two operations near-O(1) each: `find(x)` (which set does x belong to) and
`union(x, y)` (merge x's set and y's set). Don't confuse this with a graph traversal (§40 DFS,
§41 BFS) for connectivity — Union-Find answers "are these two nodes connected" incrementally, as
edges are added one at a time, without re-traversing the whole structure each time; DFS/BFS
answer it for a fixed, already-complete graph.

### 2. Why Does It Exist?

"Are these two things in the same group" comes up constantly with data that arrives
incrementally — network connections forming over time, accounts being merged, pixels being
grouped into regions. Recomputing full connectivity via DFS/BFS after every single new
connection would be wasteful; Union-Find is built specifically for the incremental case.

### 3. Mental Model

Think of each set as a tree, where every element points toward a "representative" root, and two
elements are in the same set exactly when they point to the same root. `union` doesn't merge
element-by-element — it just re-points one entire tree's root to point at the other tree's root.

### 4. Basic Implementation (with the two standard optimizations)

```
struct UnionFind:
    parent = [i for i in range(n)]       # each element starts as its own root
    rank = [0] * n                        # tracks tree height, for union by rank

function find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])       # path compression: flatten the tree as we go
    return parent[x]

function union(x, y):
    root_x, root_y = find(x), find(y)
    if root_x == root_y:
        return                             # already in the same set
    if rank[root_x] < rank[root_y]:         # union by rank: attach smaller tree under bigger
        root_x, root_y = root_y, root_x
    parent[root_y] = root_x
    if rank[root_x] == rank[root_y]:
        rank[root_x] += 1
```

### 5. Time & Space Complexity

| Operation | With Path Compression + Union by Rank | Naive (neither optimization) |
|---|---|---|
| find | O(α(n)) ≈ O(1) in practice | O(n) worst case (degenerate chain) |
| union | O(α(n)) ≈ O(1) in practice | O(n) worst case |
| Space | O(n) | O(n) |

α(n) is the inverse Ackermann function — grows so slowly it's effectively a small constant
(≤4) for any input size that could ever occur in practice; the honest engineering takeaway is
"treat both operations as O(1)."

### 6. Visualization

```
union(1,2), union(3,4), union(2,3):

after union(1,2):    1     3   4      (2 points to 1)
                      \
                       2

after union(3,4):    1     3          (4 points to 3)
                      \    |
                       2   4

after union(2,3):    1                (find(2)=1, find(4)=3;
                    / | \              union by rank attaches
                   2  3               root 3 under root 1)
                      |
                      4

find(4) now: 4->3->1, path compression flattens this to 4->1 directly for next time
```

### 7. Real-World Usage

Kruskal's Minimum Spanning Tree algorithm (§44) uses Union-Find directly to detect whether adding
an edge would form a cycle — union-find IS the cycle-detection mechanism there. Network
connectivity monitoring (are these two servers reachable from each other, given links coming up
incrementally), image processing (connected-component labeling — grouping adjacent same-colored
pixels into regions), and account-merging/deduplication systems ("these two user records refer
to the same person") are all natural Union-Find applications.

### 8. Common Interview Questions

"Number of connected components in a graph" and "detect a cycle in an undirected graph" are the
two most common Union-Find questions — both fall out directly from repeatedly calling `union` on
every edge and checking whether `find` already agreed beforehand. "Accounts merge" (LeetCode-style
problems about merging user records sharing an email) is a Union-Find application in disguise
under a business-logic framing. Knowing to reach for Union-Find instead of a fresh DFS/BFS every
time connectivity needs re-checking after each new edge is the key recognition skill.

### 9. Key Takeaways

- Union-Find answers "same group?" and "merge these two groups" in near-O(1) amortized time via
  path compression and union by rank — effectively O(1) for any realistic input size.
- It's built specifically for incremental connectivity — repeatedly adding connections and
  re-checking — where re-running DFS/BFS from scratch every time would be wasteful.
- Kruskal's MST algorithm (§44) uses it directly for cycle detection — a genuine, load-bearing
  dependency, not just a coincidence of both appearing in graph-adjacent chapters.
- "Connected components" and "cycle detection in an undirected graph as edges are added" are the
  two dominant interview signatures.

---
