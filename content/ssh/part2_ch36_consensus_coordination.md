## 36. Consensus and Coordination: Paxos, Raft, ZAB, Leader Election, Leases, Epochs

### 36.1 What This Chapter Adds to §9.5

§9.5 asserted that getting independent, unreliable, clockless machines to agree on one true answer is a genuinely hard problem requiring deliberate engineering. This chapter names the actual algorithms that solve it, the formal impossibility result explaining why it's hard, and the practical building blocks (leader election, leases, epochs) built on top of consensus.

### 36.2 Why This Is Provably Hard: FLP Impossibility

The **Fischer-Lynch-Paterson (FLP) impossibility result** (1985) proves that in an asynchronous network (one with no upper bound on message delay — exactly the real internet, per §9.2's observation that you cannot distinguish "slow" from "dead") no consensus algorithm can guarantee both correctness and termination in all cases, if even one node might fail. This is not a statement about bad engineering — it is a mathematical proof about the problem itself. Every practical consensus algorithm therefore makes a deliberate compromise: they remain safe (never produce an incorrect result) in all cases, while accepting that in sufficiently pathological conditions (extreme, sustained network partitions), they may simply fail to make progress rather than proceed unsafely. This is precisely why consensus systems favor safety over liveness under partition — it is the only choice FLP leaves available.

### 36.3 The Core Idea Behind Paxos and Raft: Majority Agreement

Despite differing significantly in presentation, Paxos (the original, notoriously difficult-to-understand algorithm) and Raft (designed explicitly to be more understandable while providing equivalent guarantees) share the same foundational idea: **a decision is only final once a majority of nodes have agreed to it**, and because any two majorities out of the same total set must overlap by at least one node, it is impossible for two conflicting decisions to both achieve majority agreement simultaneously — the overlapping node would have had to agree to both, which the protocol prevents.

```
5 nodes total. A "majority" is any 3.

Majority A: {1, 2, 3}
Majority B: {3, 4, 5}
                ^
        node 3 is in both — by construction, any two
        majorities out of 5 nodes must share at least one node.

If node 3 only ever agrees to ONE proposal at a given decision
point, majorities A and B cannot both succeed with DIFFERENT
values — this overlap is the entire mechanism that prevents
split-brain-style conflicting decisions.
```

Raft additionally organizes this majority-agreement process around explicit, elected **leader terms**: one node is elected leader for a period (a **term**), and only that leader proposes new entries to the replicated log, which followers accept and acknowledge; if the leader fails or becomes unreachable, a new election produces a new leader for a new term. This leader-based structure is what makes Raft considerably easier to reason about and implement correctly than Paxos's original, leaderless formulation, without sacrificing the same majority-based safety guarantee.

### 36.4 Leader Election: Choosing Who's in Charge, Safely

**Leader election** is the specific, recurring application of consensus to answering "which single node is currently authorized to act as leader." The mechanism (in Raft, for instance): a node that hasn't heard from a leader within a timeout period declares itself a candidate, requests votes from other nodes, and becomes leader if it receives a majority — directly reusing the majority-overlap guarantee from §36.3 to ensure at most one leader can be elected for any given term, even under network delays or partial failures. A critical, easily-overlooked detail: because the old leader might still believe it's the leader (it may simply be partitioned from the rest of the cluster, not actually dead — recall §9.2's undecidable "slow versus dead" problem), every proposal a leader makes must be tagged with its term number, so that other nodes can reject stale proposals from a leader that has since been superseded, even if that old leader hasn't yet realized it's been replaced.

### 36.5 Leases and Epochs: Bounding How Long a Stale Belief Can Persist

A **lease** is a time-bounded grant of authority (e.g., "you are the leader until this timestamp"), which the holder must renew before it expires to retain authority. Leases matter specifically because of the exact stale-leader risk named in §36.4: without a lease, a partitioned former leader might continue believing it holds authority indefinitely, since it has no way of independently knowing it's been replaced. A lease bounds this exposure: once the lease's expiration passes without renewal, any component relying on that authority can safely treat the leader as no longer authoritative, without needing to hear from it directly — converting an otherwise-unbounded uncertainty window into a bounded, known one. An **epoch** (or term, generation number) is the closely related concept of tagging every decision or lease with a monotonically increasing number specifically so that stale messages from a superseded leader or previous configuration can always be identified and rejected by comparing epoch numbers — the same tagging mechanism described for Raft terms in §36.4, generalized as a pattern used throughout distributed systems wherever authority or configuration can change over time.

### 36.6 ZAB: A Named Alternative, Briefly

**ZAB (ZooKeeper Atomic Broadcast)**, the protocol underlying Apache ZooKeeper, solves essentially the same problem as Raft — leader-based, majority-acknowledged, totally-ordered log replication — with a design tuned specifically for ZooKeeper's role as a coordination service other distributed systems depend on for leader election, configuration, and locking primitives. Its inclusion here is less about a mechanically distinct approach and more to make explicit that Paxos, Raft, and ZAB are three concrete, production-proven instances of the same underlying majority-agreement principle from §36.3, not three fundamentally different ideas — recognizing this shared foundation is what lets an engineer reason about a consensus system they haven't specifically studied, once the core idea is genuinely understood.

### 36.7 Common Mistakes and Production Debugging Signals

- Building custom leader-election logic without the term/epoch tagging in §36.4-36.5, leaving the system vulnerable to a stale, partitioned former leader continuing to act — precisely the split-brain scenario named conceptually in §9.4.
- Choosing a "majority" size in a way that doesn't actually guarantee overlap (e.g., misunderstanding that 2 out of 5 is not a majority-safe threshold) — undermining §36.3's entire safety argument without any obvious symptom until two conflicting decisions actually occur simultaneously.
- Treating a consensus system's unavailability during a network partition as a bug rather than the expected, correct behavior FLP (§36.2) predicts — a well-implemented consensus system correctly refuses to make progress rather than risk an unsafe decision under certain partition conditions, and "it stopped accepting writes during the network issue" is often the system working as designed, not failing.

### 36.8 Engineering Intuition

> **How do I know I need consensus, rather than a simpler coordination mechanism?** When multiple independent nodes must agree on a single, authoritative answer (who's the leader, what's the current configuration) in a way that must remain correct even under node failure or network partition — simpler mechanisms (a single, unreplicated coordinator) don't survive that failure requirement.
>
> **What symptoms indicate a consensus or leader-election bug?** Two nodes simultaneously believing they are the leader (visible as conflicting writes or duplicate scheduled actions) — almost always traceable to missing or mishandled epoch/term tagging (§36.5).
>
> **What metrics indicate it?** Leader election frequency/churn (frequent re-elections suggest network instability or overly aggressive timeout tuning); time spent with no elected leader (a direct availability cost of the election process itself).
>
> **What breaks first if this is implemented naively?** Split-brain scenarios (§9.4) — the single most damaging failure mode this entire chapter exists to prevent, and the direct consequence of skipping the majority-overlap (§36.3) or epoch-tagging (§36.5) safeguards.
>
> **When should you avoid building consensus yourself?** Nearly always — use a mature, battle-tested implementation (a Raft library, or a coordination service like ZooKeeper or etcd) rather than hand-rolling Paxos or Raft, since the subtlety of getting this correct is exactly why these algorithms are treated as foundational, carefully-verified building blocks rather than routine application code.
>
> **What would a hyperscale company do?** Run dedicated, heavily-tested coordination services (ZooKeeper, etcd, or a custom Paxos-derived system) as shared infrastructure that many other systems depend on for leader election and configuration, rather than each team implementing consensus independently.
>
> **What would a two-person startup do?** Avoid needing custom consensus entirely by relying on a managed database or service that already handles leader election and failover internally, or by using a managed coordination service off the shelf if genuinely needed.
>
> **What changes with scale?** At small scale, a single, unreplicated coordinator (accepting the availability risk) is often an acceptable simplification. At large scale, where a single point of failure for something as critical as leader election is unacceptable, real consensus — via a proven, existing implementation — becomes necessary (§64).

### 36.9 Exercises

1. Explain, using §36.3's overlap argument, why a 4-node cluster requiring only 2 nodes to agree (not an actual majority) could allow two different groups of 2 nodes to each "agree" on conflicting decisions simultaneously.
2. A former leader, partitioned from the rest of a Raft cluster, continues to believe it is still the leader and keeps trying to commit new log entries. Using §36.4-36.5, explain what mechanism prevents this from corrupting the replicated log once the partition heals.

### 36.10 Further Reading

- Diego Ongaro & John Ousterhout, "In Search of an Understandable Consensus Algorithm" (2014) — the original Raft paper, written explicitly to be more accessible than Paxos.
- Michael Fischer, Nancy Lynch, Michael Paterson, "Impossibility of Distributed Consensus with One Faulty Process" (1985) — the original FLP paper underlying §36.2.

---
