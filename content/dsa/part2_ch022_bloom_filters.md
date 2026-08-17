## §22. Bloom Filters

### 1. Summary

A Bloom Filter is a probabilistic set-membership structure: a fixed-size bitmap (§8) plus k
independent hash functions. To insert an item, hash it k ways and set those k bit positions; to
check membership, hash it the same k ways and check whether *all* k bits are set. It can answer
"definitely not present" with certainty, but "possibly present" only probabilistically — false
positives are possible, false negatives are not. Don't confuse this with a plain Bitmap (§8) — a
bitmap gives exact membership for a bounded integer range; a Bloom Filter trades that exactness
for the ability to represent an unbounded set of arbitrary items (strings, objects, anything
hashable) in a small, fixed amount of memory.

### 2. Why Does It Exist?

Checking "have I seen this before" against a truly massive set (billions of items) with an exact
structure (hash table or on-disk lookup) costs real memory or a real disk read per check. A Bloom
Filter answers the same question using a small, fixed, in-memory bitmap — accepting a tunable,
small false-positive rate in exchange for avoiding that expensive exact lookup for the vast
majority of "definitely not present" cases.

### 3. Mental Model

Think of k different, independent light switches for every item you insert. To check "have I
seen this," flip on the same k switches for that item's hash values and see if they were already
all on. If even one is off, you're certain it's new. If all are on, it's *probably* something
you've seen before — but another item (or combination of items) might have coincidentally set
those exact same switches on its own.

### 4. Basic Implementation

```
struct BloomFilter:
    bitmap = [0] * m                 # m-bit array, see §8
    k = number_of_hash_functions

function add(bf, item):
    for i in range(bf.k):
        index = hash_i(item, i) % m   # k independent hash functions
        bf.bitmap[index] = 1

function might_contain(bf, item):
    for i in range(bf.k):
        index = hash_i(item, i) % m
        if bf.bitmap[index] == 0:
            return False               # definitely not present -- no false negatives, ever
    return True                        # probably present -- but could be a false positive
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Insert | O(k) |
| Membership check | O(k) |
| Space | O(m) bits, independent of the number of distinct items stored -- a fixed,
  tunable budget |

False-positive rate is tunable by choosing m (bitmap size) and k (number of hash functions)
relative to the expected number of inserted items — more bits and hash functions, lower false-
positive rate, larger fixed memory cost.

### 6. Visualization

```
m=10 bits, k=3 hash functions. Insert "apple": hashes to bits 1, 4, 7.

bit index:  0 1 2 3 4 5 6 7 8 9
value:      0 1 0 0 1 0 0 1 0 0

might_contain("apple")? check bits 1,4,7 -- all set -> "probably yes"
might_contain("banana")? hashes to bits 2,4,9 -- bit 2 is 0 -> "definitely no", immediately
might_contain("grape")?  hashes to bits 1,4,7 (coincidence) -- all set -> "probably yes"
                          (FALSE POSITIVE -- grape was never actually inserted)
```

### 7. Real-World Usage

**Cassandra, BigTable, and RocksDB** all use Bloom Filters to avoid unnecessary disk reads: before
checking whether a key exists in a given on-disk SSTable (part of an LSM Tree, §25), the storage
engine first checks that SSTable's in-memory Bloom Filter — if it says "definitely not present,"
the expensive disk read is skipped entirely; only a "probably present" result triggers the real
lookup (see §52 for the full Cassandra story). Web browsers have used Bloom Filters to check URLs
against a locally-cached blocklist without downloading the entire full list. CDNs use them to
avoid caching one-hit-wonder content.

### 8. Common Interview Questions

"Design a system to check if a URL has been seen before, at massive scale, without storing every
URL" is the canonical Bloom Filter question — the answer hinges on accepting a small false-
positive rate in exchange for enormous space savings. "Why can't a Bloom Filter have false
negatives but can have false positives" tests real understanding of the mechanism (a bit can be
set by *any* item's hash — including items other than the one you're checking — but a bit that's
never been set could never have been contributed by an item you actually inserted). Knowing that
items cannot be deleted from a standard Bloom Filter (clearing a bit might break another item's
membership check) is a common, easily-missed follow-up.

### 9. Key Takeaways

- Bloom Filters trade exactness for enormous space savings: no false negatives ever, a tunable
  small rate of false positives, fixed memory regardless of how many items are logically stored.
- The mechanism is k hash functions setting/checking k bits in a shared bitmap (§8) — false
  positives arise from bit collisions across different items, not from any single item's hash
  being wrong.
- Cassandra/RocksDB/BigTable's "skip the disk read if the Bloom Filter says no" pattern is the
  single most important real-world deployment to know by name (§52).
- Standard Bloom Filters don't support deletion — a real, practical limitation worth mentioning
  when the structure comes up.

---
