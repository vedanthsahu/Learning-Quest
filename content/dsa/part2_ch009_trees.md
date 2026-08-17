## §9. Trees (General Concepts)

### 1. Summary

A tree is a hierarchical structure of nodes where each node has exactly one parent (except the
root, which has none) and zero or more children, with no cycles. This chapter covers the
vocabulary and traversal mechanics shared by every specific tree in this book (Binary Trees §10,
BST §11, Red-Black §13, B-Trees §14, Tries §18, etc.) so those chapters can focus on what makes
each variant different, not re-explain what a tree is. Don't confuse "tree" the general concept
with "Binary Tree" — a binary tree is one specific constraint (at most two children per node)
layered on top of the general tree concept.

### 2. Why Does It Exist?

Real-world data is naturally hierarchical — file systems, org charts, HTML/DOM, category trees
in e-commerce, decision logic. A tree is the structure that represents "one parent, many
possible children" directly, and — critically — most tree variants give O(log n) search/insert
by design, versus a plain array or linked list's O(n).

### 3. Mental Model

A family tree or an org chart: one person at the top, each person below reporting to exactly one
person above, and no cycles (nobody is their own ancestor). "Height" is the longest chain from
root to a leaf; "depth" of a node is its distance from the root.

### 4. Basic Implementation

```
struct TreeNode:
    value
    children = []          # general tree: any number of children

# The two traversal families every tree variant reuses:

function dfs_preorder(node):
    if node is None: return
    visit(node)
    for child in node.children:
        dfs_preorder(child)

function bfs_level_order(root):
    queue = Queue([root])              # see §5 Queues
    while queue is not empty:
        node = queue.dequeue()
        visit(node)
        for child in node.children:
            queue.enqueue(child)
```

### 5. Time & Space Complexity

| Operation (general, unbalanced tree) | Complexity |
|---|---|
| Traversal (visit every node) | O(n) |
| Search (no ordering guarantee) | O(n) |
| Height of a degenerate (linked-list-shaped) tree | O(n) — this is exactly what BST (§11)
  balancing exists to prevent |

### 6. Visualization

```
              A                 depth 0 = root
            / | \
           B  C  D               depth 1
          / \      \
         E   F      G            depth 2 = leaves (no children)

DFS preorder: A B E F C D G
BFS level-order: A B C D E F G
```

### 7. Real-World Usage

The DOM (HTML document tree), file system directory structure, and JSON/XML nesting are all
general trees. Every specific structure in the rest of Part II — BST, balanced trees, heaps,
tries, B-Trees — is a tree with one additional constraint layered on to buy a specific
guarantee (ordering, balance, prefix-sharing, disk-page-alignment). Understanding this chapter's
two traversal patterns (DFS-family, BFS-family) means you already understand 80% of the
mechanics of every tree chapter that follows.

### 8. Common Interview Questions

"Traverse this tree and print X" questions are testing whether you can implement preorder,
inorder, postorder (all DFS variants, differing only in when you visit the current node relative
to its children), and level-order (BFS) correctly. "Height of a tree," "is this tree balanced,"
and "diameter of a tree" are all DFS-with-return-value patterns — compute a value bottom-up from
children before combining it at the parent.

### 9. Key Takeaways

- Every tree is one parent, zero-or-more children, no cycles — the variant-specific chapters
  that follow each add exactly one more constraint on top of this.
- DFS (preorder/inorder/postorder) and BFS (level-order) are the two traversal families reused
  by literally every tree structure in this book.
- An unbalanced general tree degrades to O(n) height in the worst case — the entire reason
  balanced variants (§12-15) exist.
- "Compute X bottom-up from children" is the core pattern behind most tree interview questions.

---
