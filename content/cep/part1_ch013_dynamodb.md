## 13. DynamoDB

> **Decision Snapshot** — Tier 1 · Database · Verdict: the default choice for access patterns known up front, needing single-digit-millisecond latency at effectively unlimited scale, where you're willing to design around its key-value/single-table model. Primary alternative: RDS/Aurora if your access patterns are varied, ad-hoc, or genuinely need relational joins.

### One-Line Summary
A fully managed NoSQL key-value/document database delivering consistent single-digit-millisecond performance at any scale, with no servers, patching, or capacity planning.

### Category
Database

### Tier
Tier 1

### What It Does
DynamoDB stores items (roughly, JSON-like documents) in tables, retrieved primarily by a partition key (and optionally a sort key for range queries within a partition). There is no query planner, no joins, and no ad-hoc `WHERE` clause on arbitrary fields the way a relational database offers — every access pattern you'll ever need must be designed for up front, either via the primary key structure or a Global Secondary Index (GSI). This constraint is the entire tradeoff: in exchange for giving up relational flexibility, you get near-limitless horizontal scale and consistent low-latency performance that doesn't degrade as data volume grows, because the data model was designed specifically to avoid the query patterns that would require it.

### When Should I Use It?
- Access patterns are known and stable up front (a strong prerequisite — see Common Mistakes) — user profiles, session state, shopping carts, IoT device state, leaderboards.
- You need genuinely unlimited horizontal scale without capacity planning or sharding design of your own.
- Serverless architectures (Lambda + DynamoDB is a very common, natural pairing — no connection pool to manage at all, unlike RDS/Aurora from Lambda).

### When Should I NOT Use It?
- Your access patterns are varied, ad-hoc, or you genuinely need relational joins/aggregations across entities — this is precisely what a relational database is built for and DynamoDB is not.
- Your team hasn't yet done real single-table design work — treating DynamoDB like "a relational database without SQL" produces a schema that will not scale and will need to be redesigned.

### Common Real-World Use Cases
- Session/state storage for serverless applications.
- High-throughput, predictable-access-pattern workloads: shopping carts, user profiles, leaderboards, IoT telemetry.
- Event sourcing / audit log tables, appending immutable records keyed by entity and timestamp.

### Typical Architecture
```
Lambda → DynamoDB (no connection pool needed at all — a genuine advantage over RDS/Aurora here)
              ↓ (DynamoDB Streams, optional)
         Lambda (react to changes: fan out, sync to another store, audit log)
```
DynamoDB Streams captures a time-ordered sequence of item-level changes, commonly consumed by a Lambda function — the standard mechanism for reacting to data changes without polling, and the backbone of many event-driven architectures (companion §41) built on DynamoDB.

### Important Concepts
- **Partition key and sort key** — the partition key determines which physical partition an item lives on (and is the basis of nearly all lookups); the sort key enables range queries and ordering within a single partition key's items.
- **Single-table design** — the practice of modeling multiple entity types in one table, using key structure (not separate tables/joins) to express relationships — a genuinely different design discipline from relational modeling, and the single biggest learning curve for engineers new to DynamoDB.
- **Global Secondary Indexes (GSIs)** — an alternate key structure over the same data, enabling a second access pattern beyond the primary key — every distinct access pattern your application needs must map to either the primary key or a GSI, decided at design time.
- **On-Demand vs. Provisioned capacity** — On-Demand bills per actual request with no capacity planning; Provisioned lets you commit to a specific read/write throughput (cheaper at steady, predictable volume, requiring capacity planning and Auto Scaling configuration).
- **Hot partitions** — if a single partition key receives disproportionate traffic (a viral item, a "global counter" pattern), that partition becomes a bottleneck regardless of overall table capacity — a real, recurring design pitfall.
- **DynamoDB Streams** — an ordered log of item-level changes, the mechanism for reacting to writes without polling.

### Security Considerations
Use IAM policies scoped to specific tables (and, via condition keys, even specific items/attributes for fine-grained multi-tenant isolation) rather than broad DynamoDB access. Enable encryption at rest (on by default) and consider a customer-managed KMS key for auditable key usage on sensitive tables. Point-in-time recovery (PITR) should be enabled for any table holding data you can't afford to lose to an application bug.

### Monitoring
`ConsumedReadCapacityUnits`/`ConsumedWriteCapacityUnits` versus provisioned capacity (or `ThrottledRequests` under On-Demand), and — critically — per-partition metrics are harder to get directly, so a hot-partition problem often first shows up as aggregate throttling that doesn't correlate with overall table-level capacity looking sufficient. CloudWatch Contributor Insights can surface the specific hot keys behind such a pattern.

### Scaling
DynamoDB scales horizontally and automatically across partitions as data grows — there's no instance to resize. The actual scaling discipline is in *key design*, ensuring traffic distributes evenly across partitions; a well-designed table scales close to linearly with added capacity, while a poorly-designed one (a hot partition key) hits a hard per-partition throughput ceiling no amount of overall table capacity can work around.

### Cost Model
On-Demand bills per million read/write request units actually consumed — simple, but potentially expensive at sustained high, predictable volume. Provisioned capacity bills per provisioned throughput-hour regardless of actual usage, cheaper at steady volume if sized correctly (with Auto Scaling to handle variance). Storage is billed per GB-month; GSIs consume their own separate read/write capacity and storage.

### Common Mistakes
- Designing a DynamoDB schema the way you'd design a relational schema (one table per entity, expecting to join at query time) — this doesn't work, and is the single most common real-world DynamoDB failure mode.
- A partition key with insufficient cardinality (e.g., a status field with only three possible values as the sole partition key), creating a small number of extremely hot partitions.
- Not planning every access pattern before designing the table, discovering a needed query isn't supported after the table already has production data in it.
- Using On-Demand capacity for a genuinely steady, predictable, high-volume workload where Provisioned capacity would be meaningfully cheaper.

### Migration Path
**Outgrowing it**: if the application's actual needs turn out to be relational (ad-hoc joins, complex multi-entity transactions) rather than access-pattern-driven, that's a signal DynamoDB was the wrong original choice, not something to migrate away from due to scale (DynamoDB itself scales further than almost any real application will need). **Downgrading**: rare — moving *from* DynamoDB *to* a relational database usually reflects the access-pattern assumption turning out to be wrong, not a capacity limit being hit.

### Interview Questions
1. Why can't you run an arbitrary `WHERE` clause against a non-key attribute the way you would in SQL?
2. What is single-table design, and why is it such a different discipline from relational modeling?
3. What causes a hot partition, and how would you redesign a key structure to avoid one?
4. What's the difference between a Global Secondary Index and the table's primary key structure?
5. When would you choose On-Demand versus Provisioned capacity?
6. How would you use DynamoDB Streams to build an event-driven reaction to data changes?
7. Why is DynamoDB a particularly natural pairing with Lambda, beyond just "it's also serverless"?
8. What real-world signal tells you DynamoDB was the wrong choice for a given workload?

### Python Example
```python
import boto3

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
table = dynamodb.Table("orders")

# Single-table design: partition key encodes entity type + id, sort key enables
# range queries for "all items belonging to this order" in one request.
table.put_item(Item={
    "PK": "ORDER#12345",
    "SK": "METADATA",
    "status": "shipped",
    "total": 4999,
})
table.put_item(Item={
    "PK": "ORDER#12345",
    "SK": "ITEM#1",
    "product_id": "SKU-001",
    "quantity": 2,
})

# One query retrieves the order's metadata AND all its line items together --
# no join, because the access pattern was designed into the key structure itself.
response = table.query(
    KeyConditionExpression=boto3.dynamodb.conditions.Key("PK").eq("ORDER#12345")
)
```
The `PK`/`SK` structure (`ORDER#12345` / `METADATA` vs. `ORDER#12345` / `ITEM#1`) is the actual single-table-design technique in practice — it lets one `query` call retrieve an order and all its line items in a single request, with no join, precisely because the relationship was encoded into the key structure at design time rather than left to be resolved at query time.

### Best Practices
- Design every access pattern before creating the table — DynamoDB punishes discovering a new required query pattern after the fact far more than a relational database does.
- Choose a partition key with high cardinality and even access distribution.
- Use GSIs deliberately for each genuinely distinct access pattern, not reflexively for every attribute.
- Enable point-in-time recovery for any table holding data you can't afford to lose.
- Use Provisioned capacity with Auto Scaling for steady, predictable workloads; On-Demand for genuinely unpredictable ones.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Managed NoSQL Key-Value/Document Store | DynamoDB | Cosmos DB | Firestore / Bigtable |

---
