## 44. Multi-Region & Disaster Recovery Patterns

### 44.1 Pattern: Backup & Restore (Lowest Cost, Slowest Recovery)

```
Primary Region: full production stack
                     ↓ (automated backups/snapshots)
                   S3 (cross-region replicated)
Secondary Region: infrastructure defined (IaC, companion §19) but NOT running
                     ↓ (on declared disaster: restore from backups, provision infrastructure)
```
**When to choose this**: DR requirements tolerate hours of recovery time (RTO) and some data loss window (RPO) — the cheapest DR posture, since the secondary region costs nothing until an actual disaster is declared. **Tradeoff**: recovery time includes both infrastructure provisioning and data restoration, both of which take real, non-trivial time — this pattern trades cost for a slow, though genuinely functional, recovery.

### 44.2 Pattern: Pilot Light

```
Primary Region: full production stack
                     ↓ (continuous replication)
Secondary Region: minimal "pilot light" — database replica running, application
                   infrastructure defined but scaled to zero/minimal
                     ↓ (on declared disaster: scale up application infrastructure)
```
**When to choose this**: faster recovery than backup & restore is needed, but running a full duplicate stack continuously isn't justified. **Tradeoff**: the database replica (e.g., an Aurora Global Database, companion §12) does run continuously and costs accordingly, even though application compute doesn't — a middle-ground cost, for a middle-ground recovery time.

### 44.3 Pattern: Active-Passive (Warm Standby)

```
Primary Region: full production stack (serving all traffic)
                     ↓ (continuous replication, application deployed and running)
Secondary Region: full stack running, scaled down, NOT serving live traffic
                     ↓ (on failover: Route 53 health-check-driven failover, companion §7, scale up)
```
**When to choose this**: recovery time in minutes, not hours, is a genuine requirement, and the cost of a continuously-running (if scaled-down) secondary region is justified. **Tradeoff**: meaningfully higher cost than pilot light, and the secondary region's scaled-down capacity must still be tested to confirm it can actually absorb full production load once scaled up during a real failover — an untested "warm standby" is a common source of a failover that doesn't actually work when needed.

### 44.4 Pattern: Active-Active (Multi-Region)

```
Region A (serving traffic) ←→ Region B (serving traffic)
        ↓                              ↓
  Aurora Global Database / DynamoDB Global Tables (bidirectional replication)
        ↓ (Route 53 latency-based routing, companion §7)
  Users routed to nearest healthy region, both always serving live traffic
```
**When to choose this**: near-zero RTO/RPO requirements and genuinely global user base benefiting from latency-based routing, not just disaster recovery. **Tradeoff**: this is the most complex and expensive pattern — bidirectional replication conflict resolution (companion Software Systems Handbook's distributed-consistency chapters apply directly) is a genuine, ongoing design and operational concern, not a one-time setup cost.

### 44.5 Decision Guidance
Match the pattern to actual, stated RTO/RPO requirements — these four patterns form a genuine cost-versus-recovery-speed spectrum, and choosing further along it than a real requirement justifies is a common, avoidable cost. Whichever pattern is chosen, test the actual failover regularly (companion §51's failure-engineering chapter and companion Python Backend Handbook §99.8's untested-rollback warning both apply directly) — an untested DR posture is not a real DR posture.

---
