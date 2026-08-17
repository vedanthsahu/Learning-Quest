## §48. Kafka: Queues, Append-Only Logs & Sequential I/O

### 1. Decision Snapshot

Kafka is, at its core, a **Queue** (§5, FIFO ordering) per-partition, physically implemented as
an **append-only log** on disk — new messages are always written at the end, never modifying
existing entries, and consumers track their own position ("offset") in that log independently.

### 2. The Problem This System Had to Solve

A message broker handling extremely high write throughput (millions of events/second across many
producers) needs writes to be cheap — and, as established in §25's LSM Tree discussion,
sequential disk writes are dramatically faster than random-access writes. Kafka's entire design
optimizes for exactly this: never modify existing data, only append.

### 3. Which Structures It Uses, and Why

Each **partition** is an ordered, append-only log — conceptually a Queue (§5), but backed by a
literal sequential file on disk rather than an in-memory structure, which is what lets Kafka
retain days or weeks of message history cheaply rather than discarding messages the instant
they're consumed (unlike a traditional in-memory queue). Ordering (FIFO) is guaranteed *within* a
single partition only — across partitions, there's no ordering guarantee, which is the direct
consequence of partitioning being Kafka's mechanism for horizontal scalability (each partition can
live on a different broker, processed independently). Consumers don't dequeue destructively (as a
classic Queue, §5, would) — they track their own offset and can re-read history, which is only
possible because the log is append-only and immutable, never overwritten.

### 4. Simplified Architecture Diagram

```
Partition 0 (append-only log on disk):
  offset: 0    1    2    3    4    5    <- next write
  data:  [m0] [m1] [m2] [m3] [m4] [ ]
                          ^
                    Consumer A's current offset (can re-read m0-m3 any time; log unchanged)

Producer writes: always appended at the END -- sequential disk I/O, never random-access
Multiple partitions -> multiple independent logs -> horizontal scale, but ordering
                        is guaranteed only WITHIN one partition, not across partitions
```

### 5. What This Teaches You in General

"Append-only, never modify in place" is a recurring theme across very different systems for the
same underlying reason — sequential I/O beats random I/O, whether the context is a message broker
(Kafka), a write-optimized database engine (LSM Trees, §25), or a version control system's object
store (Git, §51). Recognizing "append-only log" as a named, reusable pattern — not just "how
Kafka happens to work" — is the transferable lesson.

### 6. Interview Questions This Connects To

"Why is Kafka so much higher-throughput than a traditional message queue" is answered directly by
the sequential-append design, plus partitioning for horizontal scale. "Why doesn't Kafka guarantee
global message ordering" — because ordering is a per-partition property by design, the tradeoff
that enables partitions to scale independently across brokers. "How does a Kafka consumer resume
after a crash" — it just remembers (or looks up) its last committed offset and continues reading
the same immutable log from there, which is only simple because nothing in the log ever changes
underneath it.

### 7. Key Takeaways

- Kafka's partition is conceptually a Queue (§5) but implemented as a durable, append-only,
  disk-backed log — never modified in place, only appended to.
- FIFO ordering is guaranteed only within a single partition — a deliberate tradeoff enabling
  partitions to scale horizontally across brokers with no cross-partition ordering coordination.
- Non-destructive consumption (offset tracking instead of dequeuing) is only possible because the
  underlying log never changes once written.
- "Append-only, sequential I/O over random-access mutation" is a pattern shared with LSM Trees
  (§25) and Git (§51) — recognize it as a named, reusable systems design idea.

---
