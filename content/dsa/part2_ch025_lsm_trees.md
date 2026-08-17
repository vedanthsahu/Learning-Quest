## §25. LSM Trees (Log-Structured Merge Trees)

### 1. Summary

An LSM Tree is a write-optimized storage structure: writes always go to an in-memory buffer
(the "memtable," often backed by a Skip List, §21) plus an append-only on-disk write-ahead log,
never modifying existing on-disk files in place. Once the memtable fills up, it's flushed to disk
as a new, immutable, sorted file (an SSTable), and a background process periodically merges
("compacts") multiple SSTables into fewer, larger ones. Don't confuse an LSM Tree with a B+Tree
(§15) — a B+Tree updates data in place (find the right page, modify it directly), which is
read-optimized; an LSM Tree never modifies existing files, which is write-optimized, at the cost
of reads sometimes needing to check multiple SSTables plus the memtable.

### 2. Why Does It Exist?

B+Trees update in place, which means every write is a random-access disk operation (seek to the
right page, modify, write back) — expensive, especially on spinning disks, and still non-trivial
even on SSDs at very high write volume. An LSM Tree converts random writes into sequential writes
(append to a log, periodically flush a sorted batch) — sequential I/O is dramatically faster than
random I/O on virtually all storage media, which is the entire point.

### 3. Mental Model

Think of an LSM Tree like a "write everything down first, organize it later" filing system: new
paperwork always goes on top of the in-tray (memtable) and into a running notebook (write-ahead
log, for crash recovery) rather than being filed away immediately. Periodically, someone empties
the full in-tray into a new labeled folder (an SSTable) and, separately and lazily, merges old
folders together to reduce clutter (compaction) — but nothing already filed is ever edited in
place.

### 4. Basic Implementation (conceptual)

```
function write(key, value):
    append_to_write_ahead_log(key, value)     # durability first, sequential append -- fast
    memtable.insert(key, value)               # in-memory, sorted (e.g. skip list, §21)
    if memtable.size >= threshold:
        flush_memtable_to_new_sstable()       # write out as one new sorted, immutable file
        memtable.clear()

function read(key):
    if key in memtable:
        return memtable[key]                   # newest data checked first
    for sstable in sstables_newest_to_oldest:   # each SSTable checked in recency order
        if bloom_filter[sstable].might_contain(key):   # §22 -- skip the disk read if "no"
            result = sstable.lookup(key)
            if result is not None:
                return result
    return not_found

function compaction():                          # background process
    merge several older SSTables into one larger, sorted SSTable
    discard overwritten/deleted keys found during the merge
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Write | O(log n) into memtable, but effectively O(1) amortized disk cost (sequential append) |
| Read (best case: in memtable) | O(log n) |
| Read (worst case: must check several SSTables) | O(k log n), k = number of SSTables checked
  — mitigated heavily by Bloom Filters (§22) skipping SSTables that definitely don't have the key |
| Space | O(n), with temporary overhead during compaction |

### 6. Visualization

```
Write path:                          Read path (key not in memtable):
 write --> [WAL log] (sequential)     memtable (miss)
       --> [memtable] (in-memory)        |
              | (fills up)               v
              v                     SSTable_3 (newest) -- bloom filter says "maybe" -> check disk
        [SSTable_1] (new, on disk)       |  (not found)
                                          v
Compaction (background, lazy):      SSTable_2 -- bloom filter says "definitely not" -> SKIP disk read
 [SSTable_1] + [SSTable_2]               |
        -> merged, sorted            v
        -> [SSTable_merged]      SSTable_1 (oldest) -- checked, found
```

### 7. Real-World Usage

**Cassandra, RocksDB, LevelDB, and Google BigTable** all use LSM Trees as their core storage
engine — this is the direct architectural reason these systems handle extremely high write
throughput well, at the cost of reads sometimes needing to check multiple SSTables (mitigated by
Bloom Filters, §22, and the memtable acting as a skip list, §21). See §52 for the full Cassandra
story combining LSM Trees, Bloom Filters, and Consistent Hashing (§24) together. This is precisely
why "which database for a write-heavy workload" interview and design discussions often converge
on an LSM-based store over a B+Tree-based relational database.

### 8. Common Interview Questions

"Why would you choose Cassandra/RocksDB over PostgreSQL for a write-heavy workload" is the direct
question this chapter answers — LSM Trees convert random writes to sequential writes, at the cost
of read amplification (checking multiple files), whereas B+Trees (§15) do the opposite tradeoff.
"What is write amplification / read amplification / space amplification" are the three standard
axes used to compare LSM Tree tuning choices, worth knowing by name even without deriving the
exact formulas. "Why do LSM Trees need compaction" tests understanding that without it, reads
would need to check an ever-growing number of SSTables indefinitely.

### 9. Key Takeaways

- LSM Trees convert random writes into sequential writes (append to memtable + WAL, flush
  periodically) — the direct opposite optimization target from a B+Tree's in-place updates.
- Reads may need to check the memtable plus multiple on-disk SSTables, newest-first — a real
  cost, heavily mitigated in practice by per-SSTable Bloom Filters (§22).
- Compaction periodically merges SSTables in the background to bound read cost and reclaim space
  from overwritten/deleted keys.
- Cassandra, RocksDB, LevelDB, and BigTable (§52) are the systems to name directly when this
  structure comes up — it is a genuinely load-bearing, widely-deployed design, not a rare edge case.

---
