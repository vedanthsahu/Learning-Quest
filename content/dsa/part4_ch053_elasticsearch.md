## §53. Elasticsearch: Inverted Indexes & Tries

### 1. Decision Snapshot

Elasticsearch's core search structure is the **inverted index** — a mapping from each distinct
term to the list of documents containing it, conceptually a Hash Table (§7) of Arrays (§1) — with
**Tries (§18)** and related prefix structures layered on top for autocomplete and fuzzy/prefix
matching.

### 2. The Problem This System Had to Solve

"Find every document containing this word" is prohibitively slow to answer by scanning every
document's full text each time (O(total text size) per query). Search engines need the query
cost to depend on how many documents *match*, not on how much total text exists.

### 3. Which Structures It Uses, and Why

An **inverted index** flips the natural document→words mapping around: for every distinct term,
it stores the list of document IDs (and often positions within each document) where that term
appears — conceptually a hash table (§7) mapping term → array (§1) of postings. A query for a
single term becomes a direct hash lookup, O(1) average, returning exactly the matching documents
— no scanning of non-matching documents at all. Multi-term queries ("cats AND dogs") intersect
two postings lists — conceptually the same merge-based intersection idea as the two-pointer
technique (§30) applied to two sorted ID lists. For autocomplete and prefix queries ("find all
terms starting with 'eng'"), Elasticsearch uses **trie**-like structures (§18) over the term
dictionary — the same "share common prefixes, walk down character by character" mechanism
described abstractly there.

### 4. Simplified Architecture Diagram

```
Documents:  Doc1: "the cat sat"     Doc2: "the dog ran"     Doc3: "the cat ran"

Inverted index (term -> posting list of doc IDs):
  "the" -> [Doc1, Doc2, Doc3]
  "cat" -> [Doc1, Doc3]
  "sat" -> [Doc1]
  "dog" -> [Doc2]
  "ran" -> [Doc2, Doc3]

Query "cat AND ran":
  postings["cat"] = [Doc1, Doc3]
  postings["ran"] = [Doc2, Doc3]
  intersect (two-pointer merge, §30) -> [Doc3]     <- only document matching both terms
```

### 5. What This Teaches You in General

"Invert the natural direction of the mapping" is a powerful, generalizable idea whenever queries
consistently go in the opposite direction from how data is naturally produced — documents are
naturally written as sequences of words, but search needs "word → documents," so the index
structure is built specifically to match the query pattern, not the data's natural production
shape. This same inversion idea reappears any time a system builds a specialized index rather
than relying on the primary data layout (compare to Postgres's B+Tree index over heap data, §45).

### 6. Interview Questions This Connects To

"How does a search engine find all documents containing a word instantly, instead of scanning
every document" is directly answered by the inverted index. "How would you support autocomplete
in a search system" points at trie-based structures (§18) over the term dictionary. "How does
multi-word search work efficiently" is answered by postings-list intersection, directly connected
to the two-pointer technique (§30) for merging sorted lists.

### 7. Key Takeaways

- An inverted index maps term → documents (the opposite of how documents are naturally written),
  making single-term search a direct O(1)-average hash lookup instead of a full-text scan.
- Multi-term queries intersect postings lists using the same merge logic as the two-pointer
  technique (§30) applied to sorted ID lists.
- Autocomplete and prefix search are powered by trie-like structures (§18) over the term
  dictionary — the same "shared-prefix tree" idea from that chapter, applied at search-engine
  scale.
- "Invert the mapping direction to match the query pattern" is a transferable systems design
  lesson, not just an Elasticsearch-specific detail.

---
