## §19. Graphs

### 1. Summary

A graph is a set of nodes (vertices) connected by edges, which may be directed or undirected,
weighted or unweighted, and may contain cycles (unlike every tree in this book, which is a graph
with no cycles and exactly one path between any two nodes). This chapter covers representation
only — how a graph is stored — since the algorithms that operate on it (DFS §40, BFS §41,
Topological Sort §42, Shortest Path §43, MST §44) each get their own chapter. Don't confuse a
graph with a tree: every tree is a graph, but most graphs are not trees, because they allow
cycles and multiple paths between the same two nodes.

### 2. Why Does It Exist?

Trees model strict one-parent hierarchies; graphs model everything else — social networks
(mutual, cyclic connections), road networks (multiple routes between two cities), dependency
graphs (a task can depend on several others, and be depended on by several), and web page links.
Whenever "connections" don't form a strict hierarchy, a graph is the honest representation.

### 3. Mental Model

A map of cities connected by roads: some roads are one-way (directed edge), some have a distance
or cost (weighted edge), and you can absolutely loop back to a city you've already visited
(cycle) — none of which a tree can represent.

### 4. Basic Implementation — the two standard representations

```
# Adjacency List -- the default choice for most sparse real-world graphs
graph = {
    "A": ["B", "C"],
    "B": ["D"],
    "C": ["D"],
    "D": []
}
# Space: O(V + E). Checking "is there an edge A->B": O(degree of A), not O(1).

# Adjacency Matrix -- better for dense graphs or when O(1) edge-existence check matters
#        A  B  C  D
matrix = [
    [0, 1, 1, 0],   # A
    [0, 0, 0, 1],   # B
    [0, 0, 0, 1],   # C
    [0, 0, 0, 0],   # D
]
# Space: O(V^2) regardless of actual edge count -- wasteful for sparse graphs.
# Checking "is there an edge A->B": O(1) -- matrix[A][B]
```

### 5. Time & Space Complexity

| Representation | Space | Check Edge Exists | Iterate All Neighbors of a Node |
|---|---|---|---|
| Adjacency List | O(V + E) | O(degree) | O(degree) |
| Adjacency Matrix | O(V²) | O(1) | O(V) |

V = number of vertices, E = number of edges. Real-world graphs (social networks, road networks,
dependency graphs) are almost always *sparse* (E much closer to V than to V²), which is why
adjacency lists dominate in practice.

### 6. Visualization

```
Directed, weighted graph:

    A --5--> B
    |        |
    3        2
    v        v
    C --1--> D

Adjacency list with weights:
  A: [(B,5), (C,3)]
  B: [(D,2)]
  C: [(D,1)]
  D: []
```

### 7. Real-World Usage

Social networks (users as nodes, follows/friendships as edges), road/flight networks (cities as
nodes, routes as weighted edges), build-dependency graphs (packages as nodes, "depends on" as
directed edges — see Topological Sort, §42), and the web itself (pages as nodes, hyperlinks as
directed edges, which is literally what PageRank operates over) are all graphs in the
representation sense covered here. Every algorithm in the rest of Part III's graph section
(§40-44) operates on one of the two representations shown above.

### 8. Common Interview Questions

The very first decision in any graph problem is representation — adjacency list unless the
problem specifically needs O(1) edge lookups or the graph is dense. "How would you represent a
social network / road network / dependency graph" is itself a common opening question, testing
whether you default to adjacency list and can justify it via sparsity. Confusing directed with
undirected, or forgetting a graph can have cycles (unlike a tree), is a common source of bugs in
follow-up algorithm questions (§40-44).

### 9. Key Takeaways

- A graph generalizes a tree by allowing cycles and multiple paths — every tree is a graph, not
  the reverse.
- Adjacency list (O(V+E) space) is the default representation for the sparse graphs most
  real-world problems involve; adjacency matrix (O(V²)) trades space for O(1) edge-existence
  checks, useful mainly for dense graphs.
- This chapter is deliberately representation-only — DFS (§40), BFS (§41), Topological Sort
  (§42), Shortest Path (§43), and MST (§44) each build their own algorithm on top of one of these
  two representations.
- Real dependency graphs, social networks, and road networks are the direct real-world
  motivation, not an abstract exercise.

---
