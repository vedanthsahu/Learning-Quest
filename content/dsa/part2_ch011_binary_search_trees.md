## §11. Binary Search Trees (BST)

### 1. Summary

A Binary Search Tree is a binary tree (§10) with one added invariant: for every node, all values
in its left subtree are smaller, and all values in its right subtree are larger. This invariant
is what makes search, insert, and delete O(log n) *on average* — the exact phrase to hold onto,
because an unbalanced BST (e.g. built by inserting already-sorted data) degrades to O(n), which
is precisely why §12-15 exist as fixes.

### 2. Why Does It Exist?

A plain sorted array gives O(log n) search (via Binary Search, §29) but O(n) insert/delete
(shifting elements). A BST aims to give O(log n) for *all three* — search, insert, delete — by
encoding the ordering in the tree shape itself rather than in contiguous memory layout.

### 3. Mental Model

At each node, comparing your target value against the current node tells you which single
subtree could possibly contain it — smaller goes left, larger goes right, equal means found.
Every comparison eliminates one entire subtree from consideration, the same halving intuition as
binary search on a sorted array, but the ability to insert/delete without shifting anything.

### 4. Basic Implementation

```
function search(node, target):
    if node is None or node.value == target:
        return node
    if target < node.value:
        return search(node.left, target)
    else:
        return search(node.right, target)

function insert(node, value):
    if node is None:
        return TreeNode(value)
    if value < node.value:
        node.left = insert(node.left, value)
    else:
        node.right = insert(node.right, value)
    return node

function find_min(node):                    # needed for delete
    while node.left is not None:
        node = node.left
    return node

function delete(node, value):
    if node is None: return None
    if value < node.value:
        node.left = delete(node.left, value)
    elif value > node.value:
        node.right = delete(node.right, value)
    else:                                     # found the node to delete
        if node.left is None:  return node.right
        if node.right is None: return node.left
        successor = find_min(node.right)      # in-order successor
        node.value = successor.value
        node.right = delete(node.right, successor.value)
    return node
```

### 5. Time & Space Complexity

| Operation | Balanced BST | Degenerate BST (sorted-order insertion) |
|---|---|---|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Space | O(n) | O(n) |

### 6. Visualization

```
Balanced BST:                    Degenerate BST (inserted 1,2,3,4,5 in order):
       8                          1
      / \                          \
     3   10                         2
    / \    \                          \
   1   6    14                         3
      / \                               \
     4   7                               4
                                           \
search(6): 8 -> 3 -> 6, found in 2 hops     5
                                          search(5): 1->2->3->4->5, O(n) -- a linked
                                          list wearing a tree's clothes
```

### 7. Real-World Usage

Language library ordered-map/ordered-set types (e.g. C++ `std::map`, Java `TreeMap`) are
typically backed by a self-balancing BST (usually Red-Black, §13). BSTs are the conceptual
ancestor of every other ordered tree in this book — AVL (§12) and Red-Black (§13) add explicit
rebalancing; B-Trees/B+Trees (§14-15) generalize "at most 2 children" to "at most M children"
specifically to reduce disk I/O. Understanding plain BST mechanics first is what makes those
later chapters readable as "BST plus one more rule," not a fresh structure each time.

### 8. Common Interview Questions

"Validate a BST" (check the ordering invariant holds for every node, not just its immediate
children) is a classic bug-prone question — a common mistake is only comparing a node to its
direct children instead of tracking a valid (min, max) range down the recursion. "Find the k-th
smallest element" exploits the fact that inorder traversal of a BST yields sorted order (from
§10). "Lowest common ancestor in a BST" has an O(log n) shortcut unavailable in a general binary
tree, precisely because of the ordering invariant — the first node where the target values split
left/right is the answer, no full traversal needed.

### 9. Key Takeaways

- BST = binary tree + the left-smaller/right-larger ordering invariant, giving O(log n) average
  search/insert/delete.
- Worst case degrades to O(n) on unbalanced insertion order (e.g. already-sorted input) — the
  entire motivation for §12-15's self-balancing variants.
- Inorder traversal always yields sorted order — the basis for k-th-smallest and many other BST
  tricks.
- "Validate BST" bugs almost always come from checking only immediate parent-child ordering
  instead of a full valid-range constraint per node.

---
