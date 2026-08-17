## §23. LRU Cache

### 1. Summary

An LRU (Least Recently Used) Cache is a fixed-capacity key-value store that, when full, evicts
whichever entry hasn't been accessed for the longest time to make room for a new one. It is not a
new primitive structure — it's a specific, extremely common *combination* of two structures
already covered: a Hash Table (§7) for O(1) key lookup, plus a Doubly Linked List (§3) for O(1)
reordering-to-front on access and O(1) eviction-from-the-back. Don't confuse LRU with LFU (Least
Frequently Used) — LRU cares about *recency* of access, LFU about *count* of accesses; they're
different eviction policies with different real-world tradeoffs.

### 2. Why Does It Exist?

A cache is only useful if it stays fast and bounded in size — an unbounded cache is just a slow
memory leak. LRU is the most common eviction policy because "recently used" is a strong, cheap-
to-track proxy for "likely to be used again soon" in most real access patterns (temporal
locality), and — critically — it can be implemented with O(1) get and put, which matters enormously
for a structure sitting in a hot path.

### 3. Mental Model

A deck of cards you keep reshuffling: every time you use a card, you move it to the top of the
deck. When you need to make room for a new card and the deck is full, you discard whatever's at
the very bottom — it's the card you haven't touched in the longest time, by definition of how the
deck has been maintained.

### 4. Basic Implementation

```
struct LRUCache:
    capacity
    map = {}                       # key -> DoublyLinkedListNode, O(1) lookup (§7)
    dll = DoublyLinkedList()        # order = recency; front = most recent, back = least (§3)

function get(cache, key):
    if key not in cache.map:
        return -1
    node = cache.map[key]
    cache.dll.move_to_front(node)   # O(1) -- accessing counts as "just used"
    return node.value

function put(cache, key, value):
    if key in cache.map:
        node = cache.map[key]
        node.value = value
        cache.dll.move_to_front(node)   # O(1)
    else:
        if len(cache.map) >= cache.capacity:
            lru_node = cache.dll.remove_from_back()   # O(1) -- evict least recently used
            del cache.map[lru_node.key]
        new_node = cache.dll.add_to_front(key, value)  # O(1)
        cache.map[key] = new_node
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| get | O(1) |
| put (including eviction) | O(1) |
| Space | O(capacity) |

### 6. Visualization

```
capacity=3. put(1,"a") put(2,"b") put(3,"c"):
front <-> [3] <-> [2] <-> [1] <-> back      (map: {1,2,3})

get(1):  moves 1 to front
front <-> [1] <-> [3] <-> [2] <-> back

put(4,"d"):  cache full -> evict back (2) -> add 4 to front
front <-> [4] <-> [1] <-> [3] <-> back      (map: {1,3,4}; 2 evicted)
```

### 7. Real-World Usage

Nearly every application-level in-process cache (database query result caches, computed-value
memoization layers, CDN edge caches at a conceptual level) uses LRU or an LRU variant as its
default eviction policy — it's the sensible default absent a specific reason to choose something
else. Redis itself supports LRU-style eviction policies for when its own memory limit is reached,
built on ideas closely related to this exact hash-table-plus-linked-list combination (Redis's own
core data-serving structure is covered in §47). Python's `functools.lru_cache` decorator is a
direct, literal implementation of this exact structure for memoizing function results.

### 8. Common Interview Questions

"Design an LRU Cache with O(1) get and put" is one of the most frequently asked system-design-
adjacent coding interview questions across the industry, precisely because it tests whether a
candidate can recognize and correctly combine two already-known structures (hash table + doubly
linked list) rather than needing any new primitive. A common follow-up is "how would you make
this thread-safe" or "how would you extend this to LFU" — testing whether the candidate
understands the mechanism well enough to reason about variations, not just recite the standard
implementation.

### 9. Key Takeaways

- LRU Cache = Hash Table (§7, for O(1) lookup) + Doubly Linked List (§3, for O(1) reordering and
  eviction) — not a new primitive, but the combination is worth knowing cold.
- Both get and put are O(1) precisely because the doubly linked list allows removing and
  re-inserting any node without shifting anything, unlike a singly linked list or array.
- This is one of the single most commonly asked "design a structure" interview questions —
  practice implementing it directly, not just understanding it conceptually.
- LFU is a different, less common eviction policy (frequency-based instead of recency-based) —
  know the distinction exists even without memorizing LFU's more complex implementation.

---
