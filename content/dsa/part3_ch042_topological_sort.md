## §42. Topological Sort

### 1. Summary

Topological Sort orders the nodes of a **Directed Acyclic Graph** (DAG — a directed graph with no
cycles) such that every edge points from an earlier node to a later one in the ordering — i.e., a
valid order to do things given "must happen before" dependency constraints. It only exists for
DAGs — a cycle makes a valid ordering logically impossible (A before B before C before A is a
contradiction), so cycle detection is an inherent, necessary first step. Don't confuse this with
plain DFS (§40) or BFS (§41) traversal order — topological sort is a *specific*, constrained
ordering derived from one of those traversals, not just "the order nodes happen to be visited."

### 2. Why Does It Exist?

Build systems, task schedulers, and course-prerequisite planning all need to answer "in what
order can these things be done, given these must-happen-before constraints" — topological sort is
the direct algorithmic answer to exactly that question.

### 3. Mental Model

Course prerequisites: you can't take "Advanced Algorithms" before "Intro to Algorithms." A
topological sort of the whole prerequisite graph gives *one valid* order to take every course
such that every prerequisite is satisfied before the course that needs it — there may be multiple
valid orderings, and topological sort finds one of them, not the unique one.

### 4. Basic Implementation — two standard approaches

```
# Approach 1: DFS-based -- post-order DFS, then reverse
function topological_sort_dfs(graph):
    visited = set()
    result = []
    function dfs(node):
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs(neighbor)
        result.append(node)                  # post-order: append AFTER all descendants done
    for node in graph:
        if node not in visited:
            dfs(node)
    return reversed(result)                   # reverse post-order = valid topological order

# Approach 2: Kahn's Algorithm -- BFS-based, using in-degree counting
function topological_sort_kahn(graph):
    in_degree = {node: 0 for node in graph}
    for node in graph:
        for neighbor in graph[node]:
            in_degree[neighbor] += 1
    queue = Queue([n for n in graph if in_degree[n] == 0])   # start with no-prerequisite nodes
    result = []
    while queue is not empty:
        node = queue.dequeue()
        result.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.enqueue(neighbor)
    if len(result) != len(graph):
        raise "Cycle detected -- no valid topological order exists"
    return result
```

### 5. Time & Space Complexity

| Approach | Time | Space | Bonus |
|---|---|---|---|
| DFS-based | O(V + E) | O(V) | simpler to implement given DFS is already known |
| Kahn's Algorithm (BFS-based) | O(V + E) | O(V) | detects cycles naturally (if fewer than
  V nodes get processed, a cycle exists) — often preferred for this reason |

### 6. Visualization

```
Course prerequisites (edge = "must take before"):
  Intro -> DataStructures -> Algorithms
  Intro -> Discrete Math -> Algorithms

Kahn's algorithm:
  in-degree: Intro=0, DataStructures=1, DiscreteMath=1, Algorithms=2
  queue starts: [Intro]
  dequeue Intro -> decrement DataStructures(0), DiscreteMath(0) -> enqueue both
  dequeue DataStructures -> decrement Algorithms(1)
  dequeue DiscreteMath -> decrement Algorithms(0) -> enqueue Algorithms
  dequeue Algorithms

valid order: Intro, DataStructures, DiscreteMath, Algorithms (one of possibly several valid orders)
```

### 7. Real-World Usage

**Build systems** (Make, Bazel, npm/yarn dependency resolution) compute a topological sort of the
package/target dependency graph to decide build order. **Task schedulers** with "run task B only
after task A completes" constraints (workflow orchestration engines) use topological sort
directly. **Spreadsheet formula evaluation** (cell A depends on cell B) must be evaluated in
topological order, and a cycle here is exactly the "circular reference" error spreadsheets detect
using this same cycle-detection mechanism.

### 8. Common Interview Questions

"Course schedule" (can all courses be completed given prerequisites — and if so, in what order)
is the direct, standard framing of this problem, almost always solved with Kahn's algorithm
specifically because it naturally detects impossibility (a cycle) as a side effect. "Build system
dependency resolution" and "alien dictionary" (deriving character ordering from sorted word lists)
are both topological-sort applications once the underlying dependency graph is correctly
constructed from the problem's constraints.

### 9. Key Takeaways

- Topological sort only exists for DAGs — cycle detection is inherent to the algorithm, not a
  separate concern bolted on afterward.
- Two standard implementations: DFS-based (post-order, then reverse) and Kahn's algorithm
  (BFS-based, in-degree counting) — Kahn's is often preferred because it detects a cycle
  naturally, as an unavoidable side effect of the algorithm itself.
- Build systems, task schedulers, and spreadsheet formula evaluation are all genuine, load-
  bearing real-world uses of this exact algorithm.
- There may be multiple valid topological orderings for a given DAG — the algorithm finds one
  valid order, not a unique canonical one.

---
