## 32. EMR

> **Decision Snapshot** — Tier 3 · Reference Level · Verdict: know it exists as the managed big-data-framework cluster service (Spark, Hadoop, Hive, Presto) for teams needing more control than Glue's serverless model offers.

### What It Does
EMR (Elastic MapReduce) provisions and manages clusters running Spark, Hadoop, Hive, Presto, and other big-data frameworks, giving you more direct cluster-level control (tuning, custom libraries, longer-running interactive clusters) than Glue's fully serverless model provides.

### When to Reach for It
Large-scale data processing needing specific framework versions, custom libraries, or cluster-level tuning that Glue's more opinionated, serverless model doesn't expose — or migrating an existing on-prem Hadoop/Spark workload with minimal rearchitecting.

### When to Avoid It
New, greenfield ETL work that Glue's serverless model handles adequately — EMR's cluster management is a real, ongoing operational responsibility Glue removes entirely.

### One Architecture Diagram
```
S3 (input data) → EMR Cluster (Spark/Hadoop/Hive/Presto, EC2 or EKS-based)
                        ↓
                  S3 (output) / downstream analytics
```

### Interview Questions
1. When would you choose EMR over Glue for a data-processing workload?
2. What's the operational tradeoff of EMR's cluster-level control versus Glue's serverless model?

### Cloud-Agnostic Mapping
EMR (AWS) ≈ HDInsight (Azure) ≈ Dataproc (GCP).

---
