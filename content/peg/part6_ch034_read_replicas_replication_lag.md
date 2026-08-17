## §34. Read Replicas, Replication Lag, and Query Plans

### 1. The Vocabulary

- **Read replica** — a read-only copy of the primary database, kept in sync asynchronously,
  used to spread out read traffic.
- **Replication lag** — the delay between a write landing on the primary and that same write
  showing up on a replica.
- **Query plan / `EXPLAIN`** — the database's own description of exactly how it intends to execute
  a query (which indexes it'll use, in what order) — the primary diagnostic tool for "why is this
  query slow."

### 2. Where It Sits, and Why Teams Use It

Read replicas are the standard first lever for scaling read-heavy workloads without touching the
primary database. They introduce a real, unavoidable consistency tradeoff (asynchronous
replication means a small delay) that has to be designed around, not ignored.

### 3. What Actually Breaks

- **Reading your own write immediately after making it, from a replica** — a user updates their
  profile, the app immediately reads it back from a replica for confirmation, and the replica
  hasn't caught up yet — the user sees their own change appear to have not saved.
- **Replication lag spiking under heavy write load** — a burst of writes to the primary can widen
  the lag window unpredictably, turning an intermittent "sometimes stale" bug into a much more
  noticeable one during exactly the traffic spikes when it matters most.
- **Not reading the query plan before assuming an index will be used** — a query can have a
  relevant index and still not use it, because of a type mismatch, a function applied to the
  indexed column, or the planner deciding a full scan is actually cheaper for that specific data
  distribution; `EXPLAIN` is how you find out which actually happened.
- **Sending write-then-immediate-read logic blindly to "the database"** without deciding whether
  that read needs to go to the primary (for strong consistency) or can tolerate a replica's lag.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Read replicas are eventually consistent with the primary — I route anything that needs to see
  its own very recent write back to the primary, not a replica."
- "I check `EXPLAIN` on a slow query before guessing why it's slow — an index existing doesn't
  guarantee the planner is using it."
- "Replication lag isn't constant — it can spike under write load, exactly when it matters most."

### 5. Interview-Ready Answer

> "Read replicas scale read traffic but introduce replication lag — an inherent, asynchronous
> delay before a replica reflects the primary's latest writes. The practical rule I follow is:
> anything that needs to immediately see its own just-made write goes to the primary; everything
> else can tolerate a replica. And when a query is slow, I look at its actual query plan via
> `EXPLAIN` rather than guessing — an index existing doesn't guarantee the planner chose to use
> it for that specific query."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §30 (Query Optimization, Indexes & the N+1
Problem) chapter; companion Software Systems Handbook's §34 (Replication Mechanics:
sync/async/semi-sync, quorum) chapter (leader-follower in full).

---
