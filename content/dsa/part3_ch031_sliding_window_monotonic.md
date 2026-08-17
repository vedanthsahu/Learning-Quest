## §31. Sliding Window (& Monotonic Stack/Queue)

### 1. Summary

Sliding Window maintains a contiguous range `[left, right]` over an array or string, expanding
`right` to include more elements and shrinking `left` to exclude them, to find the best/valid
window without re-scanning from scratch each time — turning an O(n²) or O(n·k) brute force into
O(n). This chapter also covers the **monotonic deque** pattern (a deque, §6, kept in strictly
increasing or decreasing order), which is specifically the technique for sliding-window
maximum/minimum problems. Don't confuse Sliding Window with Two Pointers (§30) — a sliding window
specifically tracks a contiguous range with a notion of "currently valid" that updates
incrementally; two pointers more generally can move independently without maintaining a single
coherent range.

### 2. Why Does It Exist?

"Find the best contiguous subarray/substring satisfying some condition" naively means checking
every possible window, O(n²) or worse. If a window's validity or value can be updated
incrementally as one element enters and one leaves — rather than recomputed from scratch — the
whole scan collapses to O(n).

### 3. Mental Model

A physical window sliding along a strip of paper: as it slides right, one new character enters on
the right edge and, if the window needs to shrink, one character leaves on the left edge. As long
as you can cheaply update "is this window still valid" incrementally (add one, remove one) rather
than re-checking the whole window's contents, the sliding is O(1) amortized per step.

### 4. Basic Implementation

```
function longest_substring_without_repeats(s):            # variable-size window
    seen = {}                            # char -> most recent index (hash table, §7)
    left = 0
    best = 0
    for right in range(len(s)):
        if s[right] in seen and seen[s[right]] >= left:
            left = seen[s[right]] + 1     # shrink window past the repeat
        seen[s[right]] = right
        best = max(best, right - left + 1)
    return best

function sliding_window_maximum(nums, k):     # monotonic deque, §6
    dq = Deque()                         # stores INDICES, kept in decreasing value order
    result = []
    for i, num in enumerate(nums):
        while dq and nums[dq.back()] < num:
            dq.pop_back()                 # remove indices whose values are now useless
        dq.push_back(i)
        if dq.front() <= i - k:
            dq.pop_front()                 # index has fallen out of the window
        if i >= k - 1:
            result.append(nums[dq.front()])   # front is always the current window's max
    return result
```

### 5. Time & Space Complexity

| Problem Type | Brute Force | Sliding Window |
|---|---|---|
| Longest substring without repeats | O(n²) or O(n³) | O(n) |
| Sliding window maximum (window size k) | O(n·k) | O(n), via monotonic deque |
| Fixed-size window sum/average | O(n·k) | O(n) |
| Space | — | O(k) typically (window contents or deque) |

### 6. Visualization

```
Sliding window maximum, k=3, nums=[1,3,-1,-3,5,3,6,7]:

i=0(1): deque=[0]
i=1(3): pop 0 (1<3), deque=[1]
i=2(-1): deque=[1,2]              -> window [1,3,-1] max=nums[1]=3
i=3(-3): deque=[1,2,3]            -> window [3,-1,-3] max=nums[1]=3
i=4(5): pop 3,2,1 (all <5), deque=[4]  -> window [-1,-3,5] max=nums[4]=5
...
Monotonic deque always keeps decreasing values, front = current window max,
each element pushed and popped at most once -> O(n) total, not O(n*k)
```

### 7. Real-World Usage

Network rate limiting (sliding-window request counters, tracking "how many requests in the last
60 seconds") is a direct real-world sliding-window application — see §54 for how this combines
with token-bucket rate limiting in cloud systems. Streaming analytics (moving averages, rolling
maximum over the last N data points in a metrics pipeline) uses the exact monotonic-deque
technique shown above to maintain a rolling max/min in O(1) amortized per new data point, instead
of re-scanning the whole window.

### 8. Common Interview Questions

"Longest substring/subarray satisfying some condition" (no repeats, at most K distinct
characters, sum ≤ target) is the signature variable-size sliding window question — the pattern
is always: expand right, and shrink left whenever the window becomes invalid. "Sliding window
maximum/minimum" specifically calls for the monotonic deque — if you see "next greater element"
or "maximum in every window of size k," that's the signal (this is the same monotonic-stack
family of technique introduced briefly in §4 Stacks, applied here to a moving window rather than
the whole array at once).

### 9. Key Takeaways

- Sliding window turns "best contiguous range satisfying X" from O(n²)/O(n·k) into O(n) by
  updating validity incrementally as the window's edges move, instead of recomputing from
  scratch.
- The monotonic deque is the specific technique for window maximum/minimum — each element is
  pushed and popped at most once, giving O(n) total despite looking like it should be O(n·k).
- Distinguish from Two Pointers (§30): a sliding window explicitly maintains one coherent
  contiguous range with an incremental validity check, not just two independently-moving indices.
- Rate limiting (§54) and streaming rolling-metric computations are the dominant real-world
  applications of this exact pattern.

---
