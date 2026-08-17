## §44. Minimum Spanning Tree (MST)

### 1. Summary

A Minimum Spanning Tree connects all nodes of a weighted, undirected graph (§19) using the
minimum possible total edge weight, with no cycles (hence "tree" — exactly V-1 edges for V
nodes). Two standard algorithms build one: **Kruskal's** (greedy, §39 — sort all edges by weight,
add each one unless it would form a cycle, using Union-Find, §20, to check that in near-O(1)) and
**Prim's** (greedy — grow one connected tree outward, always adding the cheapest edge connecting
the tree to a new node, using a Priority Queue, §17). Don't confuse MST with Shortest Path (§43)
— MST minimizes *total* edge weight to connect *everything*; shortest path minimizes the path
weight between two *specific* nodes. These are different objectives that happen to both be
greedy, weighted-graph problems.

### 2. Why Does It Exist?

Infrastructure design questions — connect these locations with the least total cable/pipe/road —
are directly answered by MST: connect everything, at minimum total cost, with no redundant
(cycle-forming) connections.

### 3. Mental Model

Building a road network connecting several towns as cheaply as possible in total, with no
redundant roads (any cycle would mean you could remove one road in it and still have everyone
connected, strictly reducing total cost) — Kruskal's builds this by greedily grabbing the
cheapest available road that doesn't create a redundant loop; Prim's builds it by growing one
connected network outward, always extending via the cheapest available new connection.

### 4. Basic Implementation

```
# Kruskal's -- edge-centric, uses Union-Find (§20) for O(near-1) cycle detection
function kruskal_mst(vertices, edges):
    edges.sort(key=lambda e: e.weight)          # greedy: cheapest edges first
    uf = UnionFind(vertices)
    mst = []
    for edge in edges:
        if uf.find(edge.u) != uf.find(edge.v):   # adding this edge would NOT create a cycle
            uf.union(edge.u, edge.v)
            mst.append(edge)
            if len(mst) == len(vertices) - 1:
                break                             # MST complete
    return mst

# Prim's -- node-centric, uses a Priority Queue (§17) to always grab the cheapest frontier edge
function prim_mst(graph, start):
    visited = {start}
    pq = PriorityQueue(graph[start])              # (weight, from, to) tuples, min-heap
    mst = []
    while pq is not empty and len(visited) < len(graph):
        weight, u, v = pq.pop_min()
        if v in visited: continue
        visited.add(v)
        mst.append((u, v, weight))
        for next_weight, next_v in graph[v]:
            if next_v not in visited:
                pq.push((next_weight, v, next_v))
    return mst
```

### 5. Time & Space Complexity

| Algorithm | Time | Best Suited For |
|---|---|---|
| Kruskal's | O(E log E) — dominated by sorting edges | sparse graphs (few edges relative to
  nodes) |
| Prim's (heap-based) | O((V+E) log V) | dense graphs (many edges — Prim's avoids sorting ALL
  edges upfront) |

### 6. Visualization

```
Graph:   A --4-- B
         |  \    |
         1   3   2
         |    \  |
         C --5-- D

Kruskal's (sort edges: AC=1, BD=2, AD=3, AB=4, CD=5):
pick AC(1): no cycle -> mst=[AC]
pick BD(2): no cycle -> mst=[AC,BD]
pick AD(3): no cycle (A,C connected; B,D connected; joining them) -> mst=[AC,BD,AD]
pick AB(4): A and B already connected via AC-AD-BD -> WOULD cycle -> skip
mst complete with 3 edges (V-1=3 for 4 vertices), total weight = 1+2+3 = 6
```

### 7. Real-World Usage

Network design (laying cable/fiber to connect data centers or offices at minimum total cost),
utility grid planning (minimum-cost electrical/water infrastructure connecting all service
points), and circuit design (minimizing total wire length connecting circuit components) are
direct, real MST applications. Clustering algorithms in data analysis sometimes use MST-based
approaches (removing the most expensive edges from an MST creates natural clusters).

### 8. Common Interview Questions

"Connect all cities/servers/points with minimum total cost" is the direct MST framing — expect to
justify the choice between Kruskal's (simpler, good for sparse graphs, leans on Union-Find §20)
and Prim's (better for dense graphs, leans on a priority queue §17). "Minimum cost to connect all
points" (often phrased with Manhattan or Euclidean distances between grid points) is MST applied
to an implicitly-defined complete graph. Distinguishing "connect everything cheaply" (MST) from
"cheapest path between two specific points" (§43 Shortest Path) is itself a valuable, commonly
tested distinction.

### 9. Key Takeaways

- MST connects all nodes at minimum total edge weight with no cycles — a fundamentally different
  objective from shortest path (§43), which minimizes cost between two specific nodes.
- Kruskal's is edge-centric and Union-Find-driven (§20), favoring sparse graphs; Prim's is
  node-centric and priority-queue-driven (§17), favoring dense graphs.
- Both are greedy algorithms (§39) that happen to be provably correct for this specific problem
  — the same "prove the greedy choice is safe" discipline from §39 applies here too.
- Network/utility infrastructure design is the direct, genuine real-world motivation — not an
  abstract graph-theory exercise.

---
