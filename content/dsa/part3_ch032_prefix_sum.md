## §32. Prefix Sum

### 1. Summary

A prefix sum array precomputes cumulative sums once (O(n)), so any subsequent "sum of elements
from index i to j" query becomes a single subtraction, O(1), instead of re-summing the range
each time. Don't confuse this with Sliding Window (§31) — prefix sum answers arbitrary,
non-contiguous-in-time *range* queries after one upfront pass, while sliding window incrementally
tracks a single moving window; prefix sum is the right tool when many different, arbitrary
ranges need querying, not just one window sliding through.

### 2. Why Does It Exist?

Answering "sum of elements from i to j" naively costs O(j-i) per query — fine once, expensive
if asked repeatedly across many different ranges of the same array. Precomputing cumulative sums
once trades O(n) setup for O(1) per query afterward, a massive win whenever many range-sum
queries hit the same static array.

### 3. Mental Model

A running odometer reading at each mile marker: the distance between mile marker i and mile
marker j is just `reading[j] - reading[i]`, no need to re-measure the road between them. The
prefix sum array is exactly that running odometer, computed once for the whole array.

### 4. Basic Implementation

```
function build_prefix_sum(array):
    prefix = [0] * (len(array) + 1)     # prefix[i] = sum of array[0..i-1]
    for i in range(len(array)):
        prefix[i + 1] = prefix[i] + array[i]
    return prefix

function range_sum(prefix, i, j):        # sum of array[i..j], inclusive
    return prefix[j + 1] - prefix[i]     # O(1), after O(n) build
```

### 5. Time & Space Complexity

| Operation | Naive Re-Sum Each Query | Prefix Sum |
|---|---|---|
| Build | — | O(n) |
| Each range-sum query | O(range length) | O(1) |
| k queries total | O(n·k) worst case | O(n + k) |
| Space | O(1) extra | O(n) extra |

### 6. Visualization

```
array:   [3, 1, 4, 1, 5, 9]
prefix:  [0, 3, 4, 8, 9, 14, 23]        (prefix[i] = sum of first i elements)

range_sum(1, 3): sum of array[1..3] = 1+4+1 = 6
  = prefix[4] - prefix[1] = 9 - 3 = 6   correct, O(1)
```

### 7. Real-World Usage

2D prefix sums (a direct extension) power "sum of any rectangular region" queries in image
processing (integral images, used in real-time face-detection algorithms) and spreadsheet/OLAP-
style aggregate queries over grid data. Difference Arrays (§33) are the exact inverse operation
of prefix sums — applied when the many operations are *updates* to ranges rather than *queries*
of ranges — and the two techniques are often taught as a pair for this reason.

### 8. Common Interview Questions

"Number of subarrays summing to exactly K" combines a prefix sum with a hash table (§7) storing
how many times each prefix-sum value has been seen — if `prefix[j] - prefix[i] == K`, that's
equivalent to checking whether `prefix[j] - K` has been seen before at some earlier index i. Any
"answer many range-sum queries on a static array" question should immediately trigger "build a
prefix sum first" rather than repeatedly summing sub-ranges from scratch.

### 9. Key Takeaways

- Prefix sum trades O(n) upfront computation for O(1) range-sum queries afterward — the right
  tool whenever many arbitrary range queries hit the same static array.
- The core trick for "subarray sum equals K" problems is combining prefix sums with a hash table
  tracking how many times each cumulative value has occurred.
- Difference Arrays (§33) are the mirror-image technique — for many range *updates* instead of
  many range *queries*.
- 2D prefix sums generalize directly to rectangular-region sum queries — the same idea, one
  dimension higher.

---
