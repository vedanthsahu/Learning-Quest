## 21. ElastiCache

> **Decision Snapshot** — Tier 2 · Caching · Verdict: the default managed cache/in-memory data store on AWS — Redis (or the Valkey fork) for most needs, Memcached for pure, simple, multi-threaded caching. Primary alternative: DynamoDB Accelerator (DAX) if you specifically need a cache in front of DynamoDB rather than a general-purpose one.

### One-Line Summary
Managed Redis/Valkey or Memcached — the caching and in-memory data store layer, without operating the instances, replication, or failover yourself.

### Category
Caching

### Tier
Tier 2

### What It Does
ElastiCache runs Redis (or Valkey, the open-source fork many workloads are migrating to) or Memcached as a managed service — handling patching, replication, and (for Redis/Valkey) automatic failover to a replica. Everything the companion Python Backend Handbook §35 and Software Systems Handbook §39 teach about caching strategy (cache-aside, write-through, invalidation, stampede prevention) applies directly here; ElastiCache doesn't change caching theory, it removes the operational burden of running the cache infrastructure.

### When Should I Use It?
- Application-level caching (companion §74's exact "why isn't Redis helping" diagnostic applies at the AWS-managed layer the same as self-hosted) for expensive, frequently-repeated computation or database query results.
- Session storage for stateless application servers.
- Redis-specific data structures (sorted sets for leaderboards, pub/sub for lightweight real-time messaging) beyond pure caching.

### When Should I NOT Use It?
- You need a cache specifically in front of DynamoDB with microsecond latency — DAX is purpose-built for that specific case.
- Your actual need is durable, primary data storage — a cache is not a database, even though Redis can technically persist data; treat anything in ElastiCache as reconstructable, not authoritative.

### Common Real-World Use Cases
- Database query result caching, directly reducing RDS/Aurora load.
- Session state for horizontally-scaled, stateless application servers.
- Rate limiting (companion Python Backend Handbook §61's atomic `INCR` pattern) and real-time leaderboards via Redis sorted sets.

### Typical Architecture
```
Application → ElastiCache (Redis, cluster mode with replicas)
                  ↓ (cache miss)
              RDS / Aurora / DynamoDB
```
The cache-aside pattern — check the cache, fall through to the database on a miss, populate the cache — is the standard shape; ElastiCache doesn't change this pattern, it just removes the operational cost of running the Redis/Memcached instances the pattern depends on.

### Important Concepts
- **Redis/Valkey vs. Memcached** — Redis/Valkey supports richer data structures, persistence, replication, and pub/sub; Memcached is simpler and multi-threaded (can use multiple cores per node natively), a genuine advantage for pure, simple caching at very high throughput.
- **Cluster mode** — shards data across multiple node groups for horizontal scaling beyond a single node's memory/throughput ceiling; without it, Redis is limited to a single primary node's capacity (plus read replicas).
- **Replication and automatic failover** — a Redis primary with one or more replicas; Multi-AZ automatic failover promotes a replica if the primary fails, similar in spirit to RDS Multi-AZ (companion §11).

### Security Considerations
Enable encryption in transit and at rest; use Redis AUTH (or IAM authentication, where supported) rather than an open, unauthenticated endpoint. Place the cluster in an isolated/private subnet with security groups scoped to only the application tier that needs access.

### Monitoring
`CPUUtilization`, `CurrConnections`, `Evictions` (a rising eviction count under memory pressure is a direct signal the cluster is undersized for its working set, companion Python Backend Handbook §75's bounded-cache reasoning applies here at the infrastructure level), and replication lag for read replicas.

### Scaling
Vertical: resize the node type. Horizontal: cluster mode shards across more nodes; read replicas scale read throughput specifically. A single hot key (a single Redis key receiving disproportionate traffic) can bottleneck a shard regardless of overall cluster capacity, mirroring DynamoDB's hot-partition problem (companion §13).

### Cost Model
Billed per node-hour by node type, multiplied by however many nodes cluster mode and replication require. An oversized cluster "for headroom" that's mostly idle is a common, quiet cost — right-sizing against actual measured memory/throughput usage matters here as much as anywhere else.

### Common Mistakes
- Treating ElastiCache as durable storage rather than a reconstructable cache — a cluster failure/reset should never be a data-loss incident for anything else in the system.
- Not enabling Multi-AZ automatic failover for production, accepting an avoidable single point of failure.
- A single hot key bottlenecking a shard while overall cluster metrics look healthy.
- Under-provisioning memory, causing eviction-driven cache-miss cascades back onto the database exactly when load is already high.

### Migration Path
**Outgrowing a single node**: enable cluster mode to shard across nodes. **DAX-specific need**: if the actual requirement is a cache purpose-built for DynamoDB specifically, DAX is the more targeted tool.

### Interview Questions
1. What's the practical difference between Redis/Valkey and Memcached, and when would you choose each?
2. How does ElastiCache's Multi-AZ failover work, and what does the application experience during it?
3. What causes a hot key to bottleneck a cluster shard even when overall metrics look fine?
4. Why should a cache never be treated as a system's source of truth?
5. What's the relationship between rising evictions and cache undersizing?

### Python Example
```python
import redis

client = redis.Redis(host="my-cluster.xxxxx.cache.amazonaws.com", port=6379,
                      ssl=True, decode_responses=True)

def get_user_profile(user_id: str, db_fetch_fn):
    cache_key = f"user_profile:{user_id}"
    cached = client.get(cache_key)
    if cached:
        return cached
    profile = db_fetch_fn(user_id)
    client.setex(cache_key, 3600, profile)   # TTL as a backstop, per companion §74's ADR-5 lesson
    return profile
```
`ssl=True` enforces encryption in transit to the cluster, and the `setex` TTL provides the same backstop-not-primary-mechanism discipline companion Python Backend Handbook §83's capstone stage establishes — real invalidation should still happen explicitly on write wherever the underlying data changes.

### Best Practices
- Enable Multi-AZ automatic failover for production clusters.
- Right-size node count/type against measured memory and throughput, not a guess.
- Use cluster mode before a single node's capacity becomes a real ceiling, not after.
- Treat cached data as always reconstructable; never authoritative.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Managed In-Memory Cache | ElastiCache | Azure Cache for Redis | Memorystore |

---
