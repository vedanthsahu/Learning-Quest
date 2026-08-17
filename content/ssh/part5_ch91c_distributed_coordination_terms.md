## 91.C Distributed Coordination Terms

### Split Brain

**Definition**: A failure scenario where a network partition or coordination failure leaves two (or more) parts of a distributed system each independently, incorrectly believing they are solely authoritative — most commonly, two nodes both believing they are the leader. See §9.4 for the conceptual introduction and §36.4-36.5 for the epoch/term-based fencing mechanism that prevents it.

**Real example / production story**: The real incident pattern documented in §63.5, where an automated failover promotes a new primary during a transient network partition while the original primary — still running, merely isolated — continues accepting writes, unaware it has been superseded.

**Detection**: Two nodes simultaneously performing actions that should be mutually exclusive (both accepting writes as primary, both believing they hold a lock).

**Mitigation**: Epoch/term tagging with fencing (§36.5, §63.5) — ensuring a superseded node is actively prevented from continuing to act, not merely expected to notice on its own.

**Misconception**: Split brain is not caused by "bad luck" — it is a predictable, well-understood consequence of failover automation that doesn't distinguish "genuinely dead" from "merely partitioned," per §9.2's fundamental ambiguity.

### Quorum

**Definition**: The minimum number of nodes that must agree (or acknowledge an operation) for that operation to be considered successful, chosen specifically so that any two quorums out of the same total node set are guaranteed to overlap. See §34.5 for the read/write quorum formula (W + R > N) and §36.3 for its role in consensus algorithms.

**Real example**: Amazon's Dynamo (§34.9, §38.5) using tunable quorum parameters to let application designers choose their own consistency/availability/latency tradeoff per use case.

**Misconception**: A quorum is not simply "a majority" in all cases — read and write quorums can be sized asymmetrically (e.g., W=1, R=N for fast writes and slower-but-complete reads), and the overlap guarantee, not "majority" per se, is the actual mathematical requirement.

### Leader Election

**Definition**: The process by which a group of distributed nodes agree on a single node to act as leader/coordinator for some function, safely, even under node failures and network delay. See §36.4 for the mechanism (built on the majority-overlap principle from §36.3).

**Real example / production story**: Google's Chubby lock service (§64.2) and open-source equivalents like ZooKeeper and etcd, used as shared, heavily-tested infrastructure by countless other systems rather than each system implementing its own election logic.

**Misconception**: Leader election alone does not prevent split brain — it must be combined with epoch/term tagging and fencing (§36.5) to ensure a deposed leader cannot continue acting as if it still held the role.

### Lease

**Definition**: A time-bounded grant of authority or exclusive access, which must be actively renewed by its holder before expiration or it lapses automatically. See §36.5 for the mechanism and its role in bounding the exposure window of a partitioned, would-be-stale leader.

**Real example**: A distributed lock service granting a lease to whichever node currently holds a lock, automatically releasing it if the holder fails to renew — preventing an indefinitely-held lock from a crashed holder that never explicitly released it.

**Misconception**: A lease's safety depends entirely on bounded, trustworthy clock behavior across the systems involved — clock drift or a paused process (e.g., a long garbage-collection pause) can cause a holder to believe its lease is still valid after it has actually expired, a well-documented real-world hazard.

### Epoch

**Definition**: A monotonically increasing number (also called a term or generation number) tagging a specific configuration, leadership term, or decision, specifically so that stale messages from a superseded state can always be identified and rejected by comparing epoch numbers. See §36.4-36.5 for the Raft-specific "term" usage and its generalization.

**Real example**: Raft's term numbers (§36.4), incremented on every new leader election, allowing any node to instantly recognize and reject a message from a leader whose term has since been superseded.

**Misconception**: An epoch number is not merely a version label for human reference — it is an actively-checked, load-bearing safety mechanism that prevents specific classes of split-brain and stale-write bugs.

### Lamport Clock

**Definition**: A simple, per-node logical counter, incremented on every local event and passed along in messages, that establishes a partial causal ordering of events across a distributed system without relying on synchronized physical clocks. See §37.2 for the full mechanism and its explicit limitation (cannot distinguish "happened before" from "concurrent").

**History**: Introduced by Leslie Lamport in his foundational 1978 paper "Time, Clocks, and the Ordering of Events in a Distributed System" (§9.9, §37.9) — one of the founding documents of distributed systems theory.

**Misconception**: A Lamport clock does not tell you two events' true real-world chronological order — it only guarantees that if event A causally influenced event B, A's timestamp will be less than B's; the reverse implication does not hold.

### Vector Clock

**Definition**: An extension of the Lamport clock maintaining one counter per node (not just one's own), enabling a definitive determination of whether two events are causally related or genuinely concurrent — a distinction a plain Lamport clock cannot make. See §37.3 for full mechanism and its role in conflict detection.

**Real example**: Used in systems like the original Amazon Dynamo to detect genuinely concurrent, conflicting writes to the same data across replicas, distinguishing them from writes that are simply causally ordered.

**Misconception**: Vector clocks detect concurrency; they do not resolve conflicts automatically — a separate mechanism (application-level resolution, or a CRDT) is still needed to decide what to do once a genuine conflict is detected.

### CRDT (Conflict-free Replicated Data Type)

**Definition**: A data structure specifically designed so that concurrent, independent updates from multiple replicas can always be merged automatically into a single, consistent result, regardless of the order updates are applied or received. See §37.4 for the worked grow-only-counter example and mechanism.

**History**: Formalized in Shapiro, Preguiça, Baquero, and Zawirski's 2011 paper (§37.9), building on earlier, less formalized replicated-data techniques.

**Real example**: Real-time collaborative text editors (allowing multiple users to edit the same document concurrently with automatic, correct merging) are among the most widely-cited practical applications of CRDT-like techniques.

**Misconception**: CRDTs are not a general-purpose substitute for all conflict resolution — they apply only to data structures whose semantics fit the constrained, automatically-mergeable mold (counters, sets, certain ordered sequences), not arbitrary application logic.

### Consensus

**Definition**: The general problem of getting a set of distributed nodes to agree on a single value or decision, safely, despite node failures and network delay — provably hard in the fully general, asynchronous case (the FLP impossibility result, §36.2), with practical algorithms (Paxos, Raft, ZAB, §36.3-36.6) making deliberate, well-understood tradeoffs to solve it in practice.

**Real example / production story**: Google's Chubby (Paxos-based) and the widely-used open-source ZooKeeper (ZAB) and etcd (Raft) — the shared, heavily-tested consensus infrastructure underlying leader election and coordination for a vast number of other systems (§64.2).

**Misconception**: Consensus does not guarantee a decision will always be reached quickly — under sufficiently severe network partition, a correct consensus algorithm may simply pause (favoring safety over liveness) rather than risk an unsafe decision, exactly as FLP predicts.

---
