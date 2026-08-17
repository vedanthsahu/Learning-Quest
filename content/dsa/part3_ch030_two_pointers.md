## §30. Two Pointers

### 1. Summary

Two Pointers is a technique for scanning a sequence with two indices moving through it —
sometimes from opposite ends inward, sometimes both from the same end at different speeds —
instead of nested loops, turning an O(n²) brute force into O(n). Don't confuse this with Sliding
Window (§31) — two pointers often move independently and can cross or meet, while a sliding
window specifically maintains a contiguous *range* between two pointers, growing and shrinking
it; the two techniques frequently look similar in code but answer conceptually different
questions.

### 2. Why Does It Exist?

Many problems on sorted (or sortable) sequences involve pairs or triples of elements satisfying
some condition (sum, difference). A brute-force nested loop checks every pair, O(n²). If the data
is sorted, moving two pointers inward based on whether the current pair's value is too high or
too low eliminates whole ranges of candidates per step, the same halving-style logic as binary
search (§29) but applied across a moving pair instead of a single midpoint.

### 3. Mental Model

Two people starting at opposite ends of a sorted line of numbers, walking toward each other:
if their combined value is too small, the person at the low end steps up; if too large, the
person at the high end steps down. Because the array is sorted, each step provably rules out an
entire set of pairs that couldn't possibly be the answer.

### 4. Basic Implementation

```
function two_sum_sorted(sorted_array, target):
    left, right = 0, len(sorted_array) - 1
    while left < right:
        current_sum = sorted_array[left] + sorted_array[right]
        if current_sum == target:
            return (left, right)
        elif current_sum < target:
            left += 1                   # need a bigger sum -> move the low pointer up
        else:
            right -= 1                  # need a smaller sum -> move the high pointer down
    return None

function remove_duplicates_in_place(sorted_array):    # same-direction two pointers
    write = 1
    for read in range(1, len(sorted_array)):
        if sorted_array[read] != sorted_array[write - 1]:
            sorted_array[write] = sorted_array[read]
            write += 1
    return write                        # new length, no duplicates
```

### 5. Time & Space Complexity

| Problem Type | Brute Force | Two Pointers |
|---|---|---|
| Pair sum in sorted array | O(n²) | O(n) |
| Remove duplicates in place | O(n²) (shifting) | O(n) |
| Container with most water | O(n²) | O(n) |
| Space | — | O(1) extra |

### 6. Visualization

```
two_sum_sorted([2,7,11,15,20], target=26):

left=0(2) right=4(20): sum=22 < 26 -> move left up
left=1(7) right=4(20): sum=27 > 26 -> move right down
left=1(7) right=3(15): sum=22 < 26 -> move left up
left=2(11) right=3(15): sum=26 == 26 -> FOUND

4 comparisons instead of checking all 10 possible pairs.
```

### 7. Real-World Usage

Merge step of merge sort (§34) uses two pointers, one per input array, advancing whichever
points to the smaller current element. Deduplication passes over sorted log data or sorted
database result sets use the same-direction two-pointer pattern shown above. Comparing two
sorted lists for differences (a simpler, non-hashed analogue of the Merkle Tree comparison idea
in §26) is a direct two-pointer application.

### 8. Common Interview Questions

Any "pair/triple summing to a target in sorted data" question (Two Sum II, 3Sum, Container With
Most Water) is a two-pointer signature — the precondition is sortedness (or the ability to sort
first cheaply). "Remove duplicates from sorted array in place" and "partition an array around a
pivot" use the same-direction (read/write pointer) variant rather than the opposite-ends variant
— recognizing which of the two sub-patterns applies is part of the skill.

### 9. Key Takeaways

- Two pointers turns an O(n²) brute force into O(n) by exploiting sortedness to safely eliminate
  ranges of candidate pairs per step — the precondition is the data being sorted (or cheaply
  sortable).
- There are two distinct sub-patterns: opposite-ends-converging (pair-sum style) and same-
  direction-different-speeds (in-place deduplication/partitioning style) — recognize which fits.
- Don't confuse this with Sliding Window (§31) — two pointers don't necessarily maintain a
  contiguous range the way a sliding window explicitly does.
- Merge sort's merge step (§34) is a direct, load-bearing real-world use of this exact pattern.

---
