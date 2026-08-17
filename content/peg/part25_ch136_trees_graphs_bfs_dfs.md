## §136. Trees and Graph Traversal: BFS and DFS

### 1. The Vocabulary

- **Tree** — a connected graph with no cycles and exactly one path between any two nodes; a
  binary tree restricts each node to at most two children.
- **Graph** — nodes (vertices) connected by edges, which may be directed or undirected, weighted
  or unweighted, and may contain cycles.
- **BFS (breadth-first search)** — explores level by level using a queue; the standard approach
  for "shortest path in an unweighted graph" because it guarantees the first time you reach a node
  is via the shortest path.
- **DFS (depth-first search)** — explores as far as possible down one path before backtracking,
  usually implemented with a stack or recursion; used for exploring all paths, detecting cycles,
  and topological sorting.

### 2. Where It Sits, and Why Teams Use It

Trees and graphs model an enormous share of real systems — an org chart, a file system, a
dependency graph, a social network, a road network — so traversal is one of the most transferable
skills in this whole book. The single most important fact to internalize is that BFS and DFS
answer different questions: BFS for shortest-path-in-unweighted-graph and "closest" queries, DFS
for exhaustive exploration, cycle detection, and problems structured as "try this, and if it
doesn't work, backtrack" (§137).

### 3. What Actually Breaks

- **Using DFS for a shortest-path problem** — DFS can find *a* path, but it has no guarantee of
  finding the *shortest* one in an unweighted graph; BFS's level-by-level guarantee is specifically
  what shortest-path problems need.
- **Forgetting to track visited nodes** — in a graph with cycles, a traversal without a visited set
  can loop forever; trees don't have this problem, which is exactly why the same traversal code
  can behave differently once applied to a general graph instead of a tree.
- **Recursive DFS on very deep or very large graphs** — recursion depth is bounded (Python's
  default recursion limit is a real constraint), so an iterative DFS with an explicit stack is
  sometimes necessary specifically to avoid a stack overflow on deep input.
- **Confusing tree traversal orders (pre/in/post-order)** — using the wrong traversal order for a
  binary search tree operation (e.g., expecting sorted output from anything other than in-order
  traversal) produces a confidently wrong answer.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use BFS specifically when I need the shortest path in an unweighted graph, because its
  level-by-level exploration guarantees that."
- "I use DFS for exhaustive exploration, cycle detection, and backtracking-style problems."
- "I always track visited nodes explicitly once I'm working with a general graph rather than a
  tree, since graphs can have cycles trees don't."

### 5. Interview-Ready Answer

> "My first question for a traversal problem is whether it needs the shortest path in an
> unweighted structure — if so, that's BFS, because it explores level by level and guarantees the
> first time you reach a node is via the shortest route. If the problem is about exploring all
> possibilities, detecting a cycle, or trying-and-backtracking, that's DFS. And the moment I'm
> working with a general graph instead of a tree, I explicitly track visited nodes, since cycles
> can otherwise send a traversal into an infinite loop."

### 6. Go Deeper

companion DSA Engineering Handbook's §9 (Trees (General Concepts)), companion DSA Engineering
Handbook's §19 (Graphs), companion DSA Engineering Handbook's §40 (Depth-First Search (DFS)), and
companion DSA Engineering Handbook's §41 (Breadth-First Search (BFS)) chapters, plus companion DSA
Engineering Handbook's §50 (Kubernetes: Heaps, Work Queues & the Scheduler) and companion DSA
Engineering Handbook's §51 (Git: Merkle Trees & Content-Addressable Storage) "System Narrative"
chapters, which are real graph-traversal use cases, for full implementation depth; this book's
§137 (recursion/backtracking/DP) for how DFS extends into backtracking.

---
