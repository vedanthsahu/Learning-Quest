## 37. Distributed Time and Consistency: Lamport Clocks, Vector Clocks, CRDTs, Consistency Models

### 37.1 What This Chapter Adds to §9.3

§9.3 established that independent machines do not share a reliable clock, and that comparing wall-clock timestamps across machines cannot safely determine event order. This chapter covers the actual mechanisms built to establish order without relying on physical time, and the formal consistency models that describe exactly what guarantees a distributed system does or doesn't provide.

### 37.2 Lamport Clocks: Ordering Events Without a Shared Clock

A **Lamport clock** is a simple counter each node maintains, incremented on every local event, and attached to every message sent to other nodes. When a node receives a message, it sets its own counter to one more than the maximum of its current value and the received timestamp. This produces a **logical ordering** of events — if event A could have causally influenced event B (a message from A's node was received before B occurred), A's Lamport timestamp is guaranteed to be less than B's.

```
Node 1: counter=1 (local event) -> counter=2 (sends message, tags with 2)
Node 2: counter=0 -> receives message tagged 2
                   -> sets counter = max(0, 2) + 1 = 3

Node 2's next event is timestamped 3, guaranteed greater than
the message's timestamp of 2 -- preserving "the message was
sent before this event," without either node needing to know
the other's actual wall-clock time at all.
```

The critical limitation: Lamport clocks give a **partial** guarantee only — if A's timestamp is less than B's, it does *not* necessarily mean A caused B; it only guarantees the reverse (if A caused B, A's timestamp is less). Two genuinely unrelated, **concurrent** events (neither influenced the other) can end up with any relative timestamp ordering at all, and a Lamport clock alone cannot distinguish "A definitely happened before B" from "A and B were actually concurrent and just got assigned that relative order arbitrarily."

### 37.3 Vector Clocks: Detecting True Concurrency

A **vector clock** extends this idea by having each node maintain a full vector of counters — one per node in the system, not just its own — updating its own entry on each local event and merging in the maximum of every entry when receiving a message from another node. Comparing two vector clocks can now definitively answer whether one event causally preceded another, or whether the two were genuinely concurrent (neither vector is entirely greater-than-or-equal to the other in every position) — a distinction Lamport clocks cannot make. This directly matters for conflict detection in systems allowing writes at multiple locations (§8.3's "which write wins" question): a vector clock comparison can identify that two conflicting writes were genuinely concurrent (neither is a Lamport-style "happened after" the other) and therefore require explicit conflict resolution, rather than one arbitrarily and incorrectly being treated as superseding the other.

### 37.4 CRDTs: Making Merges Automatic Instead of Manual

Given that concurrent, conflicting writes are detectable (§37.3), a further question is what to actually do about them. **Conflict-free Replicated Data Types (CRDTs)** are data structures specifically designed so that concurrent updates can always be merged automatically into a single, consistent result, without requiring a human or application-specific conflict-resolution rule, and regardless of the order in which replicas receive the updates.

```
A simple CRDT example -- a "grow-only counter" across two replicas:

  Replica A increments its own local count:  A=3, B=0  (total=3)
  Replica B, concurrently, increments its own local count: A=0, B=2

  Merge rule: take the MAXIMUM of each replica's own counter,
  per-replica, then sum:
      merged: A=3, B=2  -> total = 5

  This merge is commutative and produces the same correct
  result regardless of which replica merges with which first,
  or how many times a merge is repeated -- no coordination,
  no conflict-resolution logic required.
```

More sophisticated CRDTs exist for sets, maps, and ordered sequences (enabling, for instance, real-time collaborative text editing across replicas with no central coordinator), but they all share this same property: the merge function is mathematically guaranteed to converge to the same result regardless of operation order, at the cost of being applicable only to data structures whose semantics fit this constrained, automatically-mergeable mold — CRDTs are not a general-purpose replacement for arbitrary application logic requiring bespoke conflict resolution.

### 37.5 Consistency Models: Naming Exactly What Guarantee You're Getting

Given all of the above, it's useful to have precise names for the specific guarantees a distributed system provides, since "consistent" alone is dangerously vague:

- **Strong consistency (linearizability)**: every operation appears to take effect instantaneously at some point between its start and end, and all nodes agree on a single, real-time-respecting order of operations — the strongest, most intuitive, and most expensive guarantee (typically requiring consensus, §36).
- **Sequential consistency**: all nodes agree on *some* single order of operations, consistent with each individual node's own program order, but that agreed-upon order need not match real-world wall-clock time exactly.
- **Causal consistency**: operations that are causally related (per §37.2-37.3's definition) are seen by everyone in the same order, but concurrent, unrelated operations may be observed in different orders by different nodes.
- **Eventual consistency**: the weakest common guarantee — if no new writes occur, all replicas will *eventually* converge to the same value, but with no bound on how long "eventually" takes, and no guarantee about what any given read sees in the meantime.

Each weaker model trades correctness guarantees for availability and performance (again, §1.7's tradeoff shape), and — critically — a system's actual consistency model should be a deliberate, explicit engineering choice communicated clearly to whoever builds on top of it, not an accidental, undocumented property discovered the hard way when an application built assuming strong consistency encounters an eventually-consistent system's stale reads.

### 37.6 Common Mistakes and Production Debugging Signals

- Using wall-clock timestamps to determine event order across machines (exactly what §9.3 warned against), when a Lamport or vector clock (§37.2-37.3) would give a correct causal ordering instead — a common root cause of subtle "last write wins" bugs that occasionally pick the *wrong* write due to clock skew between machines.
- Assuming an "eventually consistent" system provides read-your-own-writes behavior by default, when eventual consistency (§37.5) makes no such promise — a direct, frequent source of confusing user-facing bugs ("I just saved this and it's gone").
- Attempting bespoke, ad hoc conflict resolution for a data structure that a well-understood CRDT (§37.4) already solves correctly and automatically, reinventing a subtle merge algorithm rather than using an existing, proven one.

### 37.7 Engineering Intuition

> **How do I know which consistency model I actually need?** Ask what a user or downstream system would experience if they read stale or out-of-order data, and how costly that would be — payment and inventory logic often need strong or at least causal consistency; a "like count" or presence indicator often tolerates eventual consistency without any real user-facing harm.
>
> **What symptoms indicate a consistency-model mismatch?** Application code implicitly assuming strong consistency (checking a value, then acting on it, assuming it can't have changed) running against a system that only actually guarantees eventual consistency.
>
> **What metrics indicate it?** Time-to-convergence for eventually-consistent systems (how long until replicas agree after the last write); rate of detected conflicting/concurrent writes requiring resolution.
>
> **What breaks first if this is mismatched?** Silent, hard-to-reproduce correctness bugs, because the mismatch only manifests under genuine concurrent access or network delay — precisely the conditions absent from typical single-machine development and testing.
>
> **When is eventual consistency (the weakest model) the right choice?** When the actual cost of a stale or temporarily-inconsistent read is genuinely low, and the availability/performance benefit of not coordinating on every operation is high — a large fraction of non-critical, high-volume data fits this profile.
>
> **What would a hyperscale company do?** Choose consistency models deliberately and explicitly per dataset, use CRDTs where applicable to avoid custom conflict-resolution logic, and document the chosen guarantee clearly enough that every team building on top of a given system knows exactly what to expect (§64).
>
> **What would a two-person startup do?** Default to whatever consistency model their managed database provides out of the box (often strong consistency for a single-region relational database), and only think explicitly about weaker models if they adopt a specialized distributed data store for a specific reason.
>
> **What changes with scale?** At small, single-region scale, strong consistency is often achievable cheaply and is the safest default. At larger, multi-region scale, the latency cost of strong consistency across geographically distant replicas becomes significant enough that weaker, more available models are deliberately adopted for specific datasets — a transition central to §62-63 and §87-89.

### 37.8 Exercises

1. Two replicas each increment a shared counter concurrently, and the system uses "last write wins by wall-clock timestamp" to resolve the conflict. Using §37.2-37.4, explain what could go wrong with this approach and how a CRDT-based counter would avoid the problem entirely.
2. For a feature you know (e.g., a shopping cart, a social media feed, a bank balance), state which consistency model from §37.5 is actually required for correct user-facing behavior, and justify your answer in terms of what a user would experience if a weaker model were used instead.

### 37.9 Further Reading

- Leslie Lamport, "Time, Clocks, and the Ordering of Events in a Distributed System" (1978) — the original Lamport clock paper, referenced in §9.3 and developed fully here.
- Shapiro, Preguiça, Baquero, Zawirski, "Conflict-Free Replicated Data Types" (2011) — the foundational CRDT paper underlying §37.4.

---
