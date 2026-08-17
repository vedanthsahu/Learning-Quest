## 12. Aurora

> **Decision Snapshot** — Tier 1 · Database · Verdict: the default choice once you need more read-replica scaling, faster failover, or higher throughput than standard RDS comfortably provides, and can accept its AWS-proprietary storage layer. Primary alternative: RDS if you don't yet need Aurora's specific scaling headroom.

### One-Line Summary
A PostgreSQL/MySQL-compatible database with a re-architected, distributed storage layer — faster failover, up to 15 low-lag read replicas, and storage that scales automatically without you managing volumes.

### Category
Database

### Tier
Tier 1

### What It Does
Aurora is wire-compatible with PostgreSQL and MySQL (your application code, ORMs, and drivers work unchanged) but replaces the underlying storage engine with a distributed, log-structured storage layer shared across the primary and all read replicas. This is what enables Aurora's headline characteristics: read replicas with typically single-digit-millisecond replication lag (versus RDS's standard asynchronous replication), failover in seconds rather than the longer RDS Multi-AZ failover window, and storage that grows automatically up to 128TB without manual provisioning. **Aurora Serverless v2** additionally scales compute capacity up and down automatically based on load, billing per ACU (Aurora Capacity Unit) rather than a fixed instance size.

### When Should I Use It?
- Read-heavy workloads needing more than a couple of low-lag read replicas.
- Workloads needing faster failover than standard RDS Multi-AZ provides.
- Unpredictable or spiky load where Aurora Serverless v2's automatic compute scaling avoids both over-provisioning and manual resizing.
- You're already committed to PostgreSQL/MySQL wire compatibility and want more headroom without an application-level migration.

### When Should I NOT Use It?
- You need a specific engine Aurora doesn't support (SQL Server, Oracle) — RDS is the only managed option there.
- Your workload is genuinely small and steady — Aurora's baseline cost is typically somewhat higher than an equivalently-sized RDS instance, and that premium isn't buying you anything at low scale.

### Common Real-World Use Cases
- High-read-traffic applications scaling out via many Aurora read replicas.
- Multi-tenant SaaS platforms needing fast failover and minimal replication lag for near-real-time read-after-write consistency across replicas.
- Unpredictable traffic patterns handled via Aurora Serverless v2's automatic scaling.

### Typical Architecture
```
Application → RDS Proxy → Aurora Writer (primary)
                                  ↓ (shared distributed storage layer, single-digit-ms replication)
                          Aurora Reader(s) — up to 15, low-lag
```
Unlike standard RDS, all Aurora replicas share the same underlying storage volume as the writer — replication lag is a function of that storage layer's propagation, not a separate full data copy process, which is the specific architectural reason Aurora's replica lag is so much lower than standard RDS's.

### Important Concepts
- **Aurora Serverless v2** — scales compute (ACUs) up/down automatically within a configured min/max range, in fine-grained increments, without the connection-dropping scaling events earlier serverless database offerings were known for.
- **Cluster endpoint vs. reader endpoint** — the cluster endpoint always points at the current writer (even after a failover); the reader endpoint load-balances across available read replicas — using the wrong one for a given query type is a common, easy mistake.
- **Fast failover** — because replicas share the writer's storage layer, promoting a replica to writer doesn't require re-establishing a data copy, which is why Aurora failover is typically measured in seconds rather than the longer window standard RDS Multi-AZ failover takes.
- **Aurora Global Database** — cross-region replication with typically sub-second lag, for disaster recovery or geographically-distributed read scaling (companion §44's multi-region patterns).

### Security Considerations
The same discipline as RDS applies directly (companion §11) — isolated subnets, encryption at rest via KMS, IAM database authentication where supported, Secrets Manager-managed credentials with rotation. Aurora doesn't change the security model, only the storage/replication architecture underneath it.

### Monitoring
The same core metrics as RDS (connections, CPU, latency) apply, plus Aurora-specific ones: replica lag (should be consistently very low; a rising lag is a real signal something's wrong, not an expected characteristic), and for Serverless v2, ACU utilization to confirm the configured min/max range still fits actual load.

### Scaling
Reads scale by adding replicas (up to 15), each near-instantly available for query traffic. Writes still go through a single writer instance — Aurora doesn't solve write scaling the way a genuinely distributed/sharded database would; if you need to scale writes horizontally, that's a sharding conversation (companion Software Systems Handbook §35), not something Aurora's architecture provides natively. Aurora Serverless v2 removes manual compute-scaling decisions for variable load specifically.

### Cost Model
Billed per instance-hour (provisioned mode, by instance class) or per ACU-hour (Serverless v2), plus storage (billed on actual data size, growing automatically, no pre-provisioning needed) and I/O requests (a real, sometimes-underestimated cost dimension specific to Aurora's storage architecture — I/O-heavy workloads can see this become a meaningful line item).

### Common Mistakes
- Querying the writer endpoint for read-heavy reporting traffic instead of the reader endpoint, missing the entire point of having read replicas.
- Underestimating I/O-request cost for a genuinely I/O-heavy workload, since this billing dimension doesn't exist the same way on standard RDS.
- Choosing Aurora reflexively for a small, steady workload where its baseline cost premium isn't earning its keep.
- Not setting Serverless v2's min ACU high enough for baseline load, causing scaling churn during normal traffic variance.

### Migration Path
**Outgrowing it**: sustained write throughput needs beyond a single writer instance's capacity is a genuine sharding or read/write-workload-separation conversation, not something the next AWS service tier solves automatically. **Downgrading**: a workload that turns out to be small and steady, where Aurora's premium isn't earning anything, can move to standard RDS.

### Interview Questions
1. What architectural change makes Aurora's replica lag so much lower than standard RDS?
2. What's the difference between the cluster endpoint and the reader endpoint, and what happens if you use the wrong one?
3. How does Aurora Serverless v2 differ from provisioned Aurora, and when would you choose each?
4. Why is Aurora's failover typically faster than standard RDS Multi-AZ failover?
5. Does Aurora solve write scaling? Why or why not?
6. What's Aurora Global Database, and what problem does it solve?
7. Why might I/O-request cost be a bigger consideration for Aurora than for standard RDS?

### Python Example
```python
import boto3

rds = boto3.client("rds", region_name="us-east-1")

rds.create_db_cluster(
    DBClusterIdentifier="orders-aurora-cluster",
    Engine="aurora-postgresql",
    EngineMode="provisioned",
    EngineVersion="16.2",
    MasterUsername="admin",
    ManageMasterUserPassword=True,
    ServerlessV2ScalingConfiguration={"MinCapacity": 0.5, "MaxCapacity": 8},
    StorageEncrypted=True,
    DBSubnetGroupName="isolated-subnet-group",
    VpcSecurityGroupIds=["sg-0123456789abcdef0"],
)

# Reader instance -- queries against the READER endpoint, not the cluster (writer) endpoint
rds.create_db_instance(
    DBInstanceIdentifier="orders-aurora-reader-1",
    DBClusterIdentifier="orders-aurora-cluster",
    Engine="aurora-postgresql",
    DBInstanceClass="db.serverless",
)
```
`ServerlessV2ScalingConfiguration` with a non-zero `MinCapacity` keeps a small amount of capacity always warm, directly avoiding the scaling-churn mistake named above where a `MinCapacity` too close to zero causes visible scaling events during entirely normal baseline traffic.

### Best Practices
- Query the reader endpoint for read traffic, the cluster (writer) endpoint only for writes.
- Set Serverless v2's minimum ACU high enough to cover steady baseline load without scaling churn.
- Monitor replica lag as a first-class metric, not an afterthought.
- Use Aurora Global Database for genuine cross-region DR requirements rather than building custom cross-region replication.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Cloud-Native Relational Database | Aurora | Azure SQL Database (Hyperscale) | AlloyDB |

---
