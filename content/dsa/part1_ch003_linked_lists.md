## §3. Linked Lists

### 1. Summary

A linked list is a sequence of nodes, each holding a value and a pointer (or two, for a doubly
linked list) to the next node — not contiguous in memory, unlike an array. Don't confuse a linked
list with an array-backed list (Python's `list`); Python has no built-in linked list type at all
— `collections.deque` is the closest standard structure, and it's actually implemented as a
doubly linked list of fixed-size blocks, not a naive node-per-element chain.

### 2. Why Does It Exist?

Arrays are bad at insertion/deletion in the middle (O(n) shift). A linked list makes that O(1)
*once you're already at the right node*, because inserting is just re-pointing a couple of
pointers — no shifting. The cost: you give up O(1) random access entirely; reaching node k
requires walking k pointers from the head.

### 3. Mental Model

Think of a scavenger hunt: each clue (node) tells you where the next clue is, but you can't skip
ahead — you must walk the chain from the start (or, for a doubly linked list, from either end).
Splicing a new clue into the middle of the hunt is trivial once you're standing at the right
spot; finding that spot is the expensive part.

### 4. Basic Implementation

```
struct Node:
    value
    next            # pointer to next node (also `prev` for doubly linked)

function insert_after(node, value):
    new_node = Node(value)
    new_node.next = node.next
    node.next = new_node             # O(1) once you have `node`

function delete_after(node):
    node.next = node.next.next       # O(1) once you have `node`

function find(head, target):
    current = head
    while current is not None:
        if current.value == target:
            return current
        current = current.next
    return None                      # O(n) — no random access
```

### 5. Time & Space Complexity

| Operation | Singly Linked | Doubly Linked | Array (for comparison) |
|---|---|---|---|
| Access by index | O(n) | O(n) | O(1) |
| Insert/delete at known node | O(1) | O(1) | O(n) |
| Insert/delete at head | O(1) | O(1) | O(n) |
| Insert/delete at tail | O(n) (O(1) with tail pointer) | O(1) | O(1) amortized |
| Search by value | O(n) | O(n) | O(n) |
| Extra space per element | 1 pointer | 2 pointers | 0 (just the slack capacity) |

### 6. Visualization

```
Singly linked list:
 head -> [12|*] -> [47|*] -> [3|*] -> [91|null]

Doubly linked list:
 head <-> [12|*|*] <-> [47|*|*] <-> [3|*|*] <-> [91|*|null]
           (prev,next)   (prev,next)   (prev,next)

Insertion of 99 between 47 and 3 (doubly linked, O(1) given the node):
 ... [47] <-> [99] <-> [3] ...
      just re-point 4 pointers, nothing shifts
```

### 7. Real-World Usage

`LinkedHashMap`-style structures and LRU Cache (§23) implementations rely on a doubly linked
list specifically because it gives O(1) "move this node to the front" alongside a hash table's
O(1) lookup — the combination is what makes LRU eviction O(1) end-to-end. Python's
`collections.deque` uses a doubly linked list of blocks internally to get O(1) append/pop from
both ends. Operating-system schedulers and memory allocators use linked lists (often intrusive,
where the pointers live inside the object itself) to track free blocks or runnable processes
without needing contiguous memory.

### 8. Common Interview Questions

Fast/slow pointer ("tortoise and hare") questions — cycle detection, finding the middle node,
finding the Nth-from-end node — are the signature linked-list pattern; if you see "find a cycle"
or "middle of the list" without extra space allowed, this is it. Reversing a linked list
(iteratively, re-pointing `next` as you walk) is one of the most common from-memory
implementation questions in interviews, precisely because it tests whether you actually
understand pointer manipulation rather than just array indexing.

### 9. Key Takeaways

- Linked lists trade O(1) index access away in exchange for O(1) insert/delete at a known
  position — the exact opposite tradeoff profile from arrays.
- Doubly linked lists cost one extra pointer per node but make tail operations and node removal
  O(1) without needing to walk from the head first.
- The fast/slow pointer pattern is the single most-tested linked-list technique.
- In practice, Python code rarely hand-rolls linked lists — reach for `collections.deque` when
  you need O(1) operations at both ends.

---
