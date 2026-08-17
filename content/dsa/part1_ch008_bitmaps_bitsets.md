## §8. Bitmaps & Bitsets

### 1. Summary

A bitmap (or bitset) represents a set of small non-negative integers, or a collection of boolean
flags, as individual bits packed into an integer or byte array — bit `i` set to 1 means "i is
present" or "flag i is true." Don't confuse a bitmap with a Bloom Filter (§22) — a bitset stores
exact membership for a known, bounded range of integers with zero false positives, while a Bloom
Filter trades exactness for the ability to represent an unbounded set of arbitrary items in much
less space.

### 2. Why Does It Exist?

Storing a set of booleans as, say, a Python list of `True`/`False` values or a `set` of integers
costs far more memory per element than the single bit that's actually needed. A bitmap packs 8
flags into a single byte, and modern CPUs can operate on 64 bits (a whole machine word) in a
single instruction — making bitwise AND/OR/XOR across a bitmap extremely fast, both in space and
in raw operation count.

### 3. Mental Model

A row of light switches, each either on or off, where the whole row can be flipped, compared, or
combined with another row's switches (AND, OR, XOR) in one motion rather than one switch at a
time. Checking whether switch 47 is on is a single bit-extraction operation, not a search.

### 4. Basic Implementation

```
function set_bit(bitmap, i):
    bitmap = bitmap | (1 << i)              # OR-in a 1 at position i

function clear_bit(bitmap, i):
    bitmap = bitmap & ~(1 << i)             # AND with all-1s except position i

function test_bit(bitmap, i):
    return (bitmap >> i) & 1 == 1           # shift bit i down, mask with 1

function union(a, b):      return a | b     # set union in one instruction
function intersect(a, b):  return a & b     # set intersection in one instruction
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Set / clear / test a bit | O(1) |
| Union / intersection / difference of two bitmaps | O(n/64) — one machine word at a time |
| Space for n boolean flags | O(n) bits = n/8 bytes, vs. O(n) *objects* for a naive list/set |

### 6. Visualization

```
Set {1, 3, 4} represented as an 8-bit bitmap (bit i = element i present):

bit index:  7 6 5 4 3 2 1 0
value:      0 0 0 1 1 0 1 0     = 0b00011010 = 26

union with {2, 4}  (0b00010100):
  00011010
| 00010100
----------
  00011110   = {1, 2, 3, 4}

intersection with {2, 4}:
  00011010
& 00010100
----------
  00010000   = {4}
```

### 7. Real-World Usage

Database engines use bitmap indexes for low-cardinality columns (e.g. a "status" column with
five possible values) where a bitmap per value, combined with fast AND/OR, answers multi-column
filter queries efficiently. Redis's native `BITCOUNT`/`SETBIT`/`GETBIT` commands expose bitmaps
directly for use cases like tracking daily active users (one bit per user ID per day, unioned
across days to get weekly actives). Operating-system memory allocators use bitmaps to track
which physical pages are free. Bloom Filters (§22) are themselves built on top of a bitset, with
multiple hash functions setting multiple bits per inserted item.

### 8. Common Interview Questions

"Find the missing number in a range" and similar problems can often be solved with XOR tricks
(XOR-ing all present numbers against all expected numbers cancels matching pairs, leaving the
missing one) — a bitwise-thinking signature. "Track which of N flags/features are enabled" for
a fixed, small N is a direct bitmask application, and "count set bits" (`bin(x).count("1")` in
Python, or `popcount`) appears often enough to be worth recognizing by name. Bitmask-based
dynamic programming (representing "which subset of items has been used" as an integer) is a
recognizable, if more advanced, DP-plus-bitmap combination (see §37 Dynamic Programming).

### 9. Key Takeaways

- Bitmaps pack one bit per flag/element, giving dramatic space savings over a list/set of
  objects, and let set operations (union, intersection) run in O(n/64) via native word-size
  bitwise instructions.
- Bitsets are exact (no false positives) but only practical for a bounded, known integer range —
  unlike Bloom Filters, which trade exactness for unbounded-item support in fixed space.
- XOR-based tricks (missing number, single non-duplicate) are the most common bitwise interview
  pattern.
- Bitmask DP (subset-as-integer) is a recognizable advanced combination worth knowing by name
  even without memorizing every variant.

---
