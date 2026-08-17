## §2. Strings

### 1. Summary

A string is an array of characters, immutable in Python (and in Java, JavaScript, and most
managed languages) — meaning every "modification" actually builds a brand-new string rather than
mutating the original in place. Don't confuse this with C, where a string is a mutable `char`
array with a null terminator; Python's immutability is the single fact that governs almost every
string-performance question in this chapter.

### 2. Why Does It Exist?

Text is the universal interchange format — file contents, network payloads, user input, log
lines, JSON, SQL. Strings need their own chapter, not just "arrays of characters," because
immutability changes the complexity of operations that look trivial (`s += "x"` in a loop looks
O(1) per iteration but is actually O(n) per iteration, O(n²) total, because each `+=` builds a
whole new string).

### 3. Mental Model

Think of a string as a read-only array. Every operation that looks like it changes the string —
concatenation, `.replace()`, `.upper()` — actually allocates a new array and copies. The trick to
efficient string code is avoiding that repeated copy in a loop, usually by collecting pieces in a
mutable list and joining once at the end.

### 4. Basic Implementation

```
function concat_naive(strings):
    result = ""
    for s in strings:
        result = result + s        # O(n) copy every time -> O(n^2) total
    return result

function concat_efficient(strings):
    parts = []                     # mutable list, O(1) amortized append
    for s in strings:
        parts.append(s)
    return join(parts)             # one O(n) pass at the end
```

### 5. Time & Space Complexity

| Operation | Complexity | Note |
|---|---|---|
| Access character by index | O(1) | strings are array-backed |
| Concatenation (single `+`) | O(n) | allocates a new string |
| Concatenation in a loop (`+=` n times) | O(n²) total | classic anti-pattern |
| `"".join(list)` | O(n) total | the fix — one allocation |
| Substring search (naive) | O(n·m) | n = text length, m = pattern length |
| Substring search (KMP / Rabin-Karp) | O(n + m) | rarely hand-rolled in practice |

### 6. Visualization

```
"hello" + "world" in a loop, 3 times:
iter 1:  "hello"                    (len 5, new alloc)
iter 2:  "helloworld"               (len 10, new alloc, copies "hello" again)
iter 3:  "helloworldworld"          (len 15, new alloc, copies first 10 again)
                                     -> total characters copied: 5+10+15 = O(n^2)

vs. list + join:
parts = ["hello", "world", "world"]  (append is O(1) amortized each)
"".join(parts)                       (one O(n) pass, copies each char once)
```

### 7. Real-World Usage

Log processing pipelines, JSON/CSV parsers, and template engines are built around this exact
avoid-repeated-concatenation discipline. Python's `str.join` idiom exists specifically because
of this cost; most style guides and linters flag `+=` string concatenation inside a loop for
the same reason. Hashing a string (for a Hash Table, §7) requires reading every character once,
so string keys in a dict cost O(k) to hash, not O(1), for a k-character string — usually
irrelevant, but worth remembering for very long keys.

### 8. Common Interview Questions

Anagram/palindrome/substring questions are almost always Hash Table (character frequency
counting) or Two Pointers (§30) in disguise. "Longest substring without repeating characters" is
the canonical Sliding Window (§31) problem. String-matching questions ("does this text contain
this pattern") that emphasize performance at scale are pointing at Rabin-Karp or KMP, but in
practice interviewers rarely expect these implemented from memory — knowing they exist and why
naive search is O(n·m) is usually enough.

### 9. Key Takeaways

- Strings are immutable in Python — every mutation-looking operation allocates a new string.
- Concatenating in a loop is the single most common accidental O(n²), fixable by collecting
  into a list and joining once.
- Most "string" interview problems are actually Hash Table, Two Pointers, or Sliding Window
  problems wearing a string costume.
- Naive substring search is O(n·m); production regex/string-search engines avoid this, but
  hand-rolling KMP/Rabin-Karp is rarely expected — understanding the naive cost is what matters.

---
