## §14. B-Trees

### 1. Summary

A B-Tree is a self-balancing tree generalized from "at most 2 children per node" (binary trees,
§10-13) to "at most M children per node," where each node holds multiple sorted keys and M
(the "order" or "branching factor") is typically chosen to match a disk page size (e.g. 100+
keys per node). Don't confuse a B-Tree with a B+Tree (§15) — a plain B-Tree stores actual data
(or data pointers) in *every* node, internal or leaf, while a B+Tree stores data only in leaf
nodes and uses internal nodes purely for routing. This distinction is the entire reason both get
separate chapters.

### 2. Why Does It Exist?

Binary trees, even balanced ones, have height proportional to log₂(n) — for a billion rows,
that's ~30 levels, and on disk-backed storage each level traversed is potentially a separate,
slow disk seek. A B-Tree's much higher branching factor (hundreds of children per node instead
of 2) collapses that to just 3-4 levels for the same billion rows, because log_M(n) shrinks
dramatically as M grows — trading tree height directly for disk I/O count, which is the actual
bottleneck on spinning or even solid-state storage.

### 3. Mental Model

Instead of a binary decision (go left or right) at each node, a B-Tree node holds a whole sorted
array of keys, and you binary-search *within* the node to decide which of its many children to
descend into next. Each node is sized to exactly fill one disk page, so reading one node is
exactly one disk I/O — the entire design optimizes for "minimize the number of disk reads," not
"minimize the number of comparisons."

### 4. Basic Implementation (conceptual)

```
struct BTreeNode:
    keys = []              # sorted, up to M-1 keys
    children = []           # up to M children (empty if leaf)
    is_leaf = bool

function search(node, target):
    i = binary_search_within_node(node.keys, target)     # find position in this node
    if i < len(node.keys) and node.keys[i] == target:
        return found
    if node.is_leaf:
        return not_found
    return search(node.children[i], target)               # descend one disk page

function insert(node, value):
    insert_in_sorted_position(node, value)
    if len(node.keys) > M - 1:                             # node overflowed
        split_node(node)                                    # promote middle key to parent
```

### 5. Time & Space Complexity

| Operation | Complexity | Disk I/Os (approx.) |
|---|---|---|
| Search | O(log_M n) | O(log_M n) — one seek per level |
| Insert | O(log_M n) | O(log_M n), plus possible node splits |
| Delete | O(log_M n) | O(log_M n), plus possible node merges |
| Space | O(n) | — |

For 1 billion keys: a balanced binary tree needs ~30 levels; a B-Tree with M=200 needs only
~4 levels — a direct, practical reduction in disk seeks.

### 6. Visualization

```
B-Tree node holding multiple sorted keys, each gap pointing to a child subtree:

              [ 20 | 50 | 80 ]                <- one node = one disk page
             /    |    |    \
          <20  20-50  50-80  >80              <- 4 children for 3 keys

search(65): binary-search within [20,50,80] -> falls between 50 and 80 ->
            descend into the "50-80" child -> one more disk read
```

### 7. Real-World Usage

Filesystems (NTFS, HFS+) and some database storage engines (notably MongoDB's WiredTiger in
B-Tree mode) use B-Trees directly for exactly the disk-I/O-minimization reason above. Most
relational databases (PostgreSQL, MySQL) actually use the B+Tree variant (§15) for their primary
indexes rather than a plain B-Tree — worth knowing precisely which variant a given system uses,
since the leaf-linking difference (§15) matters a great deal for range queries.

### 8. Common Interview Questions

"Why does a database use a B-Tree/B+Tree instead of a balanced binary tree like Red-Black?" is
the single most common question this chapter prepares you for — the answer is disk I/O
minimization via high branching factor, not asymptotic complexity (both are O(log n) in Big-O
terms; the constant factor, driven by disk seeks, is what actually matters in practice).
"What happens when a B-Tree node overflows?" tests understanding of the split-and-promote
mechanism that keeps the tree balanced without ever needing AVL/Red-Black-style rotations.

### 9. Key Takeaways

- A B-Tree generalizes binary trees to M children per node, collapsing tree height by trading
  node size (matched to a disk page) for far fewer levels.
- The real-world motivation is disk I/O count, not asymptotic Big-O — O(log_M n) and O(log₂ n)
  are both "O(log n)," but the constant-factor difference is what actually matters on disk.
- Node overflow triggers a split-and-promote, the B-Tree analogue of a balanced binary tree's
  rotation — no single mechanism is reused, but the goal (bound height after a write) is
  identical.
- Know this chapter is a *plain* B-Tree — the moment a database is mentioned specifically, it's
  almost certainly the B+Tree variant (§15), not this one.

---
