## §13. Red-Black Trees

### 1. Summary

A Red-Black Tree is a self-balancing BST (§11) that maintains O(log n) worst-case height using a
looser rule than AVL (§12): every node is colored red or black, and five coloring/structural
invariants (root is black; red nodes never have red children; every root-to-null path has the
same number of black nodes; etc.) together guarantee the longest path is never more than twice
the shortest. Don't confuse this with AVL's stricter balance-factor rule — Red-Black trades a
slightly taller tree (still O(log n)) for fewer rotations per write, which is the entire reason
it — not AVL — is what production systems actually reach for.

### 2. Why Does It Exist?

AVL's strict ±1 balance factor means almost every insert/delete triggers a rebalancing check and
often a rotation. Red-Black relaxes the balance requirement just enough that most inserts need
only a color flip (O(1), no structural change), with actual rotations needed less frequently —
a better fit for write-heavy workloads where insert/delete speed matters more than having the
absolute shortest possible tree.

### 3. Mental Model

Think of the "black-height" invariant as a rule that no path from root to a leaf can have more
than twice as many nodes as the shortest path — enforced by coloring, not by exact height
bookkeeping. Red nodes are "free" extra nodes slotted in between black nodes without violating
the balance guarantee, which is why most insertions can be absorbed with a color change instead
of a physical rotation.

### 4. Basic Implementation (conceptual — real implementations are notoriously fiddly)

```
struct RBNode:
    value, left, right, parent
    color = RED                       # new nodes always inserted red

function insert(root, value):
    node = bst_insert(root, value, color=RED)     # normal BST insert, §11
    fix_violations(node)               # walk up from node, fixing red-red violations
    root.color = BLACK                 # invariant: root is always black
    return root

function fix_violations(node):
    while node.parent.color == RED:
        uncle = get_uncle(node)
        if uncle.color == RED:
            # Case 1: uncle red -> recolor parent, uncle, grandparent; move up
            node.parent.color = BLACK
            uncle.color = BLACK
            node.parent.parent.color = RED
            node = node.parent.parent
        else:
            # Case 2/3: uncle black -> rotation(s) + recoloring (mirrors §12's rotations)
            node = rotate_and_recolor(node)
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Search | O(log n) worst case |
| Insert | O(log n) worst case, but fewer rotations than AVL on average |
| Delete | O(log n) worst case |
| Space | O(n) + 1 bit per node for color |

### 6. Visualization

```
Black-height invariant: every path from a node to a descendant null
has the same number of BLACK nodes (red nodes don't count).

         10(B)
        /     \
      5(R)     15(R)
     /   \     /    \
   3(B) 7(B) 12(B)  20(B)

Path 10->5->3->null:  black nodes = 10,3        = 2 black
Path 10->15->20->null: black nodes = 10,20      = 2 black
(red nodes 5,15,12,20's sibling checks omitted for brevity -- the point is
every path has equal BLACK count, which bounds max path length to 2x min path length)
```

### 7. Real-World Usage

The **Linux kernel scheduler** (Completely Fair Scheduler) uses a Red-Black tree to order
runnable processes/threads by virtual runtime — picking the next process to run is "find the
leftmost node," O(log n), and the tree stays balanced under constant insertion/removal as
processes are scheduled and descheduled (see §49 for the full story). Java's `TreeMap` and
`TreeSet`, and C++'s `std::map`/`std::set`, are Red-Black trees internally. Red-Black is the
default choice any time a language or system needs an ordered map/set with guaranteed O(log n)
worst-case, favoring write throughput over AVL's marginally faster reads.

### 8. Common Interview Questions

Interviewers rarely expect a full from-memory Red-Black insertion/deletion implementation — it's
notoriously fiddly even for experienced engineers. What's actually tested: knowing the five
invariants exist and *why* (worst-case O(log n) guarantee), knowing Red-Black is the practical
production default over AVL and why (fewer rotations on write), and recognizing "ordered map with
guaranteed logarithmic operations" as the signal to name this structure, or its language's
built-in equivalent, rather than hand-rolling a plain BST.

### 9. Key Takeaways

- Red-Black trades slightly less strict balance than AVL for far fewer rotations per write —
  still O(log n) worst-case for everything.
- The core mechanism is color-based, not a numeric balance factor — most inserts resolve with a
  cheap recolor instead of a rotation.
- This is the tree behind Java `TreeMap`, C++ `std::map`, and the Linux CFS scheduler (§49) — a
  genuinely load-bearing structure in real infrastructure, not just an interview topic.
- You are not expected to reproduce the full rebalancing logic from memory — knowing what
  problem it solves and where it's used in practice is the higher-value takeaway.

---
