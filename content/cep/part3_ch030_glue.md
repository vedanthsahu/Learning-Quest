## 30. Glue

> **Decision Snapshot** — Tier 3 · Reference Level · Verdict: know it exists as the managed ETL/data-catalog service for AWS-native data pipelines; reach for it when you need serverless Spark-based ETL without managing clusters.

### What It Does
AWS Glue is a serverless ETL (extract, transform, load) service — it can crawl data sources to automatically infer and catalog schemas (the Glue Data Catalog, shared with Athena and Redshift Spectrum), and run Spark-based transformation jobs without you provisioning or managing clusters.

### When to Reach for It
When you need to transform data between formats/locations (e.g., raw S3 logs into a partitioned, query-optimized format) as part of an AWS-native data pipeline, and want the Data Catalog shared automatically with Athena (companion §31) and Redshift Spectrum.

### When to Avoid It
For a small, simple transformation a Lambda function could handle directly — Glue's Spark-cluster startup time and cost overhead isn't justified for lightweight jobs. Also avoid it if your team already has a mature Spark/Airflow setup elsewhere with no specific need for AWS-native cataloging.

### One Architecture Diagram
```
S3 (raw data) → Glue Crawler (infers schema) → Glue Data Catalog
                                                      ↓
                              Glue ETL Job (Spark) → S3 (transformed, partitioned)
                                                      ↓
                                          Athena / Redshift Spectrum (query directly)
```

### Interview Questions
1. What's the Glue Data Catalog, and why is it shared across Athena and Redshift Spectrum?
2. When would a Lambda function be a better fit than a Glue job for a transformation task?
3. What does a Glue Crawler actually do?

### Cloud-Agnostic Mapping
Glue (AWS) ≈ Azure Data Factory / Synapse (Azure) ≈ Dataflow / Dataproc (GCP).

---
