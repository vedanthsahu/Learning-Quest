## Project 03: In-Memory Cache — Solution Guide

### Business Reasoning

The business need is avoiding repeated, expensive computation for the same inputs. The engineering constraint that makes this a real design problem, rather than "just use a dictionary," is the requirement that memory usage stay bounded — an unbounded cache is exactly the memory-leak pattern Python Backend Engineering Handbook §75.2 names as the most common real-world cause of production memory leaks, and this project is, in effect, building the *correct* alternative to that pattern from first principles.

### Requirements Analysis

Three operations must all be fast: get, put, and eviction-of-the-least-useful-entry. The requirement that eviction be *predictable* (not effectively random) rules out any design that evicts an arbitrary entry when full — it must evict according to a specific, statable policy, with LRU (least recently used) chosen here as the standard, generally-effective default.

### Architecture

```
HashMap: key -> Node (O(1) lookup)
Doubly Linked List: Node <-> Node, ordered by recency (most recent at head, least recent at tail)
get(key): find node via hashmap, move node to head, return value
put(key, value): if exists, update + move to head; else create node at head;
                  if over capacity, remove tail node (and its hashmap entry)
```

### Tradeoff Discussion

**LRU vs. LFU (least-frequently-used) vs. FIFO.** LRU assumes recent access predicts near-future access — true for most real workloads (a user viewing the same page repeatedly in a short session) but wrong for some (a workload with a few very-frequently-used "hot" keys that occasionally go quiet for a while and get evicted despite being generally important, where LFU would retain them). FIFO (evict oldest-added regardless of use) is simplest to implement but ignores usage entirely, generally performing worse than LRU for typical access patterns. LRU is chosen here as the strong general-purpose default, with the explicit acknowledgment that a workload with a distinctly different access pattern might warrant LFU instead.

**Concurrency strategy.** A single global lock around every cache operation is the simplest correct approach and is entirely sufficient at this project's scope — get and put are both extremely fast (O(1)), so lock contention is minimal even under concurrent access, unlike a scenario where the locked critical section does meaningfully slow work.

### Alternative Designs Considered and Rejected

**A plain dictionary with manual oldest-entry tracking via a separate timestamp field, scanned on eviction.** Rejected — this makes eviction O(n) in the number of cache entries, defeating the entire point of a cache meant to be fast; this is the challenge's first named trap made concrete. **`functools.lru_cache` as the entire solution.** Not rejected outright — it's a legitimate, correct choice for single-process, function-memoization use cases — but it's presented as an alternative rather than "the solution" here because it doesn't support the size-bound-plus-manual-eviction-policy control this project asks the learner to build and understand from first principles; using it without understanding what it does internally would defeat this project's actual learning purpose.

### Chosen Design

A hash map from key to a node object, combined with a doubly linked list of those same node objects ordered by recency, giving O(1) get, put, and eviction — the standard LRU cache data structure.

### Implementation Walkthrough

```python
class Node:
    __slots__ = ("key", "value", "prev", "next")
    def __init__(self, key, value):
        self.key, self.value, self.prev, self.next = key, value, None, None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.map: dict = {}
        self.head = Node(None, None)     # sentinel -- most-recently-used side
        self.tail = Node(None, None)     # sentinel -- least-recently-used side
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node: Node) -> None:
        node.prev.next, node.next.prev = node.next, node.prev

    def _add_to_front(self, node: Node) -> None:
        node.next, node.prev = self.head.next, self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.map:
            return None
        node = self.map[key]
        self._remove(node)
        self._add_to_front(node)          # accessing counts as a "use" (challenge's 2nd question)
        return node.value

    def put(self, key, value) -> None:
        if key in self.map:
            self._remove(self.map[key])
        node = Node(key, value)
        self.map[key] = node
        self._add_to_front(node)
        if len(self.map) > self.capacity:
            lru = self.tail.prev          # least-recently-used is at the tail
            self._remove(lru)
            del self.map[lru.key]
```

Two sentinel nodes (`head`, `tail`) eliminate special-casing an empty list or single-element list in `_remove`/`_add_to_front` — every real node always has a genuine `prev` and `next`, even at the list's logical ends. `get` moves the accessed node to the front, making it "most recently used" — directly resolving the challenge's distinction between recency-of-addition and recency-of-use, since a `get` on an old entry now protects it from eviction exactly as a fresh `put` would.

### Production Improvements

Add per-entry TTL by storing an expiration timestamp on each node and checking it lazily at access time (return `None` and evict if expired, rather than a background scanning thread) — this avoids the challenge's fourth named trap (an O(n) background scan) entirely. Add basic hit/miss counters for observability (Python Backend Engineering Handbook §74.3's cache-hit-rate metric), since an LRU cache with a poor hit rate for a given workload is a sign the eviction policy or capacity needs revisiting.

### Scaling Path

This design is explicitly single-process (Project Scope). Scaling it across multiple processes or machines requires an entirely different approach — a shared, external cache (Redis) rather than in-process memory, exactly the mechanism Project 02's rate limiter already used for shared, cross-instance state; the underlying lesson (some state must live outside any single process once there's more than one process) transfers directly.

### Interview Discussion

"Design an LRU cache" is one of the most common data-structure interview questions specifically because it tests whether a candidate can recognize that a hash map alone and a linked list alone each solve half the problem, and that combining them solves both halves simultaneously — see Python Backend Engineering Handbook §97.3 for the related "just use a distributed lock" reflex trap, whose in-process analogue here would be "just use a lock and scan," a much less elegant solution than the paired-data-structure approach.

### Lessons Learned

The core lesson is that achieving multiple O(1) operations simultaneously often requires combining two data structures that are each individually insufficient — a hash map alone can't maintain order; a linked list alone can't look up by key in O(1); together, they solve a problem neither solves alone. This same "combine two simple structures for a property neither has alone" instinct is worth carrying into later projects, including Project 12's metrics aggregation.

---
