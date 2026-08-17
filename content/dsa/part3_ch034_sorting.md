## §34. Sorting

### 1. Summary

Sorting arranges elements into order, and the practical decision is rarely "implement a sort from
scratch" — Python's built-in `sorted()`/`list.sort()` (Timsort, a hybrid of merge sort and
insertion sort) is almost always the right call in real code. What matters for engineering
judgment is knowing the comparison-based family (quicksort, merge sort, heapsort — all O(n log n)
average, differing in stability, space, and worst-case behavior) versus the non-comparison family
(counting sort, radix sort — O(n) or O(n+k), but only for specific input shapes like small-range
integers). Don't confuse "stable" (equal elements keep their relative input order) with "in-
place" (O(1) extra space) — these are independent properties, and different sorts trade them off
differently.

### 2. Why Does It Exist?

Sorted data unlocks binary search (§29), two pointers (§30), and efficient merge/dedup
operations — sorting is very often the enabling first step for a faster algorithm downstream, not
an end in itself.

### 3. Mental Model

Merge sort: split the deck in half repeatedly until each pile has one card, then merge sorted
piles back together two at a time — the "merge" step is exactly the two-pointer technique from
§30. Quicksort: pick a pivot, partition everything smaller to one side and larger to the other,
recurse on each side — expected O(n log n) but with an O(n²) worst case on an unlucky/adversarial
pivot choice (mitigated in practice by randomized pivot selection).

### 4. Basic Implementation

```
function merge_sort(array):
    if len(array) <= 1: return array
    mid = len(array) // 2
    left = merge_sort(array[:mid])
    right = merge_sort(array[mid:])
    return merge(left, right)              # two-pointer merge, §30

function merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:             # <= (not <) keeps it STABLE
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:]); result.extend(right[j:])
    return result

function quicksort(array, low, high):
    if low < high:
        pivot_index = partition(array, low, high)     # random pivot recommended
        quicksort(array, low, pivot_index - 1)
        quicksort(array, pivot_index + 1, high)

function counting_sort(array, max_value):               # only for small-range non-negative ints
    counts = [0] * (max_value + 1)
    for x in array: counts[x] += 1
    result = []
    for value, count in enumerate(counts):
        result.extend([value] * count)
    return result
```

### 5. Time & Space Complexity

| Algorithm | Average | Worst Case | Space | Stable? | In-Place? |
|---|---|---|---|---|---|
| Merge Sort | O(n log n) | O(n log n) | O(n) | Yes | No |
| Quicksort | O(n log n) | O(n²) | O(log n) | No | Yes |
| Heapsort (§16 heap-based) | O(n log n) | O(n log n) | O(1) | No | Yes |
| Counting Sort | O(n + k) | O(n + k) | O(k) | Yes | No |
| Timsort (Python's built-in) | O(n log n) | O(n log n) | O(n) | Yes | No |

k = range of input values (counting sort only applies when this is small/bounded).

### 6. Visualization

```
Merge sort splitting and merging [5,2,8,1]:

split:    [5,2] [8,1]
split:    [5][2] [8][1]
merge:    [2,5]  [1,8]
merge:    [1,2,5,8]

Quicksort partitioning around pivot=5 on [5,2,8,1,9]:
  < 5: [2,1]   pivot: [5]   > 5: [8,9]
  recurse into each side independently
```

### 7. Real-World Usage

Python's `sorted()` uses Timsort specifically because real-world data is very often partially
sorted already, and Timsort detects and exploits existing runs of order, giving better-than-
O(n log n) practical performance on such data while still guaranteeing O(n log n) worst case and
full stability. Database `ORDER BY` clauses use external merge-sort variants when data doesn't
fit in memory — merge sort's sequential-access pattern (as opposed to quicksort's random-access
partitioning) is exactly what makes it adaptable to disk-backed sorting.

### 8. Common Interview Questions

"Implement merge sort or quicksort from memory" tests basic algorithmic fluency, but the more
valuable interview signal is knowing *when* to reach for something other than "just call
sorted()" — e.g., recognizing that a small, bounded range of integer keys makes counting sort an
O(n) option instead of O(n log n). "Why is quicksort's worst case O(n²) and how is it mitigated"
(random pivot selection, or median-of-three) is a common, revealing follow-up. Knowing that
stability matters when sorting by a secondary key after already having sorted by a primary key is
a frequently-missed practical detail.

### 9. Key Takeaways

- In real code, use the language's built-in sort (Timsort in Python) — understand the
  comparison-based family's tradeoffs (stability, space, worst-case) rather than hand-rolling one.
- Merge sort's merge step is literally the two-pointer technique from §30 — these chapters are
  not unrelated.
- Counting/radix sort achieve O(n) but only for specific input shapes (small-range integers) —
  know this as a targeted exception, not a general-purpose replacement for comparison sorts.
- Stability matters specifically when a secondary sort must preserve a prior sort's relative
  order — a detail worth naming explicitly when it's relevant.

---
