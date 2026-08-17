## §21. Skip Lists

### 1. Summary

A skip list is a linked list (§3) with extra "express lane" layers stacked on top — each higher
layer skips over more elements than the one below it, built via randomization rather than
strict rebalancing. Searching starts at the top (sparsest) layer and drops down a layer each time
the next node would overshoot the target, giving expected O(log n) search/insert/delete without
any of the rotation logic Red-Black Trees (§13) or AVL (§12) require. Don't confuse a skip list
with a balanced tree — both give O(log n) expected performance for ordered data, but a skip list
achieves it through randomized layering of a linked list, not through tree rotations, making it
considerably simpler to implement correctly.

### 2. Why Does It Exist?

Balanced trees give guaranteed O(log n), but their rebalancing logic (rotations, color rules) is
notoriously fiddly to implement correctly (§13 even says so explicitly). A skip list achieves the
same expected O(log n) with a much simpler mental model and implementation, at the cost of the
guarantee being probabilistic (extremely reliable in practice, but not worst-case guaranteed like
a Red-Black tree) — a tradeoff systems engineers are often happy to make for implementation
simplicity and easier concurrent-access support.

### 3. Mental Model

An express-train system laid over a local-train line: level 0 is the local line stopping at every
station (a normal linked list); level 1 skips every other station; level 2 skips even more.
Searching for a station means riding the highest express line as far as possible, then dropping
down one level whenever you'd otherwise overshoot, repeating until you reach level 0 — always
converging toward the target roughly by halving the remaining distance, layer by layer.

### 4. Basic Implementation (conceptual)

```
struct SkipListNode:
    value
    forward = []              # forward[i] = pointer to next node at level i

function search(head, target, max_level):
    node = head
    for level in range(max_level, -1, -1):        # start at the top, sparsest level
        while node.forward[level] and node.forward[level].value < target:
            node = node.forward[level]
        # drop down one level once we can't safely move forward anymore
    node = node.forward[0]                          # land on level 0
    return node if node and node.value == target else None

function insert(head, value):
    level = random_level()          # e.g. coin-flip: 50% chance to promote to next level up
    new_node = SkipListNode(value)
    for each level from 0 to level:
        splice new_node into that level's linked list at the correct sorted position
```

### 5. Time & Space Complexity

| Operation | Expected | Worst Case (rare, all coin flips unlucky) |
|---|---|---|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Space | O(n) expected (extra levels add a small constant factor) | — |

### 6. Visualization

```
Level 2:  1 --------------------> 9
Level 1:  1 -------> 5 ---------> 9
Level 0:  1 -> 3 -> 5 -> 7 -> 8 -> 9      <- every element, the "full" list

search(7): start level 2 at 1 -> 9 overshoots -> drop to level 1
           level 1: 1 -> 5, 5 -> 9 overshoots -> drop to level 0
           level 0: 5 -> 7, found.
```

### 7. Real-World Usage

**Redis Sorted Sets** (`ZSET`) are implemented using a skip list internally — this is the single
most important real-world skip-list deployment most engineers will encounter, and it's exactly
why Redis sorted sets give O(log n) range queries and rank lookups without needing balanced-tree
rebalancing logic in the codebase (see §47 for the fuller Redis story). LevelDB and RocksDB use
skip lists for their in-memory "memtable" (the write buffer before data is flushed to an on-disk
LSM Tree, §25) partly because skip lists support efficient concurrent reads with simpler locking
than a rotating tree structure would need.

### 8. Common Interview Questions

"Design a data structure supporting O(log n) insert, delete, and search" is answerable with
either a balanced tree or a skip list — mentioning skip lists as a simpler-to-implement
alternative, and naming Redis's ZSET as a concrete real-world precedent, reads as considerably
more informed than only knowing the tree-based answer. Skip lists are rarely asked to be
implemented in full from memory, but recognizing "randomized layered linked list, O(log n)
expected" as a legitimate alternative to tree-balancing is a genuine differentiator.

### 9. Key Takeaways

- A skip list layers randomized "express lanes" over a linked list to achieve expected O(log n)
  operations without any tree-rotation logic.
- The tradeoff versus balanced trees (§12-13) is probabilistic rather than guaranteed worst-case
  performance, in exchange for a much simpler implementation.
- Redis Sorted Sets are the single most important production use of this structure — know this
  by name, it comes up constantly once you know to look for it.
- Simpler concurrent-access properties (versus rotating a tree under contention) are a real,
  practical reason systems engineers reach for skip lists over balanced trees.

---
