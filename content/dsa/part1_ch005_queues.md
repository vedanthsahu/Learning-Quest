## §5. Queues

### 1. Summary

A queue is a First-In-First-Out (FIFO) collection supporting `enqueue` (add at the back) and
`dequeue` (remove from the front), both O(1) when correctly implemented. Don't confuse a queue
with a stack (§4, LIFO) — same idea of "add on one end, remove from another," but the opposite
end pairing, which makes queues the right fit for "process things in the order they arrived"
rather than "undo the most recent thing." A Python `list` is a *bad* queue — `list.pop(0)` is
O(n) because everything after index 0 has to shift left; use `collections.deque` instead, which
gives O(1) at both ends.

### 2. Why Does It Exist?

Many real systems must process work in arrival order — that's the definition of fairness for a
shared resource. A queue is the structure whose access pattern enforces that ordering directly,
without needing to track timestamps or compare arrival times.

### 3. Mental Model

A checkout line: people join at the back, get served from the front, and — critically — can't
cut the line. Whoever's been waiting longest goes next. That's the entire contract.

### 4. Basic Implementation

```
struct Queue:
    items = Deque()                 # doubly linked list or ring buffer, not a plain array

function enqueue(queue, value):
    queue.items.append_right(value)  # O(1)

function dequeue(queue):
    return queue.items.pop_left()    # O(1) -- this is why a plain array-backed
                                      # queue (pop from index 0) is the wrong choice
```

### 5. Time & Space Complexity

| Operation | `collections.deque` | Plain `list` (anti-pattern) |
|---|---|---|
| Enqueue (add at back) | O(1) | O(1) amortized |
| Dequeue (remove from front) | O(1) | O(n) — must shift everything |
| Peek front | O(1) | O(1) |
| Space | O(n) | O(n) |

### 6. Visualization

```
enqueue(1) enqueue(2) enqueue(3):        dequeue():
 front -> [1][2][3] <- back               front -> [2][3] <- back
                                           (1 removed, everyone else stays put --
                                            no shifting, unlike list.pop(0))
```

### 7. Real-World Usage

Message brokers like RabbitMQ and Kafka's per-partition ordering (§48) are queues at their core
— consumers process messages in the order producers wrote them. BFS (§41) uses a queue to
explore level-by-level. Print spoolers, task schedulers, and request buffering in web servers
all use queues to guarantee first-come-first-served processing under load, and to smooth out
bursts (a producer can enqueue faster than a consumer can dequeue, temporarily, without losing
requests — this is the core idea behind Cloud Systems' work queues, §54).

### 8. Common Interview Questions

BFS-based problems (shortest path in an unweighted graph, level-order tree traversal) are the
most common queue application — if a problem says "level by level" or "shortest number of
steps" in an unweighted context, think queue plus BFS immediately. "Design a circular buffer" or
"implement a queue using two stacks" test whether you understand the FIFO contract deeply enough
to rebuild it from a different primitive.

### 9. Key Takeaways

- Queues are FIFO — enqueue at the back, dequeue from the front, both O(1) with the right
  backing structure.
- Never use a plain Python `list` with `.pop(0)` as a queue — it's O(n) per dequeue; use
  `collections.deque`.
- BFS is the signature queue-based algorithm — level-by-level traversal and shortest-path-in-
  unweighted-graphs both depend on the FIFO guarantee.
- Message brokers and work-queue systems are queues at their conceptual core, with durability
  and distribution layered on top.

---
