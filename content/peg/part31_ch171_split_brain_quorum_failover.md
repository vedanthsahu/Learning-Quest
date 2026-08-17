## §171. Split Brain, Quorum Loss, and Failover Confusion

### 1. The Vocabulary

- **Split brain** — a network partition causes two nodes (or two groups of nodes) to each believe
  they are the sole primary/leader, both accepting writes independently — a direct threat to data
  consistency, since the two "primaries" can diverge.
- **Quorum** — the minimum number of nodes that must agree for an operation (like electing a
  leader) to be considered valid; requiring a majority quorum is the standard defense against split
  brain, since a network partition can give at most one side a majority.
- **Quorum loss** — when a partition or enough node failures mean *no* side has a majority; the
  system typically becomes unable to elect a leader or accept writes at all, prioritizing
  consistency over availability in that moment.
- **Failover confusion** — the operational version of this problem: an automated failover
  triggers, but it's unclear (to the team, during an incident) which node is actually the current
  primary, or a failover happens when it shouldn't have (a false-positive health check, not an
  actual failure).

### 2. Where It Sits, and Why Teams Use It

This is a surface-level vocabulary chapter, deliberately not a consensus-protocol deep dive (Raft/
Paxos internals live in the companion handbooks) — the goal here is recognizing the term and the
risk shape when it comes up, not implementing leader election from scratch. The practical
takeaway: any system using leader election or primary/replica failover has some quorum-based
mechanism specifically to prevent split brain, and understanding *why* that mechanism exists
(majority quorum can't exist on both sides of a partition simultaneously) is the useful, minimal
piece of knowledge here.

### 3. What Actually Breaks

- **A failover mechanism with no real quorum requirement** — a naive "if I can't reach the primary,
  become the primary" rule, run independently by multiple replicas during a network partition, is
  exactly how split brain happens — each isolated replica reaches the same conclusion
  independently.
- **Assuming quorum loss means the system just fails safely and obviously** — quorum loss often
  manifests as a confusing, partial unavailability (some operations work, others hang or reject)
  rather than a clean, obvious failure, which can slow down incident diagnosis.
- **Manual failover run during an active, ambiguous partition** — a human triggering a manual
  failover without confirming the true state of all nodes can itself cause split brain, if the
  believed-dead primary is actually still up and serving traffic on the other side of the
  partition.
- **No clear source of truth for "who is primary right now"** — during an incident, if the team
  itself can't quickly and confidently answer this question, that's a strong signal the failover
  design and its observability need real improvement, independent of whether split brain is
  currently happening.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I know split brain happens when a network partition lets two sides both believe they're the
  primary, and that majority quorum is the standard defense, since a majority can't exist on both
  sides of a partition at once."
- "I know quorum loss can look like confusing partial unavailability, not a clean failure — that's
  useful to recognize during an actual incident."
- "I don't try to implement leader election myself without understanding this risk — I use
  proven, battle-tested consensus implementations rather than a naive 'become primary if I can't
  reach the old one' rule."

### 5. Interview-Ready Answer

> "I don't go deep into consensus protocol internals day to day, but I know the risk shape: split
> brain happens when a partition lets two sides each believe they're the primary and both start
> accepting writes, and majority quorum is the standard defense, since a true majority can't exist
> on both sides of a partition simultaneously. If I ever saw a failover mechanism implemented as a
> naive 'if I can't reach the primary, promote myself' rule with no quorum check, that would be a
> real red flag, since that's exactly the shape of bug that causes split brain in practice."

### 6. Go Deeper

companion Software Systems Handbook's §36 (Consensus & Coordination: Paxos, Raft, ZAB, leases)
chapter for the full Raft/Paxos treatment; this book's §57 (blast radius/multi-AZ/disaster
recovery) for the surrounding resilience-design context.

---
