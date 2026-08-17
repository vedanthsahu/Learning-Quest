## §133. Arrays, Strings, and Hash Maps: The Workhorses

### 1. The Vocabulary

- **Array** — contiguous, fixed-layout memory; O(1) index access, O(n) insertion/deletion in the
  middle (everything after has to shift).
- **Hash map (dict)** — key-value storage with average O(1) lookup, insert, and delete, backed by
  a hash function mapping keys to bucket positions.
- **Hash collision** — two different keys hashing to the same bucket; how a hash map's
  implementation handles this determines its real-world worst-case behavior.
- **String immutability** — in Python, strings can't be modified in place; repeated concatenation
  in a loop creates a new string each time, which is the classic accidental-O(n²) string bug.

### 2. Where It Sits, and Why Teams Use It

These are the two most-used data structures in both interviews and real production code, and a
huge fraction of interview problems reduce to "use a hash map to avoid a nested loop." Any problem
that involves counting, deduplication, or checking "have I seen this before" is almost always an
O(n²) nested-loop solution waiting to become an O(n) hash-map solution.

### 3. What Actually Breaks

- **Reaching for a nested loop to check "does this exist elsewhere in the list"** — the single most
  common interview pattern-miss: this is almost always an O(n²) solution that a hash map turns
  into O(n) by trading space for time.
- **String concatenation in a loop** — building a large string with `result += piece` inside a
  loop is O(n²) in many languages (including Python, prior to certain internal optimizations that
  shouldn't be relied on); joining a list of pieces once at the end is the O(n) fix.
- **Assuming hash map lookup is unconditionally O(1)** — true on average; a poorly distributed hash
  function or adversarial input can degrade it toward O(n) (see §132's average-vs-worst-case
  point).
- **Off-by-one errors on array bounds** — the most common source of a wrong answer that isn't a
  complexity problem at all, especially with sliding windows and two-pointer approaches (§134).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Any time I see myself checking 'has this value appeared before' inside a loop, I reach for a
  hash map to bring it from O(n²) to O(n)."
- "I build strings by joining a list at the end rather than repeated concatenation in a loop."
- "I know hash map lookups are average O(1), not guaranteed O(1), and I can explain why."

### 5. Interview-Ready Answer

> "Arrays and hash maps solve most surface-level interview problems between them. My first
> instinct when I see a nested loop checking for a match or a duplicate is to ask whether a hash
> map turns that into a single pass — trading O(n) extra space for dropping from O(n²) to O(n)
> time, which is very often the right trade. For strings specifically, I build up results by
> collecting pieces and joining once, rather than concatenating in a loop, since repeated
> concatenation is a quiet O(n²) trap."

### 6. Go Deeper

companion DSA Engineering Handbook's §1 (Arrays), companion DSA Engineering Handbook's §2
(Strings), and companion DSA Engineering Handbook's §7 (Hash Tables) chapters for full
implementation details and collision-handling strategies; this book's §139 (pattern recognition)
for the broader "which technique fits this problem shape" map.

---
