## 33. Redshift

> **Decision Snapshot** — Tier 3 · Reference Level · Verdict: know it exists as AWS's managed data warehouse for large-scale, complex analytical queries across structured data — reach for it once Athena's per-query-over-S3 model no longer fits sustained, complex BI workloads.

### What It Does
Redshift is a managed, columnar-storage data warehouse built for complex analytical queries (joins, aggregations) across large volumes of structured data, with Redshift Spectrum extending queries out to data still sitting in S3 without loading it in first.

### When to Reach for It
Sustained, complex business-intelligence workloads (dashboards, recurring reporting) against large structured datasets, where Athena's per-query S3-scan model becomes either too slow or too costly at the actual query volume.

### When to Avoid It
Infrequent, ad hoc analytical queries — Athena (companion §31) fits that shape with zero cluster management. Also avoid it as a substitute for a transactional (OLTP) database — Redshift is built for analytical (OLAP), not transactional, workloads.

### One Architecture Diagram
```
RDS/Aurora/S3 (source data) → ETL (Glue) → Redshift (columnar warehouse)
                                                  ↓
                                          BI tool / dashboard queries
                                                  ↓ (Spectrum, for data still in S3)
                                                S3
```

### Interview Questions
1. What's the difference between Redshift and Athena, and when would you choose each?
2. Why is Redshift unsuitable as a transactional (OLTP) database?
3. What does Redshift Spectrum let you do that querying Redshift alone doesn't?

### Cloud-Agnostic Mapping
Redshift (AWS) ≈ Synapse Analytics (Azure) ≈ BigQuery (GCP).

---
