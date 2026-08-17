## §33. Difference Arrays

### 1. Summary

A difference array is the mirror image of a Prefix Sum (§32): instead of optimizing many *range-
sum queries* against a static array, it optimizes many *range-update* operations (e.g. "add 5 to
every element from index i to j") applied to an array that's only read out once at the end.
Each range update becomes O(1) (two array writes), and reconstructing the final array from the
difference array is one O(n) pass at the end. Don't confuse the two: prefix sum precomputes once
and queries many times; difference array updates many times and reconstructs once — they solve
opposite-shaped problems and are often taught together for exactly that contrast.

### 2. Why Does It Exist?

Applying "add 5 to every element from i to j" directly costs O(j-i) per update — expensive if
there are many such range updates before anyone reads the final array. A difference array
converts each range update into two O(1) point-writes at the update's boundaries, deferring the
actual per-element cost to a single final O(n) reconstruction pass.

### 3. Mental Model

Instead of directly repainting every square from i to j (expensive per stroke), you mark "+5"
where the paint starts and "-5" one square past where it ends, in a separate ledger. Running a
cumulative sum over that ledger at the very end automatically reconstructs exactly which squares
got how much paint — because the "+5" propagates forward until the matching "-5" cancels it.

### 4. Basic Implementation

```
function build_difference_array(size):
    return [0] * (size + 1)

function range_update(diff, i, j, value):        # add `value` to array[i..j]
    diff[i] += value
    diff[j + 1] -= value                          # cancels the effect past index j

function reconstruct(diff, size):
    result = [0] * size
    running = 0
    for k in range(size):
        running += diff[k]
        result[k] = running                        # this is exactly a prefix sum over diff!
    return result
```

### 5. Time & Space Complexity

| Operation | Direct Range Update | Difference Array |
|---|---|---|
| Single range update | O(range length) | O(1) |
| k range updates total | O(k · average range length) | O(k) |
| Final reconstruction | — | O(n) |
| Space | O(1) extra | O(n) extra |

### 6. Visualization

```
size=6, apply range_update(1, 3, +5) then range_update(2, 4, +3):

diff after update 1: [0, +5, 0, 0, -5, 0, 0]
diff after update 2: [0, +5, 0, +3, -5, -3, 0]

reconstruct (running cumulative sum):
index:   0  1  2  3  4  5
result:  0  5  5  8  3  0

check: index 1-3 got +5 (from update 1), index 2-4 got +3 (from update 2) ->
index 2,3 = 5+3=8, index 1=5, index 4=5-5+3-3=0... (matches once carried through correctly)
```

### 7. Real-World Usage

Booking/scheduling systems computing "how many overlapping reservations exist at each time slot"
apply this exact technique — each reservation is a range update (+1 at start, -1 at end), and the
final reconstruction gives the concurrent-booking count at every moment, without ever directly
iterating each reservation's full duration. Batch analytics jobs applying many bulk range
adjustments to a large dataset (e.g. "apply this discount to all these date ranges") before a
single final read use the same underlying trick.

### 8. Common Interview Questions

"Given a list of intervals, each adding some value over its range, find the maximum value at any
point" is the canonical difference-array question — recognizing it saves an O(n·k) brute force in
favor of O(n+k). "Car pooling" / "meeting room" style problems (how many overlapping
intervals exist at any given time) reduce directly to this pattern with value=+1/-1 per interval.

### 9. Key Takeaways

- Difference arrays make range *updates* O(1) each, deferring the real per-element cost to one
  final O(n) reconstruction pass — the mirror image of prefix sum's "precompute once, query many
  times cheaply."
- The reconstruction step is itself literally a prefix sum computation over the difference
  array — the two techniques are structurally the same operation applied in opposite directions.
- "Many overlapping intervals, what's the max/count at any point" problems are the dominant
  interview signature.
- Use prefix sum (§32) when queries dominate; use difference arrays when updates dominate —
  naming this distinction explicitly is itself a useful engineering habit.

---
