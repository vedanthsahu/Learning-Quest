## §47. Redis: Hash Tables, Skip Lists & Sorted Sets

### 1. Decision Snapshot

Redis is, at its core, a network-accessible Hash Table (§7) mapping keys to values — but its
richer types layer additional structures on top: Sorted Sets (`ZSET`) are backed by a Skip List
(§21) paired with a hash table; Lists are backed by a doubly linked list-like structure; and
Redis's own bitmap commands expose Bitsets (§8) directly.

### 2. The Problem This System Had to Solve

An in-memory data store needs O(1)-ish access for the common case (plain key-value) but also
needs to support ordered operations (rank queries, range-by-score) for its richer types, without
paying a balanced-tree's rotation complexity — the same tradeoff §21 discusses in the abstract.

### 3. Which Structures It Uses, and Why

The base `GET`/`SET` commands operate on a straightforward hash table (§7) — average O(1), which
is the entire reason Redis is used as a cache in the first place. `ZADD`/`ZRANGE`/`ZRANK` on a
Sorted Set need to answer "give me the top N by score" and "what's this member's rank" — a plain
hash table can't do either efficiently, so Redis backs `ZSET` with a **skip list** (§21) for
ordered range/rank operations, paired with a **hash table** for O(1) "does this member exist,
what's its score" lookups — the same member is reachable through both structures simultaneously,
each optimized for a different access pattern. Redis chose skip lists specifically over a
balanced tree here because the implementation is considerably simpler to get correct, and Redis's
single-threaded execution model (per event loop) means the concurrent-access advantages of skip
lists matter less than raw implementation simplicity — still a deliberate, informed choice, not
an accident.

### 4. Simplified Architecture Diagram

```
ZADD leaderboard 100 "alice"   ZADD leaderboard 250 "bob"

  Hash Table (member -> score, O(1) lookup)      Skip List (score-ordered, §21)
    "alice" -> 100                                 100 -> "alice"
    "bob"   -> 250                                 250 -> "bob"     <- ranked/range queries here

ZSCORE leaderboard "alice"  -> hash table lookup, O(1)
ZRANGE leaderboard 0 -1 WITHSCORES (in score order) -> walk the skip list, O(log n) to start
ZRANK leaderboard "bob"     -> skip list position lookup, O(log n)
```

### 5. What This Teaches You in General

A single logical object (a Redis key) is often backed by *more than one* underlying structure
simultaneously, each serving a different access pattern the same data needs to support — this
same "one dataset, multiple indexes optimized for different queries" idea recurs throughout this
book (compare to Postgres's heap-plus-B+Tree-indexes, §45). It's also a direct, real-world
illustration of §21's abstract claim that skip lists are chosen in practice specifically for
implementation simplicity over balanced trees.

### 6. Interview Questions This Connects To

"How would you implement a leaderboard with fast rank queries" is directly answered by "hash
table + skip list, i.e., what Redis Sorted Sets already do" — naming this is a strong, concrete
interview answer. "Why does Redis use a skip list instead of a balanced tree for Sorted Sets"
ties directly back to §21's design-tradeoff discussion. "Redis vs. Memcached" often turns on
exactly this point — Redis's richer types (built from these additional structures) versus
Memcached's simpler pure-key-value model.

### 7. Key Takeaways

- Redis's base key-value store is a hash table (§7); its richer types layer additional
  structures on top for the access patterns plain hashing can't serve.
- Sorted Sets specifically combine a skip list (§21, for ordered range/rank queries) with a hash
  table (for O(1) score lookups) — the same data reachable via two different structures at once.
- This is the concrete, real-world validation of §21's claim that skip lists are chosen for
  implementation simplicity, not because they're theoretically superior to balanced trees.
- "One dataset, multiple structures for multiple access patterns" is a recurring systems design
  idea — see also §45's Postgres heap-plus-index separation.

---
