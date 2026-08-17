## Project 12: Metrics & Monitoring Platform

### Problem Statement

The business runs many services, and right now nobody has a clear, real-time view of how any of them are actually performing — request rates, error rates, latency. When something goes wrong, engineers are debugging blind. The business wants a platform that collects numerical measurements from every service continuously, stores them efficiently even at very high volume, and lets engineers query and visualize trends, with the ability to be alerted automatically when something looks wrong.

### Functional Requirements

- Accept a continuous stream of numerical measurements from many services (e.g., "request count," "response time," "error count"), each tagged with a name, a value, and a timestamp.
- Allow querying for how a specific measurement has changed over a time range.
- Support aggregating measurements (e.g., average response time per minute, total requests per hour).
- Trigger an alert when a measurement crosses a defined threshold.

### Non-Functional Requirements

- **Ingestion volume**: this system may need to accept an extremely high rate of incoming measurements — far higher than a typical CRUD application's write rate.
- **Storage efficiency**: raw, individual measurements accumulate extremely quickly; think about whether you need to keep every single raw data point forever.
- **Query performance for recent data**: engineers debugging a live incident need very fast access to very recent data — this is the most time-sensitive read pattern in the system.
- **Low overhead on the services being monitored**: sending a measurement from an application to this platform must not meaningfully slow that application down.

### Project Scope

**In scope**: high-volume metric ingestion, time-range querying, basic aggregation, threshold-based alerting. **Out of scope**: distributed tracing (following a single request across services — a related but distinct concern), log aggregation and search, anomaly detection using machine learning.

### Engineering Questions (Answer Them Yourself First)

- If a service sends a metric on every single request it handles, and that service handles 10,000 requests per second, what does that imply about how the measurement gets from the application to this platform — synchronously, blocking the application's own response?
- Do you need to keep a measurement from six months ago at the same precision (every single individual data point) as a measurement from six minutes ago?
- What's actually different about querying "what was the value at this exact moment" versus "what was the trend over the last hour," and does one query pattern matter more for debugging a live incident?
- If the alerting mechanism itself needs to check thresholds continuously, does it need to scan the entire raw dataset every time to do so?

### Architecture Thinking

Sketch how a metric gets from an application handling a real user request to this platform — does the application's request path wait for that measurement to be fully processed and stored, or is there a decoupling point? Consider what happens to storage volume over time if every individual raw measurement is kept forever at full precision, versus a design where older data is progressively aggregated into coarser summaries. Estimate: for a system ingesting 100,000 measurements per second, does a general-purpose relational database seem like the right storage engine, or does something about this specific access pattern (write-heavy, append-only, time-ordered) suggest a more specialized option?

### Progressive Hint System

**Level 1**: Consider sending measurements from applications asynchronously (fire-and-forget, buffered) rather than waiting for confirmation on every single one — what does this trade away, and is that trade acceptable for this use case? **Level 2**: Research time-series-specific data storage, which is optimized specifically for append-only, timestamp-ordered writes and range queries — how does this differ from a general-purpose relational database's optimization target? **Level 3**: Research "downsampling" or "rollup" strategies, where raw high-resolution data is progressively aggregated into lower-resolution summaries as it ages. **Level 4**: A standard design has applications emit metrics asynchronously via a lightweight client library (batching and sending in the background, not blocking the request), ingested into a time-series-optimized data store; a background process periodically downsamples data older than a threshold (e.g., raw per-second data older than a day is aggregated into per-minute averages, then per-hour after a week); alerting runs as a separate process periodically querying recent aggregates against defined thresholds, not scanning raw data.

### Common Engineering Traps

- **Sending each metric synchronously from the application, waiting for platform acknowledgment before continuing the request** — what does this do to the monitored application's own latency, especially under the platform's own load or an outage?
- **Storing every raw measurement forever at full resolution with no downsampling** — what happens to storage costs and query performance over months or years of continuous operation?
- **Using a general-purpose relational database with the same indexing strategy you'd use for typical application data** — what specifically about this write pattern (extremely high volume, append-only, rarely updated) doesn't match what a general-purpose database optimizes for?
- **Implementing alerting by scanning the full raw dataset on every check** — how does this scale as data volume grows, and is there a cheaper way to check a threshold against recent data?

### Reflection Questions

- If this monitoring platform itself goes down, should the applications it monitors be affected in any way? What does your design guarantee here?
- How would you decide the right downsampling schedule — what's the actual tradeoff between storage cost and historical query precision?
- What's the difference between an alert that fires once when a threshold is crossed versus one that keeps firing repeatedly while the condition persists — which is more useful, and does it matter for this platform?

### Completion Checklist

- [ ] I have a non-blocking mechanism for applications to emit metrics without affecting their own latency.
- [ ] I have a downsampling or retention strategy that doesn't keep unbounded raw data forever.
- [ ] I have chosen a storage approach suited to a high-volume, append-only, time-ordered write pattern.
- [ ] I have an alerting design that doesn't require scanning the full raw dataset on every check.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
