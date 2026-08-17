## §28. Searching Fundamentals

### 1. Summary

"Searching" here means the general decision of *how* to find a value in a collection — not any
one specific algorithm. This chapter sets up that decision before §29 dives into Binary Search
specifically. The three fundamental options are: linear scan (O(n), works on anything, no
preconditions), binary search (O(log n), requires sorted, random-access data), and hashing
(O(1) average, requires no ordering but does require a hashable key and extra space). Don't
confuse "searching" with "sorting" (§34) — sorting is often a *prerequisite* that unlocks binary
search, not the search itself.

### 2. Why Does It Exist?

Every search problem starts with the same silent decision: is the data sorted? Is it already in
a hash table? Is it worth sorting first? Naming that decision explicitly, before learning binary
search's mechanics in isolation, avoids the common mistake of reaching for binary search on data
that isn't sorted, or building a hash table for a one-time linear scan that would've been simpler.

### 3. Mental Model

Think of three tools on a shelf: a flashlight (linear scan — works anywhere, slow), a library's
alphabetized shelf (binary search — fast, but only if things are already in order), and a
labeled-cubbyhole system (hashing — fast lookup by exact key, no ordering needed or preserved).
Picking the right tool is 90% of "searching" as a skill; the mechanics of each tool are secondary.

### 4. Basic Implementation — the decision, not the algorithms

```
function choose_search_strategy(data, is_sorted, num_queries):
    if num_queries == 1 and not is_sorted:
        return "linear scan"                     # sorting first wouldn't pay off for 1 query
    if is_sorted:
        return "binary search"                    # O(log n) per query
    if need_exact_match_only and can_afford_space:
        return "build a hash table, then O(1) per query"
    return "sort once (O(n log n)), then binary search each query (O(log n))"
```

### 5. Time & Space Complexity

| Strategy | Precondition | Per-Query Cost | Setup Cost |
|---|---|---|---|
| Linear scan | none | O(n) | O(1) |
| Binary search | sorted data | O(log n) | O(n log n) if not already sorted |
| Hash table lookup | hashable keys | O(1) average | O(n) to build |

### 6. Visualization

```
Searching for one value, once, in unsorted data of size n:
  Sort first + binary search: O(n log n) + O(log n) = O(n log n)  <- worse!
  Just linear scan:           O(n)                                 <- better

Searching for k different values in the SAME unsorted data:
  Sort once + binary search each: O(n log n) + k*O(log n)
  Linear scan each time:          k*O(n)
  -> sorting pays off once k is large enough that k*O(n) > O(n log n), roughly k > log n
```

### 7. Real-World Usage

Database query planners make exactly this decision at scale: given a query's filter conditions,
should it scan the whole table (linear scan), use a B+Tree index (§15, the database-scale
analogue of binary search), or use a hash index (equality lookups only)? This is the same
fundamental tradeoff triage, just at production scale with real index structures. Recognizing
which situation you're in — one-off query vs. repeated queries against the same data — is the
same judgment call a query planner's cost-based optimizer makes automatically.

### 8. Common Interview Questions

"How would you search this data efficiently" should always be answered by first asking (out
loud, in an interview): is it sorted? How many queries will run against it? Is exact-match lookup
enough, or do we need range queries too (which rules out a plain hash table)? Interviewers
specifically listen for this triage step — jumping straight to "I'll binary search it" without
confirming the data is sorted is a common, easily-avoided misstep.

### 9. Key Takeaways

- Searching is a decision among linear scan, binary search, and hashing — driven by whether data
  is sorted, whether exact-match is sufficient, and how many queries will be run.
- Sorting purely to enable one binary search is usually a net loss (O(n log n) vs. O(n)) — it
  only pays off when the same sorted data serves many subsequent queries.
- Database query planners make this same tradeoff explicitly and automatically — the concept
  generalizes directly to real production systems, not just interview toy problems.
- Explicitly stating this triage out loud in an interview is itself a signal of practical
  engineering judgment, independent of which specific algorithm gets chosen.

---
