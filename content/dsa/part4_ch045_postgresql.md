## §45. PostgreSQL: How B+Trees, Heaps & MVCC Find Your Row

### 1. Decision Snapshot

PostgreSQL finds your row by combining three structures: a **B+Tree** (§15) index mapping key
values to row locations, a **heap** (in the database sense — an unordered pile of row data, not
the priority-queue Heap of §16) storing the actual row data separately from any index, and
**MVCC** (Multi-Version Concurrency Control) keeping multiple row versions alive simultaneously
so readers never block writers.

### 2. The Problem This System Had to Solve

A database needs fast lookups by arbitrary column, needs many concurrent readers and writers to
not block each other, and needs to support `UPDATE`/`DELETE` without physically rewriting data
in place. No single structure from Parts I-III solves all three; Postgres's design is specifically
the combination that does.

### 3. Which Structures It Uses, and Why

The **heap** is where row data physically lives — a append-mostly pile of pages, not sorted by
any column. A B+Tree **index** on a column stores sorted keys, each pointing to a location in the
heap (a "tuple ID," not the data itself) — this is precisely the leaf-nodes-store-pointers
design from §15, and it's why Postgres indexes are sometimes called "secondary" — the index
doesn't hold data, it holds directions to data. Crucially, `UPDATE` in Postgres doesn't modify a
row in place — MVCC writes a brand-new row version (a new heap tuple) with a fresh transaction
ID, and marks the old version invisible to future transactions once nothing needs it — this is
why "why is my table bloated after lots of updates" is a real, common Postgres operational
question (`VACUUM` reclaims those dead row versions). Every index pointing at an updated row
must also be updated to reference the new tuple location — this is the concrete cost behind "why
do too many indexes slow down writes."

### 4. Simplified Architecture Diagram

```
Query: SELECT * FROM users WHERE email = 'a@x.com'

        B+Tree index on `email`             Heap (row data, unordered pages)
        (§15 -- leaves hold tuple IDs)       +------------------------------+
              [ ... | a@x.com -> TID(3,7) ]  | Page 0: [row5][row12]...     |
                          |                  | Page 3: [row9][row_at_7]...  |
                          +----------------->| Page 7: ...                  |
                                              +------------------------------+
        1. Binary-search-within-node down the B+Tree, O(log_M n)
        2. Follow the tuple ID pointer straight to the heap page -- one more read
        3. MVCC visibility check: is this row version visible to my transaction?
```

### 5. What This Teaches You in General

Separating "where is the data" (heap) from "how do I find it fast" (index) is a recurring
systems pattern — it's what lets you add or drop indexes without touching the underlying data at
all. MVCC's "never overwrite, always version, clean up later" approach is the same philosophical
family as an LSM Tree's (§25) "never modify in place, compact later" — both trade some read/space
overhead for avoiding blocking, in-place-mutation costs, just applied to different problems
(concurrency vs. write throughput).

### 6. Interview Questions This Connects To

"Why does adding many indexes slow down writes in Postgres" — every index needs its own update
on every row change. "What is MVCC and why does it mean readers never block writers" — because
readers see a consistent past snapshot via old row versions, while writers create new ones
without touching what readers are currently looking at. "Why would a Postgres table need
`VACUUM`" — dead row versions from MVCC updates/deletes accumulate until reclaimed. "B+Tree index
vs. table scan" ties directly back to §28's searching-fundamentals triage.

### 7. Key Takeaways

- Postgres separates row storage (heap) from lookup structure (B+Tree index, §15) — indexes
  store pointers to data, not the data itself.
- MVCC creates new row versions instead of overwriting in place, which is why readers never block
  writers, and why `VACUUM` exists to clean up old versions afterward.
- Every index on a table adds real write-side cost — a direct, practical consequence of this
  architecture, not an arbitrary rule of thumb.
- Compare directly against §46 (MySQL/InnoDB) — same B+Tree foundation, meaningfully different
  storage model.

---
