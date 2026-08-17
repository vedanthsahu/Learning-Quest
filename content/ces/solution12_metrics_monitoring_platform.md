## Project 12: Metrics & Monitoring Platform — Solution Guide

### Business Reasoning

The business need is visibility into system health at a volume and speed that manual log inspection can't provide. The defining engineering constraint is asymmetric from most prior projects in this series: ingestion volume is extreme, but the platform must add essentially zero overhead to the applications it monitors — a monitoring system that slows down what it monitors is worse than useless.

### Requirements Analysis

The low-overhead requirement rules out any synchronous, blocking metric-emission path. The storage-efficiency requirement, combined with the observation that recent data matters far more for debugging than year-old raw data, points directly toward a downsampling strategy rather than uniform, indefinite raw retention. These two requirements together (fast ingestion, efficient long-term storage) are why time-series databases exist as a distinct category from general-purpose relational databases.

### Architecture

```
App -> [lightweight client, batches + sends async, never blocks the request] -> Ingestion endpoint
Ingestion -> Time-Series Database (optimized for append-only, timestamp-ordered writes)
Background downsampler: raw (per-second) -> per-minute (after 1 day) -> per-hour (after 1 week)
Alerting: periodic query against recent aggregates, not a full raw-data scan
```

### Tradeoff Discussion

**Synchronous vs. asynchronous metric emission.** Synchronous emission (the application waits for the platform to acknowledge each metric) guarantees the platform has received every metric before the application proceeds, but ties application latency directly to the monitoring platform's own availability and speed — an unacceptable coupling given the low-overhead requirement. Asynchronous, batched emission (buffer locally, flush periodically or when the buffer fills) decouples them entirely, at the cost of a small, bounded risk of losing the most recent, not-yet-flushed batch if the application crashes at exactly the wrong moment — an acceptable tradeoff for metrics, which are inherently approximate and high-volume, unlike, say, financial transaction records.

**Uniform full-resolution retention vs. progressive downsampling.** Keeping every raw data point forever preserves maximum query precision at any point in history, but storage grows without bound and query performance over long ranges degrades as the dataset grows. Progressive downsampling (raw data aged into coarser aggregates over time) keeps storage bounded and keeps queries over long historical ranges fast, at the cost of losing fine-grained precision for old data — an acceptable tradeoff since the stated requirement specifically emphasizes recent-data query speed, not indefinite fine-grained history.

### Alternative Designs Considered and Rejected

**A general-purpose relational database with standard B-tree indexing for metric storage.** Rejected as the primary storage engine — this write pattern (extremely high volume, append-only, always timestamp-ordered, rarely if ever updated) is precisely what time-series databases are purpose-built to optimize for, using storage layouts (columnar, time-partitioned) a general-purpose relational database's indexing strategy doesn't specifically exploit. **Alerting via a full scan of raw data on every check.** Rejected — this is the challenge's fourth named trap: as raw data volume grows, a full-scan-based alert check becomes progressively slower and more expensive, exactly backwards from what an alerting system (which needs to check frequently and cheaply) requires.

### Chosen Design

A lightweight, asynchronous client library batching metrics client-side and flushing them periodically to an ingestion endpoint; a time-series-optimized database as the storage engine; a background downsampling process aging raw data into progressively coarser aggregates; an alerting process querying only recent, already-aggregated data on a fixed interval.

### Implementation Walkthrough

```python
class MetricsClient:
    def __init__(self, flush_interval: float = 1.0, batch_size: int = 500):
        self._buffer: list[dict] = []
        self._flush_interval = flush_interval
        self._batch_size = batch_size
        asyncio.create_task(self._periodic_flush())

    def emit(self, name: str, value: float, tags: dict | None = None) -> None:
        self._buffer.append({"name": name, "value": value, "ts": time.time(), "tags": tags or {}})
        # NOTE: purely in-memory append -- never blocks, never awaits (the request path is untouched)

    async def _periodic_flush(self) -> None:
        while True:
            await asyncio.sleep(self._flush_interval)
            if self._buffer:
                batch, self._buffer = self._buffer, []
                asyncio.create_task(self._send(batch))     # fire-and-forget; a lost batch is acceptable

    async def _send(self, batch: list[dict]) -> None:
        try:
            await http_client.post("http://metrics-ingest/batch", json=batch, timeout=2.0)
        except httpx.HTTPError:
            pass                                            # metrics are best-effort by design

async def downsample_old_data(db, older_than_days: int = 1) -> None:
    await db.execute("""
        INSERT INTO metrics_per_minute (name, minute_bucket, avg_value, count)
        SELECT name, date_trunc('minute', ts), AVG(value), COUNT(*)
        FROM metrics_raw WHERE ts < now() - interval '%s days'
        GROUP BY name, date_trunc('minute', ts)
    """, older_than_days)
    await db.execute("DELETE FROM metrics_raw WHERE ts < now() - interval '%s days'", older_than_days)

async def check_alerts(db, alert_rules: list[dict]) -> None:
    for rule in alert_rules:                                # queries AGGREGATES, never raw scan
        recent_avg = await db.get_recent_average(rule["metric"], minutes=5)
        if recent_avg is not None and recent_avg > rule["threshold"]:
            await trigger_alert(rule, recent_avg)
```

`MetricsClient.emit` is a pure, synchronous, in-memory append — it never performs I/O and never blocks the caller, directly satisfying the low-overhead requirement; the actual network send happens later, asynchronously, in a separate fire-and-forget task, and a failed send is silently accepted rather than retried aggressively, since metrics are explicitly best-effort. `downsample_old_data` progressively ages raw data into coarser aggregates and deletes the raw rows, keeping storage bounded rather than growing indefinitely — directly closing the challenge's second named trap. `check_alerts` queries pre-aggregated recent data, not a raw-data scan, keeping alert-check cost constant regardless of total historical data volume.

### Production Improvements

Add a local, bounded buffer size limit in `MetricsClient` so a prolonged platform outage doesn't cause unbounded memory growth in the monitored application itself — dropping the oldest buffered metrics once the buffer is full, an explicit, deliberate data-loss policy rather than an accidental unbounded-growth bug (directly connecting to Python Backend Engineering Handbook §75's memory-leak diagnosis). Tag metrics with service name and instance ID by default so aggregation and alerting can be scoped per-service without requiring every call site to remember to add this manually.

### Scaling Path

Ingestion scales horizontally behind a load balancer since each batch is independent and stateless; the time-series database itself typically scales via time-based partitioning (each partition covering a bounded time range), letting old partitions be dropped or archived wholesale once their downsampled aggregates have been computed, rather than requiring row-by-row deletion.

### Interview Discussion

A metrics-platform question tests whether a candidate recognizes that "just use the same database and access pattern as everything else" fails specifically because of this workload's extreme, sustained write volume — see Python Backend Engineering Handbook §65's observability chapter for the counter/gauge/histogram vocabulary this platform would need to support to be genuinely useful for the services calling it.

### Lessons Learned

The core lesson is that a monitoring system's own performance requirements are, in some ways, stricter than the systems it monitors — it must never become a bottleneck for the thing it observes, which specifically rules out synchronous coupling and unbounded retention as viable defaults. This same "the tool observing the system must not become part of the system's own bottleneck" principle underlies Project 07's API Gateway tracing considerations and Project 17's Multi-Agent Platform observability needs.

---
