## 25. OpenSearch Service

> **Decision Snapshot** — Tier 2 · Search/Analytics · Verdict: the default managed choice when your search/log-analytics needs genuinely exceed what a database's native full-text search provides. Primary alternative: PostgreSQL full-text search (companion Python Backend Handbook §88's ADR-10 reasoning applies directly) if your actual requirement is simpler than it first appears.

### One-Line Summary
A managed, distributed search and analytics engine (the open-source fork of Elasticsearch) — full-text search, log analytics, and dashboarding at scale.

### Category
Search / Analytics

### Tier
Tier 2

### What It Does
OpenSearch Service runs a managed OpenSearch (or Elasticsearch) cluster — indexing documents for fast full-text search and aggregation queries, commonly paired with OpenSearch Dashboards for visualization. It's frequently used for two genuinely different purposes that happen to share the same underlying engine: application search (product search, content search) and operational log analytics (centralizing and querying logs across a fleet, an alternative or complement to CloudWatch Logs Insights, companion §18).

### When Should I Use It?
- Search requirements genuinely exceeding a relational database's native full-text search — faceted search, relevance tuning, fuzzy matching at scale, or very high query volume.
- Centralized log analytics across a large fleet, especially when CloudWatch Logs Insights' query capabilities or retention model don't fit.

### When Should I NOT Use It?
- Your actual search requirement is simple keyword matching at moderate scale — PostgreSQL full-text search (companion Python Backend Handbook §88) avoids the dual-write consistency problem and the operational cost of a second data store entirely, for a requirement it can fully satisfy.
- You don't want to manage cluster sizing, shard allocation, and index lifecycle — this is a genuinely more operationally-involved service than most others in this book, even in its managed form.

### Common Real-World Use Cases
- E-commerce product search with faceting and relevance ranking.
- Centralized application/infrastructure log analytics and dashboarding.
- Security information and event management (SIEM)-style log correlation.

### Typical Architecture
```
Application writes → Database (source of truth)
                          ↓ (via Outbox pattern or CDC, companion Python Backend
                          ↓  Handbook §46.7 -- never a naive, unguarded dual write)
                     OpenSearch (search index)
                          ↓
                     Query traffic → OpenSearch (never the primary database for search queries)
```
Keeping a database and a search index in sync is the dual-write consistency problem the companion Python Backend Handbook's Outbox pattern (§46.7) exists specifically to solve — a direct, ungated dual write from application code is a common, real source of the two stores silently drifting apart over time.

### Important Concepts
- **Shards and replicas** — data is split into shards for horizontal scale, each shard optionally replicated for both read throughput and resilience; shard count is chosen at index-creation time and is expensive to change later, making it a genuinely consequential up-front decision.
- **Index lifecycle management** — automatically ages data through hot/warm/cold tiers (or deletes it) as it ages, keeping cost and cluster size proportional to genuinely "hot," frequently-queried data rather than every record ever indexed.
- **Mapping** — the schema defining how each field is indexed/analyzed; an incorrect mapping (e.g., a field indexed as `keyword` when full-text matching was needed) is a common source of "why isn't this searchable the way I expect."

### Security Considerations
Use fine-grained access control (or, at minimum, VPC-only access with security groups) rather than a publicly accessible domain endpoint — a publicly exposed, unauthenticated OpenSearch cluster has been a real, recurring category of cloud data-exposure incident industry-wide. Enable encryption at rest and in transit.

### Monitoring
Cluster health status (green/yellow/red), JVM memory pressure, and shard allocation status are the OpenSearch-specific signals beyond generic CPU/disk — a cluster stuck in yellow/red status typically means an unassigned shard, worth investigating immediately rather than treating as a transient blip.

### Scaling
Scale by adding nodes (horizontal) or resizing existing nodes (vertical); shard count, chosen at index creation, caps how far a given index can spread across nodes regardless of how many nodes you add — under-provisioning shard count up front is a common, hard-to-cheaply-fix-later mistake.

### Cost Model
Billed per node-hour by instance type, plus storage (EBS-backed) per GB. Index lifecycle management directly controls cost by moving aging data to cheaper storage tiers or deleting it — skipping this is a common source of a cluster growing indefinitely and expensively.

### Common Mistakes
- Exposing a cluster publicly without fine-grained access control or VPC restriction.
- Under-provisioning shard count at index creation, capping future horizontal scale for that index.
- A naive, ungated dual write from application code to both the database and the search index, without an Outbox-style consistency mechanism.
- Never configuring index lifecycle management, letting old, rarely-queried data consume expensive hot-tier storage indefinitely.
- Reaching for OpenSearch when a database's native full-text search would have fully sufficed.

### Migration Path
**From a database's native full-text search**: the natural direction once relevance/scale/faceting needs genuinely exceed it (mirroring companion §88's ADR-10 exactly). **Downgrading**: rare in practice, though a workload whose search needs turn out simpler than expected might reasonably move back.

### Interview Questions
1. What's the tradeoff between using a database's native full-text search versus a dedicated search engine like OpenSearch?
2. How does the dual-write consistency problem apply to keeping a database and a search index in sync, and how do you solve it?
3. Why is shard count chosen at index creation such a consequential decision?
4. What does index lifecycle management do, and why does skipping it lead to runaway cost?
5. What does a "yellow" or "red" cluster health status actually indicate?

### Python Example
```python
from opensearchpy import OpenSearch

client = OpenSearch(
    hosts=[{"host": "my-domain.us-east-1.es.amazonaws.com", "port": 443}],
    use_ssl=True, verify_certs=True,
)

client.search(
    index="products",
    body={
        "query": {"multi_match": {"query": "wireless headphones", "fields": ["title^2", "description"]}},
        "size": 20,
    },
)
```
`title^2` boosts matches in the title field twice as heavily as the description — a concrete, small example of the relevance-tuning capability that's the actual reason to reach for a dedicated search engine over a database's simpler full-text ranking in the first place.

### Best Practices
- Restrict access to VPC-only or fine-grained access control; never expose a domain publicly.
- Choose shard count deliberately based on expected index growth, not a default.
- Configure index lifecycle management from day one.
- Use an Outbox-pattern-style mechanism to keep a database and search index consistent, never a naive dual write.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Managed Search/Log Analytics | OpenSearch Service | Azure Cognitive Search | (Elastic Cloud on GCP Marketplace) |

---
