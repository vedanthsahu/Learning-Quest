## §41. Breadth-First Search (BFS)

### 1. Summary

BFS explores a graph (§19) level by level, using a Queue (§5) to always process nodes in the
order they were first discovered, guaranteeing that when a node is first reached, it's been
reached via the shortest possible path (measured in number of edges) — but only for **unweighted**
graphs. Don't confuse this with Dijkstra's algorithm (§43), which handles weighted graphs — BFS's
shortest-path guarantee relies entirely on every edge "costing" the same one step, which is why it
breaks the moment edges have different weights.

### 2. Why Does It Exist?

"Shortest path" and "minimum number of steps/moves" questions in an unweighted graph need
exactly the guarantee BFS provides for free, as a direct consequence of its level-by-level
exploration order — the first time a node is reached is provably via the fewest possible edges,
no extra bookkeeping required.

### 3. Mental Model

Ripples spreading outward from a stone dropped in water: everything at distance 1 is reached
before anything at distance 2, which is reached before distance 3, and so on — the queue's FIFO
order enforces this expanding-ring pattern directly, which is precisely why the first arrival at
any node is via the shortest path.

### 4. Basic Implementation

```
function bfs(graph, start):
    visited = {start}
    queue = Queue([start])                # see §5 -- FIFO is the entire mechanism here
    distance = {start: 0}
    while queue is not empty:
        node = queue.dequeue()
        visit(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                distance[neighbor] = distance[node] + 1
                queue.enqueue(neighbor)
    return distance                        # shortest #edges from start to every reached node
```

### 5. Time & Space Complexity

| Aspect | Complexity |
|---|---|
| Time | O(V + E) |
| Space | O(V) — the queue and visited set, worst case holding an entire level's worth of nodes |

### 6. Visualization

```
Graph:      A
          /   \
         B     C
         |     |
         D     E

BFS from A:
queue: [A] -> dequeue A, enqueue B,C -> queue: [B,C]
     -> dequeue B, enqueue D          -> queue: [C,D]
     -> dequeue C, enqueue E          -> queue: [D,E]
     -> dequeue D (no new neighbors)  -> queue: [E]
     -> dequeue E (no new neighbors)  -> queue: []

Order visited: A, B, C, D, E  -- level by level (A first, then B&C, then D&E)
distances: A=0, B=1, C=1, D=2, E=2
```

### 7. Real-World Usage

Social network "degrees of connection" (mutual-friend distance) is a direct BFS application over
the friendship graph. Web crawlers doing a breadth-first crawl (visiting pages in link-distance
order from a seed page) use BFS directly. GPS/routing systems use BFS specifically for
unweighted-hop-count questions (fewest number of connections/transfers), reserving Dijkstra (§43)
for actual distance/time-weighted routing.

### 8. Common Interview Questions

"Shortest path in an unweighted graph" or "minimum number of moves/steps" (word ladder, minimum
knight moves on a chessboard) is the direct BFS signal — if the problem says "shortest" or
"minimum steps" and every move/edge is equally weighted, reach for BFS immediately rather than
Dijkstra. "Level-order traversal of a tree" (§9-10) is literally BFS applied to a tree, which is
just a graph with no cycles. Multi-source BFS (starting the queue with several nodes at once,
e.g. "distance to the nearest of several targets") is a common, valuable variant to recognize.

### 9. Key Takeaways

- BFS uses a queue (FIFO, §5) and guarantees shortest-path-by-edge-count in unweighted graphs —
  the moment edges have different weights, this guarantee breaks and Dijkstra (§43) is needed
  instead.
- The level-by-level exploration order is the direct mechanical reason the shortest-path
  guarantee holds — not a separate proof bolted on afterward.
- "Shortest/minimum steps in an unweighted context" is the phrase that should trigger BFS
  immediately; "shortest path with weighted edges" should trigger Dijkstra instead.
- Multi-source BFS (seeding the queue with multiple start nodes) is a valuable, easy variant once
  the base algorithm is understood.

---
