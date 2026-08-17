## 72. Why Are Database Connections Exhausted?

### 72.1 Symptoms

Requests fail with a connection-pool-timeout error (companion §26.6's `pool_timeout` mechanism) specifically under load; the application may become entirely unresponsive for database-touching endpoints while other, non-database endpoints continue functioning normally, a distinguishing signature from a general application-wide slowdown.

### 72.2 Possible Causes

The connection pool is genuinely undersized for actual concurrent demand (companion §26.3); a connection is being checked out from the pool but never properly returned — a "connection leak," most commonly caused by a missing `finally`/context-manager guarantee (companion §3.2, §20.4) around connection usage, meaning an exception partway through a request's database work leaves that connection permanently checked out; a long-running transaction (companion §27.7) holding a connection for far longer than its actual database work requires, because slow, unrelated work (an external API call, companion §32) is happening while the transaction/connection remains open; a sudden, genuine traffic spike exceeding even a well-sized pool's capacity; or multiple application instances (companion §26.7) each maintaining their own pool, with the sum across all instances exceeding what the database server itself can actually support.

### 72.3 Metrics

Pool utilization (checked-out connections relative to pool size) and checkout wait time (companion §57.2) as continuous, leading indicators; the actual number of currently-open connections at the database server level (most databases expose this directly) compared against the sum of every application instance's configured pool size — a mismatch here directly reveals the multi-instance multiplication problem (§72.2's final cause).

### 72.4 Logs

Application logs showing repeated pool-timeout errors correlated with specific traffic patterns or specific endpoint usage; database server logs showing an unusually high connection count or connections held open for an unusually long duration.

### 72.5 Investigation

First distinguish a genuine capacity problem (traffic legitimately exceeds a correctly-configured pool) from a leak (connections not being returned regardless of traffic level) — a leak typically shows pool exhaustion that gets progressively worse over time even under *constant* traffic, since each leaked connection permanently reduces available capacity, while a pure capacity problem correlates directly and reversibly with traffic level. For a suspected leak, audit every code path that checks out a connection (or a session, companion §26.6) for a guaranteed-return path (a `yield`-based dependency, companion §20.4, or an explicit `try`/`finally`) covering every possible exit, including exceptions.

### 72.6 Root Cause

In practice, the most common real-world causes are, in order: a genuine pool undersized for actual (not originally estimated) traffic, discovered as the application's real usage grew past what was assumed at initial configuration (companion §26.3's exact capacity-planning gap); a connection-leak from a code path missing proper cleanup, often introduced by a newer code path that bypassed the standard `Depends(get_session)` pattern (companion §26.6) and manually managed a connection without equally careful cleanup; and the multi-instance multiplication problem (companion §26.7), where a pool sized correctly *per instance* was never re-evaluated as instance count scaled up during a scaling event.

### 72.7 Fix

For genuine undersizing, resize the pool against current, measured concurrent demand (companion §26.9), accounting for actual instance count (§72.2's multiplication); for a leak, fix the specific code path missing guaranteed cleanup, converting it to the standard `yield`-based dependency pattern (companion §20.4, §26.6) rather than manual connection management; for the multi-instance case, either reduce per-instance pool size to keep the fleet-wide total within the database's actual capacity, or scale the database's own connection capacity (companion Software Systems Handbook §34's replication/scaling chapter) to match the fleet's genuine aggregate need.

### 72.8 Tradeoffs

A larger pool (or more database-side connection capacity) has a real infrastructure cost and, beyond a point, diminishing returns as the database's own query-processing capacity — not connection count — becomes the actual binding constraint; fixing a leak requires locating and correcting the specific faulty code path, a one-time engineering cost that should be prioritized immediately once identified, since a leak (unlike pure undersizing) gets progressively worse over time regardless of any pool-size increase, which only delays, rather than prevents, eventual exhaustion.

### 72.9 Prevention

Monitor pool utilization and checkout wait time continuously (companion §57.2) as leading indicators, alerting well before the hard timeout failure occurs; enforce the `yield`-based dependency pattern (companion §20.4, §26.6) as the only sanctioned way to acquire a database connection/session in code review, explicitly disallowing manual connection management that bypasses this guaranteed-cleanup structure; include pool-size-versus-instance-count as an explicit, reviewed parameter whenever instance count changes during a scaling event, rather than assuming a per-instance setting that was correct at one scale remains correct at another.

### 72.10 Engineering Intuition

> **How do I quickly tell a connection leak from genuine undersizing?** Watch pool utilization over time under roughly constant traffic — undersizing shows utilization tracking traffic level directly (high during peaks, recovering during lulls); a leak shows utilization trending upward over time regardless of traffic pattern, since each leaked connection is permanently lost until a restart.

> **Why does a connection leak often go unnoticed until a specific, rare error-handling code path is finally exercised in production?** Because the missing cleanup is typically on an *exception* path — the connection is correctly released on the successful, common path, and only leaks specifically when a particular, infrequent failure occurs, making this bug invisible in ordinary testing that doesn't specifically exercise that failure condition.

### 72.11 Decision Tree: Diagnosing Connection Pool Exhaustion

```
Does pool utilization track traffic level directly (recovering
during low-traffic periods)?
  YES -> Likely genuine undersizing (§72.2) -- resize against
         measured peak demand, accounting for instance count.
  NO (utilization trends upward regardless of traffic) ->
         Likely a connection leak -- audit every connection/
         session acquisition path for guaranteed cleanup (§72.5).
Does the total connection count at the DATABASE level exceed the
sum of every application instance's configured pool size?
  YES -> Check for additional, non-application connection sources
         (admin tools, other services) also consuming capacity.
  NO, but still exhausted -> Re-verify pool_size x instance_count
         against the database's actual configured connection limit.
```

### 72.12 Further Reading

- Companion §26 (Async Sessions & Connection Pools), §27.7 (Transaction Lifetime), §57.2 (Pool Metrics) — the full mechanism depth behind this chapter's diagnostic framework.

---
