## §12. Balanced Trees & AVL Trees

### 1. Summary

"Balanced" means a tree's height stays O(log n) regardless of insertion order, guaranteeing that
search/insert/delete never degrade to the O(n) worst case a plain BST (§11) allows. An AVL tree
is one specific, historically-first way to enforce this: after every insert/delete, it checks the
**balance factor** (height of left subtree minus height of right subtree) at each ancestor, and
if it ever exceeds ±1, performs a **rotation** to restore balance. Don't confuse "balanced" (a
property any of several structures can satisfy) with "AVL" (one specific algorithm for
maintaining it) — Red-Black Trees (§13) satisfy the same property with a looser, cheaper rule.

### 2. Why Does It Exist?

A plain BST's O(log n) guarantee is only average-case — an adversarial or simply unlucky
insertion order (sorted data, for instance) collapses it to a linked list, O(n). Balancing exists
to make the O(log n) guarantee worst-case, not just average-case, by actively correcting the
tree's shape as it changes.

### 3. Mental Model — Rotations, the General Balancing Tool

A rotation is a local, O(1) restructuring that changes which of two adjacent nodes is "on top"
without breaking the BST ordering invariant — like pivoting two people in a line without changing
who's in front of whom relative to everyone else. Every balanced-tree scheme in this book (AVL,
Red-Black, and even B-Tree splits in spirit) leans on some version of this same idea: detect an
imbalance locally, fix it with a constant number of pointer changes, and the fix never needs to
touch more than O(log n) ancestors on the way back up.

```
Right rotation around node Y (fixes a left-heavy imbalance):

      Y                    X
     / \                  / \
    X   c      -->       a   Y
   / \                      / \
  a   b                    b   c
```

### 4. Basic Implementation (AVL specifics)

```
struct AVLNode:
    value, left, right
    height = 1

function balance_factor(node):
    return height(node.left) - height(node.right)

function rotate_right(y):
    x = y.left
    y.left = x.right
    x.right = y
    update_height(y); update_height(x)
    return x                              # x is the new subtree root

function rotate_left(x):
    y = x.right
    x.right = y.left
    y.left = x
    update_height(x); update_height(y)
    return y

function insert(node, value):
    node = bst_insert(node, value)        # normal BST insert, §11
    update_height(node)
    bf = balance_factor(node)
    if bf > 1 and value < node.left.value:      return rotate_right(node)   # left-left
    if bf < -1 and value > node.right.value:    return rotate_left(node)    # right-right
    if bf > 1 and value > node.left.value:
        node.left = rotate_left(node.left);     return rotate_right(node)  # left-right
    if bf < -1 and value < node.right.value:
        node.right = rotate_right(node.right);  return rotate_left(node)   # right-left
    return node
```

### 5. Time & Space Complexity

| Operation | AVL Tree |
|---|---|
| Search | O(log n) worst case |
| Insert | O(log n) worst case (includes rebalancing) |
| Delete | O(log n) worst case |
| Space | O(n) |

### 6. Visualization

```
Inserting 1,2,3 into an AVL tree (would degenerate in a plain BST):

insert 1:      1

insert 2:      1                (balance factor -1, still OK)
                \
                 2

insert 3:      1                balance factor at node 1 becomes -2 -> imbalance!
                \                rotate_left(1):
                 2
                  \                    2
                   3        -->      / \
                                     1   3   <- balanced again, height stays O(log n)
```

### 7. Real-World Usage

AVL trees are rarely chosen for new production systems today — Red-Black Trees (§13) dominate
because they rebalance with fewer rotations on average (cheaper writes), at the cost of being
very slightly less strictly balanced (cheaper reads still O(log n), just with a marginally
larger constant). AVL is taught because its balance-factor-and-rotation mechanics are the
clearest possible introduction to the general balancing idea every other structure in this book
reuses in some form. Database index structures and language standard libraries almost always
pick Red-Black or B-Tree variants over AVL in practice.

### 8. Common Interview Questions

"Implement AVL insertion with rotations" is a common from-memory question specifically because
it tests whether you understand rotations, not just BST mechanics. "Given this tree, is it
height-balanced?" (a bottom-up recursive height check) is a more common practical question than
implementing full AVL insert/delete. Knowing *why* AVL is rarely used in production despite
being taught first — Red-Black's cheaper writes — is a common, easy-to-miss follow-up.

### 9. Key Takeaways

- Balancing exists to make BST operations O(log n) *worst-case*, not merely average-case.
- Rotation — a local, O(1) restructuring that preserves the BST invariant — is the general tool
  every balanced-tree scheme in this book builds on.
- AVL enforces the strictest balance (±1 balance factor at every node), giving the fastest reads
  but the most rotation work on writes.
- In production, Red-Black Trees (§13) are chosen over AVL far more often, precisely because of
  that write-cost tradeoff — know this distinction, don't just memorize AVL's rotation cases.

---
