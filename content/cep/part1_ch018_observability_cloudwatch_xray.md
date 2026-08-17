## 18. Observability on AWS: CloudWatch & X-Ray

> **Decision Snapshot** — Tier 1 · Observability · Verdict: CloudWatch is non-optional — it's the default destination for logs/metrics/alarms across nearly every AWS service. X-Ray (or a third-party APM) is where you add distributed tracing once a request crosses more than a couple of services. Primary alternative: a third-party observability platform (Datadog, Honeycomb, etc.) layered on top of or instead of X-Ray specifically, once you outgrow AWS-native tracing's feature set.

### One-Line Summary
CloudWatch collects logs, metrics, and alarms across almost every AWS service by default; X-Ray traces a single request as it moves across multiple services, showing exactly where time is actually spent.

### Category
Observability

### Tier
Tier 1

### What They Do
**CloudWatch** is the default, near-universal home for logs (Logs), metrics (both service-emitted and custom application metrics), and alarms (triggering an action — an SNS notification, an Auto Scaling policy — when a metric crosses a threshold). Nearly every service in this book emits its own CloudWatch metrics automatically; this is why every chapter's "Monitoring" section could point here as the default answer to "where do I look." **X-Ray** adds distributed tracing: it follows a single request as it crosses service boundaries (API Gateway → Lambda → DynamoDB, for instance), producing a trace showing exactly how much time was spent in each hop — the direct, concrete way to answer "is this slow because of my code, or because of what my code is calling" (directly the diagnostic instinct companion Python Backend Handbook §70 teaches generally, applied here at the AWS-service-boundary level specifically).

### When Should I Use CloudWatch
Always — it's the default, and largely automatic, observability layer for AWS resources. The deliberate work is in configuring custom metrics/alarms for what's actually business-relevant, not just accepting service defaults uncritically.

### When Should I Use X-Ray
- Any request path crossing more than one or two services, where "where is the time actually going" isn't obvious from CloudWatch's per-service metrics alone.
- Debugging a specific slow-request pattern that's hard to reproduce from aggregate metrics.

### When Should I NOT Rely on Defaults Alone
- Default CloudWatch metrics for a given service are often a starting point, not the full picture (companion §1's EC2 chapter names memory/disk metrics as a specific, common gap requiring the CloudWatch Agent) — check what's actually included before assuming visibility exists.
- If your organization already runs a mature third-party APM (Datadog, Honeycomb, New Relic), layering X-Ray on top may be redundant — pick one primary tracing system, not two independently-maintained ones.

### Common Real-World Use Cases
- Custom application metrics (business KPIs, not just infrastructure metrics) pushed to CloudWatch and alarmed on.
- Centralized log aggregation via CloudWatch Logs, searchable via Logs Insights.
- Distributed tracing across a Lambda-based microservices architecture via X-Ray, correlating a slow end-user request to a specific downstream call.

### Typical Architecture
```
Application → CloudWatch Logs (structured logs, correlation ID per companion
                                Python Backend Handbook §64)
           → CloudWatch Metrics (custom + service-emitted)
                    ↓
              CloudWatch Alarms → SNS (notify) / Auto Scaling (react)

Request → API Gateway → Lambda → DynamoDB
              ↓ (X-Ray trace segments stitched together across the whole path)
         X-Ray Trace: total 340ms (API GW: 5ms, Lambda init: 80ms, Lambda exec: 40ms, DynamoDB: 215ms)
```
The X-Ray trace breakdown is the direct mechanism for distinguishing "the Lambda function itself is slow" from "the Lambda function is fast but DynamoDB is slow" — exactly the ambiguity a raw end-to-end latency number alone can't resolve.

### Important Concepts
- **Metrics, dimensions, and namespaces** — a metric (e.g., `CPUUtilization`) is scoped by dimensions (which instance) within a namespace (which service); custom application metrics use the same model via `PutMetricData`.
- **Logs Insights** — a query language over CloudWatch Logs, letting you ask ad-hoc questions ("show me all 5xx responses in the last hour, grouped by endpoint") without exporting logs elsewhere first.
- **Alarms and composite alarms** — a single-metric alarm crosses a threshold; a composite alarm combines multiple alarms with boolean logic, reducing noisy, single-metric-triggered pages for conditions that are only genuinely actionable in combination.
- **X-Ray segments and subsegments** — a segment is one service's contribution to a trace; subsegments break that down further (e.g., a specific downstream call within a Lambda's execution) — instrumenting subsegments around specific downstream calls is what makes a trace actually diagnostic rather than just "this Lambda took 340ms total."
- **Sampling** — X-Ray doesn't trace every single request by default at high volume (cost and overhead); a sampling rule determines what fraction is traced — tuning this is a real tradeoff between visibility and cost.

### Security Considerations
CloudWatch Logs can contain sensitive data if application logging isn't disciplined about what it writes (this is an application-level responsibility, not a CloudWatch feature) — never log secrets (companion §17) or unredacted PII into CloudWatch Logs. Scope IAM permissions for `PutMetricData`/log-writing narrowly per workload, and restrict who can read logs containing potentially sensitive application data.

### Monitoring
This chapter is itself about monitoring — the recursive question worth asking is "who's monitoring the monitoring": alarm on log delivery failures and ensure critical alarms have a tested, working notification path (an alarm that fires into an SNS topic nobody's subscribed to is a common, quietly-broken safety net).

### Scaling
Both scale automatically to high log/metric/trace volume with no capacity to provision. The practical scaling consideration is cost and signal-to-noise at very high volume (companion Software Systems Handbook §71's cardinality-explosion discussion applies directly to CloudWatch custom metrics with too many unique dimension combinations) and X-Ray sampling rate tuning to keep tracing cost proportional to its actual diagnostic value.

### Cost Model
CloudWatch bills for log ingestion and storage (per GB), custom metrics (per metric per month), and alarms (per alarm per month) — a large number of high-cardinality custom metrics is a common, underestimated cost driver. X-Ray bills per trace recorded and retrieved — sampling rate directly controls this cost.

### Common Mistakes
- Assuming a service's default CloudWatch metrics are the complete picture without checking what's actually included (companion §1's memory-metric gap is the canonical example).
- Creating custom metrics with unbounded-cardinality dimensions (e.g., a dimension per unique user ID), causing a cardinality explosion in both cost and query performance.
- Configuring an alarm that fires into an SNS topic with no subscribers, silently having no effect during a real incident.
- Not instrumenting X-Ray subsegments around specific downstream calls, ending up with a trace that shows total time but not where within it the time went.
- Running two independently-maintained tracing systems (X-Ray and a third-party APM) without a clear reason, doubling instrumentation effort for no added visibility.

### Migration Path
**Outgrowing X-Ray specifically**: organizations needing more sophisticated distributed-tracing analysis, longer retention, or a single pane of glass across multi-cloud infrastructure commonly move to a dedicated third-party APM, using OpenTelemetry (companion Python Backend Handbook §65) as the vendor-neutral instrumentation layer underneath, so the switch doesn't require re-instrumenting application code. **CloudWatch itself**: rarely outgrown for the AWS-native metrics/logs/alarms it's the default destination for, even in organizations that layer additional tools on top.

### Interview Questions
1. What's missing from EC2's default CloudWatch metrics, and how do you get it?
2. How does X-Ray help distinguish "my code is slow" from "what my code calls is slow"?
3. What's the difference between a metric, a dimension, and a namespace in CloudWatch?
4. Why might a high-cardinality custom metric cause both cost and performance problems?
5. What's a composite alarm, and what problem does it solve over single-metric alarms?
6. How does X-Ray sampling work, and what's the tradeoff in tuning it?
7. What's CloudWatch Logs Insights, and when would you reach for it over exporting logs elsewhere?
8. Why would an organization choose to layer a third-party APM on top of (or instead of) X-Ray?

### Python Example
```python
import boto3
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

patch_all()  # auto-instruments boto3 calls as X-Ray subsegments

cloudwatch = boto3.client("cloudwatch", region_name="us-east-1")

def handler(event, context):
    with xray_recorder.in_subsegment("process_order"):
        order = process_order(event["order_id"])   # this specific step is now
                                                      # separately visible in the trace

    cloudwatch.put_metric_data(
        Namespace="OrdersService",
        MetricData=[{
            "MetricName": "OrdersProcessed",
            "Value": 1,
            "Unit": "Count",
            "Dimensions": [{"Name": "Environment", "Value": "production"}],  # bounded cardinality
        }],
    )
    return order
```
The `Dimensions` list uses `Environment` (a small, fixed set of values) rather than something like a per-order or per-user identifier — directly avoiding the cardinality-explosion mistake named above, and `xray_recorder.in_subsegment` gives this specific processing step its own visible slice of the trace rather than being invisibly bundled into the function's total execution time.

### Best Practices
- Explicitly check what a service's default metrics do and don't include, rather than assuming full visibility.
- Keep custom metric dimensions low-cardinality and bounded.
- Test that every alarm's notification path actually has a subscriber.
- Instrument X-Ray subsegments around specific downstream calls, not just at the function boundary.
- Tune sampling rate deliberately, balancing tracing cost against diagnostic value.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Metrics/Logs/Alarms | CloudWatch | Azure Monitor | Cloud Monitoring / Cloud Logging |
| Distributed Tracing | X-Ray | Application Insights | Cloud Trace |

---
