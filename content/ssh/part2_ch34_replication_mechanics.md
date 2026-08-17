## 34. Replication Mechanics: Sync/Async/Semi-Sync, Leader-Follower, Quorum Reads/Writes

### 34.1 What This Chapter Adds to §8.2-8.3

§8.2-8.3 established why replication exists and previewed the consistency-versus-availability tension. This chapter covers the actual mechanisms: how replicas stay in sync, the concrete tradeoffs between synchronous and asynchronous replication, and how quorum-based systems formalize "how many copies must agree."

### 34.2 Leader-Follower Replication: The Dominant Pattern

The most common replication topology designates one replica as the **leader** (or primary), which accepts all writes, and one or more **followers** (or replicas/secondaries), which receive a continuous stream of changes from the leader and apply them in the same order. Reads can be served by the leader or, for reduced load on the leader, by followers — at the cost, covered next, of followers potentially lagging behind the leader's most current state.

### 34.3 Synchronous vs. Asynchronous Replication: A Concrete Latency-Durability Tradeoff

**Synchronous replication** requires at least one follower to confirm it has received and durably stored a write before the leader acknowledges that write as successful to the client. This guarantees that a committed write is never lost even if the leader fails immediately afterward — but it means every write's latency now includes a full round trip to the follower, and if the follower is unreachable, writes cannot proceed at all (directly trading availability for durability, the exact CAP-adjacent tension formalized in §38).

**Asynchronous replication** acknowledges the write to the client as soon as the leader itself has it, without waiting for any follower to confirm — writes are fast and unaffected by a follower being slow or unreachable, but if the leader fails before a given write has actually propagated to any follower, that write is permanently lost, even though the client was already told it succeeded.

**Semi-synchronous replication** is a middle path: the leader waits for confirmation from at least one follower (not all of them) before acknowledging the write, bounding the worst-case data loss (at most the writes since the last follower confirmation) while limiting the latency cost to waiting on the fastest-responding follower rather than the slowest.

```
Synchronous:    Client -> Leader -> Follower (wait for ACK) -> Leader -> Client
                (slow, but no data loss on leader failure)

Asynchronous:   Client -> Leader -> Client (ack immediately)
                                       |
                                       v (eventually)
                                    Follower
                (fast, but leader failure before propagation loses the write)

Semi-sync:      Client -> Leader -> AT LEAST ONE Follower ACKs -> Leader -> Client
                (bounded loss, latency bound by fastest follower, not all of them)
```

### 34.4 Replica Lag: The Practical Consequence of Asynchronous Replication

Whenever replication is asynchronous (fully or semi-), a follower can fall behind the leader's actual current state — **replica lag**, typically measured in time (how far behind is this follower's data) or in the count of unapplied changes. Replica lag has a direct, user-visible consequence: a client that writes data via the leader and then immediately reads it back via a lagging follower may not see its own write — a specific, common, and often confusing anomaly known as a **read-your-writes** violation. Systems that serve reads from followers for scalability (§8.2) must explicitly decide how to handle this: routing a user's own subsequent reads to the leader for some window after they write, or accepting the inconsistency as a tolerable UX tradeoff for the read-scaling benefit gained.

### 34.5 Quorum Reads and Writes: Formalizing "How Many Copies Must Agree"

Beyond simple leader-follower designs, systems with multiple potentially-writable replicas (developed further in §36) often use a **quorum** mechanism: given `N` total replicas, a write is considered successful once acknowledged by `W` of them, and a read is considered successful once it has queried `R` of them and taken the most recent value observed. The critical mathematical property: if `W + R > N`, every possible read quorum and write quorum is guaranteed to overlap in at least one replica, meaning any read is guaranteed to see the most recent successful write — a strong consistency guarantee achieved without requiring *all* `N` replicas to participate in every operation, giving a tunable dial between consistency strength, latency, and fault tolerance (how many replicas can be down while the system still functions).

```
N=5 replicas.  W=3, R=3.  W+R=6 > N=5 -> guaranteed overlap.

Write quorum:  {A, B, C}         (2 of 5 replicas can be
Read quorum:   {C, D, E}          unavailable and this still works)
                  ^
                  overlap guarantees the read sees C's value,
                  which includes the latest successful write.
```

Choosing smaller `W` and `R` values increases availability (fewer replicas need to respond) and reduces latency (don't need to wait for slow replicas) at the cost of weaker consistency guarantees if the overlap property is not maintained — again, the general tradeoff shape from §1.7, now with an explicit, tunable numeric knob.

### 34.6 Common Mistakes and Production Debugging Signals

- Assuming a follower is a fully up-to-date, safe failover target without monitoring replica lag (§34.4) — a failover to a significantly lagging replica can silently lose recently-acknowledged writes, exactly the risk asynchronous replication accepted in exchange for speed.
- Routing read-after-write operations (e.g., "update profile, then immediately display it") to a lagging follower, producing user-visible, confusing "my change didn't save" reports that are actually a replica-lag artifact, not a real data loss.
- Choosing quorum values where `W + R ≤ N` without realizing the consistency guarantee has been given up, and being surprised when a read doesn't reflect a recently-acknowledged write.

### 34.7 Engineering Intuition

> **How do I know whether I need synchronous or asynchronous replication?** Ask directly: if the leader fails right now, how many recent writes can this system afford to lose? A near-zero tolerance (financial transactions) points toward synchronous or semi-synchronous; a higher tolerance for occasional loss in exchange for lower latency points toward asynchronous.
>
> **What symptoms indicate replica lag is a live problem?** User reports of "my change disappeared" shortly after making it, correlated with reads being served from a follower rather than the leader.
>
> **What metrics indicate it?** Replica lag (in time and/or byte/operation count) tracked continuously per follower; the specific replica lag at the moment of any failover, retrospectively, in incident review.
>
> **What breaks first if replication mode is chosen without this analysis?** Either unnecessary write latency (synchronous replication used where the durability guarantee wasn't actually needed) or unexpected, undetected data loss on failover (asynchronous replication used where near-zero data loss was actually required).
>
> **When is asynchronous replication clearly the right choice?** When write latency matters more than the small, bounded risk of losing the most recent few writes on an unlikely leader failure — a large share of non-financial, non-safety-critical applications fit this description.
>
> **What would a hyperscale company do?** Use semi-synchronous or quorum-based replication with carefully chosen `W`/`R` values for their most consistency-sensitive data, while using asynchronous replication for read-scaling replicas serving less critical, latency-sensitive reads (§62-63).
>
> **What would a two-person startup do?** Use their managed database's default replication mode (commonly asynchronous, for a single standby replica) and not tune quorum parameters at all until a specific incident or requirement calls for it.
>
> **What changes with scale?** At small scale, a single asynchronous standby replica for basic durability is usually sufficient. At larger scale, with stricter consistency and availability requirements across multiple replicas or regions, quorum-based replication with deliberately tuned `W`/`R` values becomes a core, actively-managed part of the architecture (§62-63).

### 34.8 Exercises

1. A system fails over to a follower after the leader crashes, and several recently-"successful" writes are missing afterward. Using §34.3, identify which replication mode was in use and explain precisely why this outcome was possible under that mode.
2. For a hypothetical 5-replica system, choose values of `W` and `R` that guarantee read-after-write consistency while tolerating the failure of at least one replica during both reads and writes, and verify your choice against §34.5's overlap condition.

### 34.9 Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 5 ("Replication") — the direct, comprehensive extension of this chapter's mechanisms.
- Giuseppe DeCandia et al., "Dynamo: Amazon's Highly Available Key-value Store" (2007) — the influential real-world application of quorum-based replication described in §34.5.

---
