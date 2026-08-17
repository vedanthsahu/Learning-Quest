## 42. Data & Analytics Patterns

### 42.1 Pattern: Data Lake Landing Zone with Ad Hoc Query

```
Application → S3 (raw data, partitioned by date/source)
                    ↓ (Glue Crawler, companion §30)
              Glue Data Catalog
                    ↓
              Athena (ad hoc SQL, companion §31)
```
**When to choose this**: analytical query volume is genuinely infrequent or unpredictable, and standing up a full warehouse would be disproportionate. **Tradeoff**: query performance and cost depend heavily on data being partitioned and stored in a query-optimized format (Parquet, not raw JSON/CSV) — skipping this step is the single most common reason this pattern's cost/performance disappoints.

### 42.2 Pattern: Streaming Ingestion to Warehouse

```
Producers → Kinesis Data Streams (companion §34, ordered, real-time)
                    ↓                              ↓
          Consumer App (real-time dashboard)   Kinesis Firehose → S3 → Redshift (companion §33)
```
**When to choose this**: you need both a real-time view of incoming data and a durable, queryable historical record for BI/reporting, from the same event stream. **Tradeoff**: running both a real-time consumer and a batch-loaded warehouse path means the same data is processed twice, in two different systems, which must be kept conceptually (if not literally) consistent.

### 42.3 Pattern: ETL Pipeline Feeding a Data Warehouse

```
RDS/Aurora (operational data) → Glue ETL Job (companion §30, scheduled)
                                        ↓
                                  S3 (transformed) → Redshift (companion §33)
                                        ↓
                                  BI Dashboards
```
**When to choose this**: recurring, complex analytical reporting against structured operational data, where the transactional database itself shouldn't bear the load of heavy analytical queries. **Tradeoff**: ETL introduces latency between "data changed in the operational database" and "data reflected in the warehouse" — a real, deliberate staleness window that must match the actual reporting requirement's tolerance.

### 42.4 Decision Guidance
Start with S3 + Athena (§42.1) for infrequent, ad hoc analytical needs — it has the lowest fixed cost and no cluster to manage. Move to a Redshift-based warehouse (§42.3) once query volume/complexity genuinely justifies dedicated, always-on analytical compute. Add Kinesis (§42.2) specifically when a real-time view, not just eventual reporting, is a genuine requirement.

---
