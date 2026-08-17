## Project 03: In-Memory Cache

### Problem Statement

An application repeatedly computes the same expensive results for the same inputs — the same database query, the same computation — over and over, for many different users making similar requests. The business wants a way to remember recently computed results so they don't have to be recomputed every time, without the memory used for remembering growing without bound.

### Functional Requirements

- Store a value under a key, and retrieve it later by that key.
- When the store reaches a maximum size, make room for new entries by removing existing ones according to a defined policy.
- Optionally, allow an entry to automatically expire after a set duration, even before the store is full.

### Non-Functional Requirements

- **Latency**: both storing and retrieving a value must be extremely fast — this is meant to be *faster* than whatever it's standing in front of, or there's no point building it.
- **Memory bounds**: the cache must never grow unbounded — a fixed maximum size must be enforced at all times.
- **Concurrency**: multiple requests may read and write the cache simultaneously; the cache must remain correct under this concurrent access.
- **Predictability**: it should be possible to reason about which entries get evicted and when, rather than the eviction behavior being effectively random.

### Project Scope

**In scope**: a single-process, in-memory key-value cache with a size bound, an eviction policy, and optional per-entry expiration. **Out of scope**: distributing the cache across multiple processes or machines (that's a different, harder problem — see the note in Reflection Questions), persistence to disk, cache warming strategies.

### Engineering Questions (Answer Them Yourself First)

- When the cache is full and a new entry needs to be added, which existing entry should be removed, and why that one specifically?
- Is "the entry that hasn't been used in the longest time" the same as "the entry that was added longest ago"? Does the distinction matter?
- What data structure lets you find the least-recently-used entry AND update recency-of-use both in constant time, not by scanning every entry?
- If two threads try to read and write the cache at the same instant, what could go wrong if you don't think about this deliberately?

### Architecture Thinking

Before reaching for any hints, try to design, on paper, a data structure that supports: get(key) in O(1), put(key, value) in O(1), and evict-the-least-recently-used-entry in O(1) — all three, simultaneously. Consider what happens to a plain dictionary's ordering guarantees (or lack of them) when you need "least recently used" specifically, not just "oldest." Sketch what "used" should mean — does a `get` count as a "use" that affects eviction order, or only a `put`?

### Progressive Hint System

**Level 1**: Consider what would happen if you tried to track "recency" using only a plain hash map — what operation becomes slow, and why? **Level 2**: Look into data structures that maintain both fast key-based lookup AND a meaningful ordering that can be cheaply reordered — what combination of two structures might give you both? **Level 3**: Research the specific combination of a hash map plus a doubly linked list, and consider why the linked list specifically needs to be *doubly* linked rather than singly linked for this use case. **Level 4**: A standard LRU cache implementation pairs a hash map (key → node) with a doubly linked list ordered by recency of use; on every `get` or `put`, the accessed node is moved to the front of the list in O(1) (because a doubly linked list allows removing a node from anywhere in O(1) given a reference to it), and eviction removes the node at the back of the list.

### Common Engineering Traps

- **Using a plain Python `dict` and manually scanning for the least-recently-used key on every eviction** — what's the actual time complexity of this scan, and does it get worse as the cache grows?
- **Treating "least recently added" as equivalent to "least recently used"** — construct a specific sequence of gets and puts where these two would evict a different entry, and consider which behavior is actually more useful.
- **Adding a lock around every single cache operation without considering the performance cost** — is a global lock always necessary, or are there finer-grained alternatives, and does it matter at this project's scale?
- **Implementing expiration as a background thread that periodically scans every entry** — what does this cost as the cache grows, versus checking expiration lazily at access time?

### Reflection Questions

- Python's standard library has a relevant built-in for a large part of this problem (`functools.lru_cache` and `collections.OrderedDict`) — after building your own, look at how they're implemented and compare.
- What would have to change about this design if the cache needed to be shared across multiple separate application processes, not just one? (This isn't in scope for this project, but Project 02's rate limiter already solved a version of "state shared across processes" — how might that solution apply here?)
- Is LRU always the right eviction policy? Can you think of an access pattern where a different policy (e.g., least-frequently-used) would perform better?

### Completion Checklist

- [ ] I have a working design achieving O(1) get, put, and eviction simultaneously.
- [ ] I can explain the difference between recency-of-addition and recency-of-use, and which one my design implements.
- [ ] I have decided how (or whether) my design handles concurrent access correctly.
- [ ] I have decided whether expiration is checked lazily or via a background process, and why.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
