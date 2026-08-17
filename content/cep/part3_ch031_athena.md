## 31. Athena

> **Decision Snapshot** — Tier 3 · Reference Level · Verdict: know it exists as the default way to run SQL queries directly against data sitting in S3, with zero infrastructure to manage — reach for it before standing up a full data warehouse for ad hoc or infrequent analytical queries.

### What It Does
Athena runs standard SQL queries directly against files in S3 (commonly Parquet, ORC, JSON, or CSV), using the Glue Data Catalog (companion §30) for schema, with no cluster to provision — you pay per query based on data scanned.

### When to Reach for It
Ad hoc or infrequent analytical queries against data already in S3 (including CloudTrail logs, application logs, or a data lake), where standing up Redshift (companion §33) would be disproportionate to actual query volume.

### When to Avoid It
High-frequency, low-latency query patterns (Athena's per-query startup and S3 scan cost isn't built for that), or when query cost (billed per byte scanned) grows large due to unpartitioned, unoptimized data formats.

### One Architecture Diagram
```
S3 (Parquet, partitioned by date) → Athena (SQL query, Glue Catalog for schema)
                                          ↓
                                   Query result → S3 / QuickSight / your application
```

### Interview Questions
1. Why does partitioning data in S3 (e.g., by date) meaningfully reduce Athena query cost?
2. When would you choose Athena over standing up a Redshift cluster?
3. What's the relationship between Athena and the Glue Data Catalog?

### Cloud-Agnostic Mapping
Athena (AWS) ≈ Synapse Serverless SQL (Azure) ≈ BigQuery (GCP, though BigQuery is more of a full warehouse than a pure query-over-storage engine).

---
