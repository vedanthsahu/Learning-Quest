## §29. Binary Search

### 1. Summary

Binary search finds a target in a sorted array in O(log n) by repeatedly comparing the target to
the middle element and discarding the half that can't possibly contain it. Don't confuse binary
search with a Binary Search Tree (§11) — binary search is an *algorithm* operating on a sorted
array; a BST is a *data structure* that maintains the same halving property dynamically as data
changes. Binary search requires the data to already be sorted and support O(1) random access
(true of arrays, false of linked lists, §3) — that combination of preconditions is the entire
reason it isn't the universal default.

### 2. Why Does It Exist?

A linear scan is O(n) regardless of order. Once data is sorted, each comparison against the
middle element can eliminate half of the remaining candidates — a property no unsorted structure
offers. This turns O(n) into O(log n), which for a billion elements is the difference between a
billion comparisons and about 30.

### 3. Mental Model

Guessing a number between 1 and 100 with only "higher" or "lower" feedback: guess 50, get told
"higher," guess 75, and so on — each guess halves the remaining range. That's the entire
algorithm; everything else is implementation bookkeeping (off-by-one boundaries).

### 4. Basic Implementation

```
function binary_search(sorted_array, target):
    low, high = 0, len(sorted_array) - 1
    while low <= high:
        mid = low + (high - low) // 2        # avoids overflow vs. (low+high)//2 in some languages
        if sorted_array[mid] == target:
            return mid
        elif sorted_array[mid] < target:
            low = mid + 1                     # discard the left half
        else:
            high = mid - 1                    # discard the right half
    return -1                                  # not found
```

### 5. Time & Space Complexity

| Variant | Time | Space |
|---|---|---|
| Iterative binary search | O(log n) | O(1) |
| Recursive binary search | O(log n) | O(log n) — call stack depth |

### 6. Visualization

```
Search for 23 in [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]:

low=0, high=9, mid=4 -> value 16 < 23 -> discard left half, low=5
low=5, high=9, mid=7 -> value 56 > 23 -> discard right half, high=6
low=5, high=6, mid=5 -> value 23 == 23 -> FOUND at index 5

3 comparisons for 10 elements; would be up to 10 for a linear scan.
```

### 7. Real-World Usage

Database B+Tree indexes (§15) use binary search *within* each node (which holds a sorted array
of keys) to decide which child to descend into — binary search is the micro-level mechanism
inside the macro-level tree structure. `bisect` in Python's standard library, and equivalent
"lower_bound"/"upper_bound" functions in other languages, are direct binary search
implementations used constantly for maintaining sorted collections and answering range questions
efficiently.

### 8. Common Interview Questions

The classic binary search bugs are boundary conditions — `low <= high` vs `low < high`, and
whether to set `high = mid` or `high = mid - 1` — getting these right consistently under
interview pressure is itself the tested skill, more than understanding the halving concept.
"Binary search on the answer" — where the array being searched is implicit (e.g. "find the
minimum capacity such that X is possible," binary searching over possible capacity values rather
than array indices) is a more advanced but very common variant: recognize it whenever a problem
asks for the minimum/maximum value satisfying a monotonic condition. "Search in a rotated sorted
array" tests whether you can adapt the halving logic when the simple "is target bigger or
smaller than mid" comparison needs an extra case to handle the rotation point.

### 9. Key Takeaways

- Binary search requires sorted, randomly-accessible data — without both preconditions, it either
  doesn't work correctly or doesn't achieve O(log n).
- Boundary-condition bugs (`<=` vs `<`, `mid` vs `mid±1`) are the most common source of incorrect
  binary search implementations — practice these until they're automatic.
- "Binary search on the answer" — searching over a space of possible answers rather than array
  indices — is a distinct, powerful pattern worth recognizing by its own signature: a monotonic
  yes/no condition over a range of candidate values.
- This is the micro-mechanism inside every B+Tree node lookup (§15) — not just a standalone
  array algorithm.

---
