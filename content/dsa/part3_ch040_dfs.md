## §40. Depth-First Search (DFS)

### 1. Summary

DFS explores a graph (§19) or tree (§9) by going as deep as possible along one path before
backtracking, using either explicit recursion (the call stack, §35) or an explicit Stack (§4).
Don't confuse DFS with BFS (§41) — DFS uses a stack (LIFO) and explores depth-first; BFS uses a
queue (FIFO) and explores level-by-level/breadth-first. That single data-structure swap is the
entire difference in mechanics, but it changes which class of problems each is naturally suited
for — DFS for "does a path exist / enumerate all paths," BFS for "shortest path in an unweighted
graph."

### 2. Why Does It Exist?

Many graph questions are naturally about reachability or exhaustive path enumeration — "can I get
from A to B at all," "find all paths," "detect a cycle" — where the specific order of exploration
doesn't matter, only that everything reachable eventually gets visited. DFS's simple, natural
recursive structure (mirroring §9's tree recursion directly) makes it the default choice for
these.

### 3. Mental Model

Exploring a maze by always taking the first available turn and continuing until you hit a dead
end or an already-visited spot, then backing up to the most recent unexplored branch point — this
is identical to backtracking's (§38) mental model, and indeed backtracking is DFS with pruning
added.

### 4. Basic Implementation

```
function dfs_recursive(graph, node, visited):
    if node in visited: return
    visited.add(node)
    visit(node)
    for neighbor in graph[node]:
        dfs_recursive(graph, neighbor, visited)

function dfs_iterative(graph, start):               # explicit stack, avoids recursion depth risk
    visited = set()
    stack = [start]
    while stack:
        node = stack.pop()                            # LIFO -- this IS the "depth-first" part
        if node in visited: continue
        visited.add(node)
        visit(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                stack.append(neighbor)
```

### 5. Time & Space Complexity

| Aspect | Complexity |
|---|---|
| Time | O(V + E) — every vertex and edge visited once |
| Space (recursive) | O(V) worst case — call stack depth on a long path |
| Space (iterative, explicit stack) | O(V) worst case |

### 6. Visualization

```
Graph:  A -> B -> D
        A -> C -> D

DFS from A (recursive, visiting neighbors in listed order):
visit A -> visit B -> visit D (dead end, D has no unvisited neighbors, backtrack)
        -> back to A -> visit C -> D already visited, skip

Order visited: A, B, D, C
```

### 7. Real-World Usage

Cycle detection in dependency graphs (does this package dependency graph have a circular
dependency) uses DFS directly, tracking nodes currently "on the current recursion path" versus
fully finished. File system traversal (walking every file/subdirectory) is a direct real-world
DFS. Topological Sort (§42) is built directly on top of DFS — a DFS post-order traversal, reversed,
gives a valid topological ordering, which is the single most important DFS-dependency
relationship in this book.

### 8. Common Interview Questions

"Does a path exist between these two nodes" and "find all paths between two nodes" are direct DFS
applications. "Detect a cycle in a graph" (directed or undirected) is a very common DFS question
with a subtly different implementation for each case (directed: track the current recursion path
specifically, not just all visited nodes; undirected: track the parent to avoid falsely flagging
the edge you just came from as a cycle). "Number of islands" (connected components in a grid) is
DFS or BFS applied to an implicit grid-graph.

### 9. Key Takeaways

- DFS uses a stack (explicit or via recursion's call stack) and explores as deep as possible
  before backtracking — O(V+E) time, O(V) space.
- The recursive implementation directly mirrors tree recursion (§9, §35) — DFS is that same
  pattern generalized to graphs, which may have cycles a tree never does (requiring a `visited`
  set to avoid infinite loops).
- Cycle detection differs meaningfully between directed graphs (track the current path) and
  undirected graphs (track the parent) — a common, easy-to-miss distinction.
- Topological Sort (§42) is built directly on a DFS post-order traversal — a genuine, load-
  bearing dependency between these two chapters, not a coincidence of both being graph algorithms.

---
