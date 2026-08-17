## §39. Greedy Algorithms

### 1. Summary

A greedy algorithm makes the locally-best choice at each step, without reconsidering it later,
and hopes (correctly, for a specific class of problems) that these local choices compose into a
globally optimal solution. Don't confuse "greedy" with "always wrong" or "just a heuristic" — for
problems that provably have the **greedy-choice property** (a locally optimal choice is always
part of *some* globally optimal solution) and **optimal substructure**, greedy gives a provably
correct, optimal answer, often in less time than DP (§37) would need for the same problem.

### 2. Why Does It Exist?

Some optimization problems don't need DP's full "consider all subproblem combinations and cache
them" machinery — a much simpler, faster local rule already provably reaches the optimal answer.
Recognizing when a problem has this property avoids over-engineering a DP solution where a
greedy one, correctly justified, would do.

### 3. Mental Model

Making change with coins by always taking the largest coin denomination that doesn't overshoot
the remaining amount — this works perfectly for a "canonical" coin system (like US coins) but can
fail for an arbitrary one (a coin system with denominations {1, 3, 4} making change for 6:
greedy picks 4+1+1=3 coins, but 3+3=2 coins is optimal) — the exact reason greedy must be proven
correct for a specific problem, not assumed to work by analogy.

### 4. Basic Implementation

```
# Activity selection: choose the maximum number of non-overlapping intervals
function activity_selection(activities):                # each activity = (start, end)
    activities.sort(key=lambda a: a.end)                  # greedy rule: earliest end time first
    selected = [activities[0]]
    last_end = activities[0].end
    for activity in activities[1:]:
        if activity.start >= last_end:                    # doesn't overlap the last selected
            selected.append(activity)
            last_end = activity.end
    return selected                                        # PROVABLY optimal for this problem

# Huffman coding: build optimal prefix-free codes (used in real compression)
function huffman(frequencies):
    heap = min_heap of (frequency, node) for each symbol   # see §16 Heaps
    while len(heap) > 1:
        a = heap.extract_min()
        b = heap.extract_min()
        merged = Node(freq=a.freq + b.freq, left=a, right=b)
        heap.insert(merged)
    return heap.extract_min()                               # root of the optimal code tree
```

### 5. Time & Space Complexity

| Problem | Greedy Complexity | Note |
|---|---|---|
| Activity Selection | O(n log n) | dominated by the initial sort |
| Huffman Coding | O(n log n) | heap-based, §16 |
| Dijkstra's Shortest Path (§43) | O((V+E) log V) | greedy: always expand the currently-closest
  unvisited node |
| Fractional Knapsack | O(n log n) | greedy works here; 0/1 Knapsack does NOT (needs DP, §37) |

### 6. Visualization

```
Activity selection, sorted by end time: (1,3) (2,5) (4,7) (6,8) (8,9)

pick (1,3), last_end=3
(2,5): start 2 < last_end 3 -> skip (overlaps)
(4,7): start 4 >= last_end 3 -> pick, last_end=7
(6,8): start 6 < last_end 7 -> skip (overlaps)
(8,9): start 8 >= last_end 7 -> pick, last_end=9

selected: (1,3), (4,7), (8,9) -- provably the maximum possible non-overlapping set
```

### 7. Real-World Usage

Huffman coding is directly used in real compression formats (DEFLATE, which underlies gzip and
PNG, uses Huffman coding as one stage of its pipeline). Dijkstra's algorithm (§43) — greedy
expansion of the currently-closest node — powers real routing and network shortest-path systems.
Job/CPU scheduling by earliest-deadline-first is a greedy real-world scheduling policy, provably
optimal for minimizing missed deadlines under specific assumptions.

### 8. Common Interview Questions

"Activity/interval scheduling" and "minimum number of meeting rooms" are classic greedy-vs-
sorting questions. A very common, important interview follow-up is "prove this greedy choice is
correct" or "give a counterexample where greedy fails" — 0/1 Knapsack is the standard
counterexample problem (greedy by value/weight ratio can fail; DP, §37, is required for a
guaranteed-optimal answer). Being able to say *why* a specific problem is safe for greedy (or
isn't) is a stronger signal than just producing a greedy-looking solution.

### 9. Key Takeaways

- Greedy is provably optimal only for problems with the greedy-choice property and optimal
  substructure — it is not a general-purpose heuristic, and using it without justification risks
  a wrong answer on problems that only superficially resemble a greedy-safe one.
- 0/1 Knapsack is the canonical counterexample showing greedy fails where DP (§37) succeeds —
  know this contrast by name.
- Huffman coding (real compression) and Dijkstra's algorithm (§43, real routing) are genuine,
  load-bearing production uses of greedy, not just textbook exercises.
- When a greedy solution is proposed in an interview, being ready to justify (or disprove) its
  correctness is often the more valuable half of the answer.

---
