## §10. Binary Trees

### 1. Summary

A binary tree is a tree (§9) where every node has at most two children, conventionally called
`left` and `right`. Note precisely: a binary tree alone imposes *no ordering* on values — that
constraint is what a Binary Search Tree (§11) adds. Don't confuse the two: "binary tree" is
purely a shape constraint (≤2 children); "binary search tree" is a shape constraint *plus* an
ordering invariant.

### 2. Why Does It Exist?

Limiting to two children per node is the minimum structure needed to encode a yes/no branching
decision at every step — which is exactly what search, comparison, and divide-and-conquer
algorithms need, and it's the shape every other tree in this book specializes further.

### 3. Mental Model

A binary tree is a chain of yes/no forks. At each node you can go left, go right, or stop — there
is no "which of five children" ambiguity, which is precisely what makes binary structures easy
to reason about recursively (each subtree is itself a binary tree).

### 4. Basic Implementation

```
struct BinaryTreeNode:
    value
    left = None
    right = None

function inorder(node):                 # left, self, right
    if node is None: return
    inorder(node.left)
    visit(node.value)
    inorder(node.right)

function preorder(node):                # self, left, right
    if node is None: return
    visit(node.value)
    preorder(node.left)
    preorder(node.right)

function postorder(node):               # left, right, self
    if node is None: return
    postorder(node.left)
    postorder(node.right)
    visit(node.value)
```

### 5. Time & Space Complexity

| Operation | Balanced Binary Tree | Degenerate (linked-list-shaped) |
|---|---|---|
| Traversal (all nodes) | O(n) | O(n) |
| Height | O(log n) | O(n) |
| Recursive traversal call-stack space | O(log n) | O(n) |

### 6. Visualization

```
         1
       /   \
      2     3
     / \   / \
    4   5 6   7

preorder:  1 2 4 5 3 6 7
inorder:   4 2 5 1 6 3 7
postorder: 4 5 2 6 7 3 1
```

### 7. Real-World Usage

Expression trees (compilers parse arithmetic expressions into a binary tree where operators are
internal nodes and operands are leaves, then evaluate via postorder traversal) and decision
trees in classic machine learning both use the plain binary-tree shape without necessarily
needing the BST ordering invariant. Every balanced/ordered tree structure in this book (BST,
AVL, Red-Black) is a binary tree with an added constraint — this chapter's traversal mechanics
apply unchanged to all of them.

### 8. Common Interview Questions

"Is this tree balanced," "maximum depth," "diameter of a tree," and "invert a binary tree" all
test the recursive bottom-up pattern from §9. "Serialize and deserialize a binary tree" tests
whether you understand that preorder (with explicit null markers) is sufficient to reconstruct
the exact shape, not just the values. Choosing the right traversal order for a given question —
inorder for BSTs specifically gives sorted output, which is worth remembering going into §11 —
is a common conceptual check.

### 9. Key Takeaways

- Binary tree = at most two children per node; no ordering guarantee by itself.
- Preorder/inorder/postorder differ only in when the current node is visited relative to its
  children — all three are DFS.
- A degenerate binary tree (every node has only one child) behaves like a linked list — O(n)
  height, no better than §3's structure — which motivates every balancing scheme in §12-15.
- Inorder traversal of a Binary *Search* Tree specifically yields sorted order — a preview for
  §11.

---
