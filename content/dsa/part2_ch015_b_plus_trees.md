## §15. B+ Trees

### 1. Summary

A B+Tree is a B-Tree (§14) variant with two specific differences: (1) all actual data (or row
pointers) live *only* in leaf nodes — internal nodes store keys purely for routing, never data;
and (2) every leaf node holds a pointer to the next leaf, forming a linked list across all leaves
in sorted order. Don't confuse this with a plain B-Tree, which stores data in internal nodes too
and has no leaf-linking — that single pair of differences is what makes B+Trees, not B-Trees,
the dominant choice for relational database indexes.

### 2. Why Does It Exist?

Databases need two things a plain B-Tree doesn't optimize for equally well: (a) more keys per
internal node (since internal nodes carry no data payload, more fit per disk page, further
reducing tree height) and (b) fast range scans ("all rows where age > 30") — which the
leaf-linked-list makes a simple linear walk instead of repeated tree descents for each result.

### 3. Mental Model

Think of a B+Tree as a phone book's alphabetical tab index (internal nodes — just letters
routing you to a section) sitting on top of the actual pages of listings (leaves — where the real
data lives), with every page also physically adjacent to the next, so once you find the start of
a range you can just keep flipping forward without needing the tab index again.

### 4. Basic Implementation (conceptual — differences from §14 highlighted)

```
struct BPlusTreeInternalNode:
    keys = []                  # routing only, no data
    children = []

struct BPlusTreeLeafNode:
    keys = []
    values = []                 # actual data or row pointers live HERE only
    next_leaf = pointer          # <-- the key structural addition over a plain B-Tree

function range_query(root, low, high):
    leaf = descend_to_leaf(root, low)          # O(log_M n) to find the start
    results = []
    while leaf is not None:
        for key, value in leaf.entries():
            if key > high:
                return results
            if key >= low:
                results.append(value)
        leaf = leaf.next_leaf                   # O(1) hop, no re-descending the tree
    return results
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Point lookup (exact key) | O(log_M n) |
| Range scan of k results | O(log_M n + k) — one descent, then k linear leaf hops |
| Insert / Delete | O(log_M n), plus possible leaf split/merge and leaf-link maintenance |
| Space | O(n), with typically higher fan-out per node than an equivalent plain B-Tree |

### 6. Visualization

```
                [ 30 | 70 ]                      <- internal: routing keys only
               /     |     \
        [10|20]  [30|50]  [70|90]                <- leaves: keys + actual data
          |         |         |
          +-------->+-------->+   <- next_leaf pointers chain all leaves in sorted order

range_query(15, 75):
  descend to leaf [10|20] (finds 15's neighborhood)
  walk leaf-linked-list forward: [10|20] -> [30|50] -> [70|90]
  collect matching entries along the way, stop once key > 75
```

### 7. Real-World Usage

**PostgreSQL and MySQL (InnoDB)** both use B+Trees as the default index structure — this is the
mechanism behind `CREATE INDEX` and behind primary-key lookups. See §45 (PostgreSQL) and §46
(MySQL/InnoDB) for how each database layers its own storage model (heap-plus-pointer vs.
clustered-index) on top of this same B+Tree foundation — the difference between those two
chapters is entirely about what a B+Tree leaf actually contains, not the B+Tree mechanics
themselves. SQLite and most other relational engines follow the same pattern.

### 8. Common Interview Questions

"Why do databases use B+Trees specifically, not plain B-Trees?" is the direct follow-up to §14's
signature question — the answer is the leaf-linked-list enabling efficient range scans, plus
higher fan-out from keeping data out of internal nodes. "How does a database answer a range
query efficiently?" is really asking whether you know about leaf-linking, not about the B+Tree's
point-lookup path. Systems-design interviews touching "how would you index this data for fast
range queries" are testing recognition of this exact structure.

### 9. Key Takeaways

- B+Tree = B-Tree, but data lives only in leaves, and leaves are linked in sorted order —
  exactly the two differences that make range queries fast.
- Higher fan-out per internal node (no data payload to store) means an even shorter, shallower
  tree than a plain B-Tree at the same key count.
- This is the actual structure behind virtually every relational database index you'll touch in
  production — worth knowing by name and mechanism, not just "databases use trees."
- The next two chapters (§45 PostgreSQL, §46 MySQL/InnoDB) show two different real systems built
  on this exact same B+Tree foundation, diverging only in what a leaf stores.

---
