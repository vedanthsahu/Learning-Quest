## §43. Shortest Path (Dijkstra & Bellman-Ford)

### 1. Summary

Shortest-path algorithms find the minimum-total-weight path between nodes in a weighted graph
(§19). **Dijkstra's algorithm** is a greedy (§39) approach — always expand the currently-closest
unvisited node next, using a Priority Queue (§17/§16) — giving O((V+E) log V), but only correct
when all edge weights are non-negative. **Bellman-Ford** handles negative edge weights (and
detects negative cycles, where a path could loop forever getting "cheaper") at a higher cost,
O(V·E). Don't confuse either with BFS (§41) — BFS finds shortest path by *edge count* in
unweighted graphs; these two algorithms find shortest path by *total weight* in weighted graphs,
a fundamentally different objective.

### 2. Why Does It Exist?

Real-world "shortest path" almost always means minimum cost/time/distance, not minimum number of
hops — road networks have varying distances, network routing has varying latencies. These
algorithms generalize BFS's unweighted guarantee to the weighted case, at the cost of needing a
priority queue (Dijkstra) or accepting a higher time complexity (Bellman-Ford, for negative
weights).

### 3. Mental Model — Dijkstra

Always visit the closest not-yet-finalized city next, and once a city is visited, its shortest
distance is locked in permanently (this greedy commitment is exactly why negative weights break
it — a later, unvisited edge could theoretically make an already-"finalized" path cheaper, which
Dijkstra's greedy commitment structurally can't revisit).

### 3b. Mental Model — Bellman-Ford

Instead of committing greedily, relax *every* edge in the graph, repeatedly, V-1 times total —
each full pass potentially improves some distances, and after V-1 passes, all shortest paths (in
a graph with no negative cycles) are guaranteed correct, because the longest possible shortest
path has at most V-1 edges.

### 4. Basic Implementation

```
function dijkstra(graph, start):
    distances = {node: infinity for node in graph}
    distances[start] = 0
    pq = PriorityQueue([(0, start)])              # see §17 -- min-heap by distance
    visited = set()
    while pq is not empty:
        dist, node = pq.pop_min()
        if node in visited: continue
        visited.add(node)
        for neighbor, weight in graph[node]:
            new_dist = dist + weight
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                pq.push((new_dist, neighbor))
    return distances

function bellman_ford(graph, start, num_vertices):
    distances = {node: infinity for node in graph}
    distances[start] = 0
    for _ in range(num_vertices - 1):               # relax every edge, V-1 times
        for (u, v, weight) in all_edges(graph):
            if distances[u] + weight < distances[v]:
                distances[v] = distances[u] + weight
    for (u, v, weight) in all_edges(graph):           # one more pass detects negative cycles
        if distances[u] + weight < distances[v]:
            raise "Negative cycle detected"
    return distances
```

### 5. Time & Space Complexity

| Algorithm | Time | Handles Negative Weights? | Detects Negative Cycles? |
|---|---|---|---|
| Dijkstra (heap-based) | O((V+E) log V) | No | No — produces wrong answer silently |
| Bellman-Ford | O(V·E) | Yes | Yes |
| BFS (§41, for comparison) | O(V+E) | N/A — unweighted only | N/A |

### 6. Visualization

```
Weighted graph:      A --4--> B
                      |        |
                      1        2
                      v        v
                      C --1--> D

Dijkstra from A:
distances: A=0, all else=infinity. pq=[(0,A)]
pop A(0): relax B(4), C(1) -> distances: B=4, C=1. pq=[(1,C),(4,B)]
pop C(1): relax D(1+1=2) -> distances: D=2 (better than via B: 4+2=6). pq=[(2,D),(4,B)]
pop D(2): no better relaxations
pop B(4): relax D(4+2=6) -- not better than existing 2, no update

final: A=0, B=4, C=1, D=2
```

### 7. Real-World Usage

**GPS navigation and network routing protocols** (like OSPF, a link-state routing protocol) use
Dijkstra's algorithm directly to compute shortest/lowest-cost routes given non-negative
link weights. **Financial arbitrage detection** (finding a cycle of currency conversions that
nets a profit) uses Bellman-Ford specifically because it can detect negative cycles — a negative
cycle in a currency-conversion graph (where edge weights are log-transformed exchange rates)
corresponds exactly to a profitable arbitrage opportunity.

### 8. Common Interview Questions

"Shortest path with weighted edges" is the direct Dijkstra signal — confirm edge weights are
non-negative before committing to it. "Cheapest flights within K stops" is a Bellman-Ford-style
bounded-relaxation variant (limiting the number of relaxation passes to K+1). "Detect if a
negative cycle exists" (arbitrage-style problems) directly names Bellman-Ford's unique
capability that Dijkstra structurally cannot provide.

### 9. Key Takeaways

- Dijkstra is greedy and heap-driven (O((V+E) log V)) but silently produces wrong answers if any
  edge weight is negative — always confirm non-negative weights before using it.
- Bellman-Ford is slower (O(V·E)) but correctly handles negative weights and can explicitly
  detect negative cycles, which Dijkstra cannot do at all.
- Both generalize BFS's (§41) unweighted shortest-path guarantee to weighted graphs, using
  different mechanisms (greedy priority-queue expansion vs. repeated full-edge relaxation).
- GPS routing (Dijkstra) and arbitrage detection (Bellman-Ford) are the two systems-level
  applications worth naming directly, since they cleanly illustrate why each algorithm exists.

---
