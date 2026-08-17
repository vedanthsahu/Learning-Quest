## §18. Trie (Prefix Tree)

### 1. Summary

A trie is a tree where each edge represents one character, and each root-to-node path spells out
a string prefix — nodes at the end of a complete word are marked accordingly. Don't confuse a
trie with a Hash Table (§7) storing a set of strings: a hash table gives O(1) exact-string
lookup but no efficient way to find "everything starting with this prefix," which is precisely
the operation a trie is built for.

### 2. Why Does It Exist?

Prefix-based queries — autocomplete, "does any word start with this" — are awkward and slow with
a hash table (you'd have to scan every key) or a sorted array (binary search finds one point, not
a whole prefix range easily). A trie makes "find everything with this prefix" cost proportional
only to the prefix length plus the number of matches, not the total number of stored words.

### 3. Mental Model

A trie is literally the tree of every prefix ever inserted, shared: "cat" and "car" share the
"ca" path, then split into separate branches for "t" and "r". Walking from the root by typing
characters one at a time is exactly how you traverse it — which is why it maps so naturally onto
autocomplete and predictive text.

### 4. Basic Implementation

```
struct TrieNode:
    children = {}              # map: character -> TrieNode (a hash table, §7, per node)
    is_end_of_word = False

function insert(root, word):
    node = root
    for ch in word:
        if ch not in node.children:
            node.children[ch] = TrieNode()
        node = node.children[ch]
    node.is_end_of_word = True

function search(root, word):
    node = root
    for ch in word:
        if ch not in node.children:
            return False
        node = node.children[ch]
    return node.is_end_of_word

function starts_with(root, prefix):
    node = root
    for ch in prefix:
        if ch not in node.children:
            return False
        node = node.children[ch]
    return True                 # prefix exists; a full DFS from here lists all matches
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Insert a word of length k | O(k) |
| Search exact word of length k | O(k) |
| Prefix search (existence) of length k | O(k) |
| List all words with a given prefix | O(k + number of matching words) |
| Space | O(total characters across all inserted words), with prefix-sharing reducing this
  below the naive sum |

### 6. Visualization

```
Insert "cat", "car", "dog":

              (root)
             /       \
            c         d
            |         |
            a         o
           / \        |
          t   r       g
          *   *       *          (* = is_end_of_word)

"ca" shared by cat and car -- one path, two branches after it
starts_with("ca") -> True immediately, without knowing which specific words follow
```

### 7. Real-World Usage

Search-engine autocomplete and predictive text keyboards are the textbook trie application.
**DNS resolution** conceptually walks a hierarchy (`.com` → `example.com` → `www.example.com`)
that mirrors trie-style prefix traversal, though production DNS servers use various specialized
data structures rather than a literal in-memory trie. IP routing tables use a variant called a
radix trie/tree (compressing single-child chains) to do longest-prefix matching efficiently. See
§53 (Elasticsearch) for how tries combine with inverted indexes for fast prefix and fuzzy search
at scale.

### 8. Common Interview Questions

"Implement autocomplete" or "implement a spell-checker" directly names this structure.
"Longest common prefix among a list of strings" can be solved by inserting all strings into a
trie and walking down while only one child exists at each level. "Word search in a grid with a
dictionary of allowed words" (as opposed to searching for one word) is a strong trie signal —
build a trie of the dictionary first, then DFS the grid while pruning any path the trie confirms
can't lead to a valid word.

### 9. Key Takeaways

- A trie shares common prefixes across all inserted strings, making "does anything start with
  this" and "list everything starting with this" both efficient — a hash table can't do either.
- Insert/search cost is proportional to the string length, not the number of stored strings.
- Autocomplete, spell-checking, and IP routing (via the radix-trie variant) are the dominant
  real-world applications.
- When a word-search problem involves checking against a whole dictionary repeatedly, building
  a trie of the dictionary first is almost always the efficient move.

---
