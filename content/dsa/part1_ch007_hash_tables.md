## §7. Hash Tables

### 1. Summary

A hash table maps keys to values with average-case O(1) lookup, insert, and delete, by running
each key through a hash function to compute an index into an underlying array (§1), then
resolving any collisions (two keys hashing to the same index) via chaining (a small list per
bucket) or open addressing (probing for the next free slot). Python's `dict` and `set` are both
hash tables. Don't confuse average-case O(1) with guaranteed O(1) — a pathological set of keys
that all collide degrades any hash table to O(n) per operation; this is a real, exploitable
concern (hash-flooding denial-of-service), not just a theoretical footnote.

### 2. Why Does It Exist?

Arrays give O(1) access only if you already have the integer index. Hash tables extend that
O(1) access to arbitrary key types (strings, tuples, custom objects) by computing an index from
the key itself instead of requiring the caller to already know one.

### 3. Mental Model

A wall of labeled cubbyholes. To store "Alice's file," you run "Alice" through a formula that
spits out a cubbyhole number, and put the file there. To retrieve it, you run "Alice" through
the same formula and go straight to that cubbyhole — no searching required, as long as the
formula (hash function) spreads keys evenly and collisions are handled when two names land on
the same cubbyhole.

### 4. Basic Implementation

```
struct HashTable:
    buckets = array of empty lists, size = capacity

function hash(key):
    return some_hash_function(key) % capacity      # index into buckets array

function put(table, key, value):
    index = hash(key)
    for i, (k, v) in enumerate(table.buckets[index]):
        if k == key:
            table.buckets[index][i] = (key, value)  # overwrite existing
            return
    table.buckets[index].append((key, value))       # new entry, chained

function get(table, key):
    index = hash(key)
    for k, v in table.buckets[index]:
        if k == key:
            return v
    raise KeyError
```

### 5. Time & Space Complexity

| Operation | Average Case | Worst Case (pathological collisions) |
|---|---|---|
| Get / Put / Delete | O(1) | O(n) |
| Space | O(n) | O(n) |

### 6. Visualization

```
capacity = 5, hash("cat")=2, hash("dog")=4, hash("owl")=2 (collision with "cat")

buckets: [0] -> []
         [1] -> []
         [2] -> [("cat", 12), ("owl", 7)]   <- chained on collision
         [3] -> []
         [4] -> [("dog", 3)]

Load factor = entries / capacity. Once load factor crosses a threshold (commonly ~0.7),
the table resizes (rehashes every key into a larger array) to keep chains short and
lookups close to O(1) -- this resize is itself O(n), amortized across future inserts,
exactly like dynamic array resizing (§1).
```

### 7. Real-World Usage

Redis (§47) is fundamentally a hash table exposed over the network, with additional structures
(skip lists, etc.) layered on for its richer types. Every language's dictionary/map type
(Python `dict`, Java `HashMap`, JavaScript object/`Map`) is a hash table. Database indexes
sometimes use hash indexes for equality lookups (though B+Trees, §15, dominate for range
queries). Caching layers (in-process LRU caches, §23, and distributed caches like Memcached)
are hash tables at their core. Compilers and interpreters use hash tables for symbol tables —
resolving a variable name to its storage location.

### 8. Common Interview Questions

Any "have I seen this before" or "count occurrences" question is a hash table (or `set`)
application — anagrams, duplicates, frequency counting, "two sum" (store complements seen so
far, O(n) instead of O(n²) nested loop). "Design a cache" almost always means hash table plus
a second structure for eviction order (see LRU Cache, §23, which pairs a hash table with a
doubly linked list, §3). Understanding *why* worst-case is O(n) (collision chains) — and that
Python's `dict` uses open addressing with random probing, partly as a defense against
hash-flooding attacks — is a common deeper follow-up.

### 9. Key Takeaways

- Hash tables give average-case O(1) get/put/delete by computing an array index from the key.
- Worst-case is O(n) under pathological collisions — a real concern (hash-flooding), not purely
  theoretical.
- Load-factor-triggered resizing is the hash-table analogue of dynamic array doubling (§1) —
  amortized O(1) per operation, occasionally O(n) to rehash.
- The "have I seen this" / frequency-counting interview signature almost always means hash table
  or `set` first, before reaching for anything more complex.

---
