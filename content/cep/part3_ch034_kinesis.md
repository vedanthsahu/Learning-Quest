## 34. Kinesis

> **Decision Snapshot** — Tier 3 · Reference Level · Verdict: know it exists as AWS's managed real-time streaming data service — reach for it when you need to ingest and process a continuous, high-volume, ordered stream of events, distinct from SQS/SNS's simpler message-queue model.

### What It Does
Kinesis Data Streams ingests and retains a continuous, ordered stream of records (partitioned by a key, similar in spirit to Kafka), consumable by multiple independent applications; Kinesis Data Firehose is a simpler, fully-managed variant that reliably loads streaming data directly into S3, Redshift, or OpenSearch with no consumer application to write yourself.

### When to Reach for It
Real-time analytics, clickstream processing, IoT telemetry, or any workload needing ordered, replayable stream processing with multiple independent consumers — distinct from SQS's point-to-point queue model or SNS's simple fan-out (companion §14).

### When to Avoid It
Simple point-to-point job queuing (use SQS) or straightforward fan-out notification (use SNS/EventBridge) — Kinesis's stream/shard model solves a genuinely different problem and adds real complexity not justified by those simpler needs.

### One Architecture Diagram
```
Producers (app events, IoT devices) → Kinesis Data Stream (sharded, ordered, replayable)
                                              ↓                    ↓
                                    Consumer App A          Consumer App B
                                    (real-time dashboard)   (Firehose → S3 for analytics)
```

### Interview Questions
1. How does Kinesis Data Streams differ from SQS, given both involve "sending data somewhere"?
2. What's the difference between Kinesis Data Streams and Kinesis Data Firehose?
3. What does a shard determine, and how does it affect throughput?

### Cloud-Agnostic Mapping
Kinesis (AWS) ≈ Event Hubs (Azure) ≈ Pub/Sub + Dataflow (GCP).

---
