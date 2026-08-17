## 11. RDS

> **Decision Snapshot** — Tier 1 · Database · Verdict: the default managed relational database for standard PostgreSQL/MySQL/etc. workloads not needing Aurora-specific scaling. Primary alternative: Aurora if you need higher throughput/read-replica scaling and can accept its AWS-proprietary storage engine; DynamoDB if you don't actually need relational/transactional semantics at all.

### One-Line Summary
A managed relational database — PostgreSQL, MySQL, MariaDB, SQL Server, or Oracle — with automated backups, patching, and Multi-AZ failover, without you managing the underlying instance.

### Category
Database

### Tier
Tier 1

### What It Does
RDS runs a standard relational database engine on managed infrastructure: automated backups and point-in-time recovery, automated minor-version patching (on a schedule you control), Multi-AZ synchronous replication for automatic failover, and read replicas for scaling read traffic. It is, deliberately, the same PostgreSQL/MySQL you'd run yourself — the value is entirely in not operating the instance, backup, and failover machinery by hand. Everything the companion Software Systems Handbook and Python Backend Handbook teach about relational databases (transactions, isolation levels, indexing, connection pooling) applies directly and unchanged here — RDS doesn't change the database engine's behavior, only who operates it.

### When Should I Use It?
- Any workload needing a real relational database with standard SQL, transactions, and joins, where you don't want to operate the instance yourself.
- Workloads with a specific engine requirement (SQL Server, Oracle) that Aurora doesn't support.
- Moderate scale where Aurora's additional throughput/read-scaling headroom isn't yet a genuine requirement.

### When Should I NOT Use It?
- You need Aurora-level read-replica scaling (up to 15 replicas with sub-10ms replication lag) or its storage-layer performance characteristics — go straight to Aurora if you know you'll need this.
- The data model doesn't actually need relational/transactional guarantees — DynamoDB will very likely be both cheaper and simpler at scale.

### Common Real-World Use Cases
- Primary transactional data store for a typical web application backend.
- Reporting workloads offloaded to a read replica, isolating analytical queries from the primary's write path.
- Multi-AZ deployments for production workloads needing automatic failover on primary instance failure.

### Typical Architecture
```
Application (via RDS Proxy, for high-concurrency/Lambda callers)
        ↓
   RDS Primary (Multi-AZ, synchronous standby)
        ↓ (async replication)
   Read Replica(s) — reporting / read-heavy query offload
```
**RDS Proxy** sits between a high-concurrency caller (especially Lambda, companion §2) and the database, pooling and reusing connections so a burst of concurrent Lambda invocations doesn't each open a new database connection and exhaust the database's connection limit — directly the mechanism companion §50's failure-engineering chapter is about.

### Important Concepts
- **Multi-AZ** — a synchronous standby in a different AZ; RDS automatically fails over to it on primary failure, trading a small write-latency cost for automatic high availability.
- **Read replicas** — asynchronous, eventually-consistent copies for scaling read traffic or isolating reporting workloads; not a substitute for Multi-AZ's automatic-failover guarantee.
- **Automated backups and point-in-time recovery** — continuous backup within a retention window, letting you restore to any point in time within it, not just to a daily snapshot.
- **Parameter groups and option groups** — how you configure engine-level settings (e.g., `max_connections`, isolation level defaults) without SSH access to the underlying instance.
- **Connection limits** — a real, hard ceiling based on instance size; this is precisely why companion §72 (Python Backend Handbook)'s connection-pool-exhaustion failure mode exists, and why RDS Proxy or application-level pooling discipline matters.

### Security Considerations
Place RDS instances in isolated subnets (companion §6) with no route to the internet at all. Use IAM database authentication where the engine supports it, avoiding long-lived static database passwords. Enable encryption at rest (via KMS) and enforce TLS for connections in transit. Rotate credentials via Secrets Manager (companion §17) with automatic rotation configured, not a manually-managed password.

### Monitoring
`DatabaseConnections` (approaching the instance's max), `CPUUtilization`, `FreeableMemory`, `ReadLatency`/`WriteLatency`, and replica lag (`ReplicaLag`) for any read replica are the core metrics. Enhanced Monitoring and Performance Insights give OS-level and query-level visibility respectively — Performance Insights specifically is often the fastest way to identify a single slow query dominating overall load, directly connecting to companion §30 (Python Backend Handbook)'s query-optimization discussion.

### Scaling
Vertical: resize the instance class (brief downtime, or near-zero with a Multi-AZ failover-based resize). Horizontal (reads only): add read replicas. There is no native horizontal write scaling on RDS — if you need that, Aurora's architecture or a sharding strategy (companion Software Systems Handbook §35) is the actual answer, not something RDS itself provides.

### Cost Model
Billed per instance-hour (by instance class), storage (per GB-month, plus provisioned IOPS if using io1/io2 storage), backup storage beyond the free allowance equal to your provisioned storage, and data transfer. Multi-AZ roughly doubles the compute cost (you're paying for the standby) — a deliberate, worthwhile tradeoff for production, not a default to apply to every environment (a dev/staging database rarely needs it).

### Common Mistakes
- Connecting directly from a high-concurrency Lambda function without RDS Proxy, exhausting the connection limit under load.
- Treating a read replica as a high-availability mechanism — replication is asynchronous and eventually consistent, not a substitute for Multi-AZ's synchronous failover.
- Enabling Multi-AZ on every environment including throwaway dev/staging databases, paying double for no real benefit.
- Not enabling Performance Insights, then having no query-level visibility once a performance incident actually happens.

### Migration Path
**Outgrowing it**: sustained need for more read-replica scaling or higher throughput than RDS comfortably provides is the direct signal to move to Aurora (companion §12), which is largely wire-compatible with PostgreSQL/MySQL and often a comparatively low-friction migration. **Downgrading**: if the data model turns out not to need relational/transactional guarantees at all, DynamoDB (companion §13) may be both simpler and cheaper.

### Interview Questions
1. What's the difference between Multi-AZ and a read replica, and why isn't a read replica a substitute for Multi-AZ?
2. Why does connecting directly to RDS from Lambda risk exhausting the database's connection limit, and how does RDS Proxy solve it?
3. How would you use Performance Insights to find a slow query dominating database load?
4. What's the tradeoff of enabling Multi-AZ on every environment?
5. How does point-in-time recovery work, and how is it different from a daily snapshot?
6. When would you choose RDS over Aurora, given Aurora's higher performance ceiling?
7. What's the actual mechanism behind an RDS automatic failover, and what does the application experience during it?
8. How would you rotate a database password without any application downtime?

### Python Example
```python
import boto3

rds = boto3.client("rds", region_name="us-east-1")

rds.create_db_instance(
    DBInstanceIdentifier="orders-db",
    Engine="postgres",
    EngineVersion="16.3",
    DBInstanceClass="db.r6g.large",
    AllocatedStorage=100,
    MasterUsername="admin",
    ManageMasterUserPassword=True,   # Secrets Manager-managed, no plaintext password ever set here
    MultiAZ=True,                     # production: automatic synchronous failover
    StorageEncrypted=True,
    VpcSecurityGroupIds=["sg-0123456789abcdef0"],
    DBSubnetGroupName="isolated-subnet-group",   # no internet route at all
    EnablePerformanceInsights=True,
    BackupRetentionPeriod=14,
)
```
`ManageMasterUserPassword=True` hands credential generation and storage entirely to Secrets Manager — there is no plaintext password ever set or visible in this code, directly closing the static-credential risk named in Security Considerations above, and `EnablePerformanceInsights=True` ensures query-level visibility exists from day one rather than being bolted on only after a performance incident.

### Best Practices
- Use RDS Proxy for any high-concurrency or Lambda-originated connection pattern.
- Enable Multi-AZ for production; skip it for throwaway dev/staging environments.
- Enable Performance Insights and Enhanced Monitoring from launch, not reactively.
- Manage credentials via Secrets Manager with automatic rotation, never a static password in application config.
- Place the instance in an isolated subnet with no internet route.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Managed Relational Database | RDS | Azure SQL Database / Azure Database for PostgreSQL/MySQL | Cloud SQL |

---
