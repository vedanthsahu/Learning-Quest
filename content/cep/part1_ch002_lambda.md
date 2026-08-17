## 2. Lambda

> **Decision Snapshot** — Tier 1 · Compute · Verdict: the default choice for short-lived, event-driven, or bursty workloads where you don't want to manage any server at all. Primary alternative: ECS/Fargate if execution time or memory needs exceed Lambda's limits, or if the workload is genuinely long-running/steady-state.

### One-Line Summary
Runs your code in response to an event, scales automatically from zero to thousands of concurrent executions, and bills per invocation and duration — no server to manage at all.

### Category
Compute

### Tier
Tier 1

### What It Does
Lambda executes a function you upload in response to a trigger — an HTTP request via API Gateway, a file landing in S3, a message on SQS/SNS/EventBridge, a scheduled cron-like rule, or a direct SDK invocation. Each invocation runs in an isolated execution environment with a configurable memory allocation (which also determines CPU share), a hard timeout (up to 15 minutes), and no guaranteed state between invocations. You pay for the number of invocations and the total compute time consumed, rounded to the nearest millisecond — nothing when it's idle.

### When Should I Use It?
- Event-driven glue: react to an S3 upload, a queue message, a scheduled trigger.
- Bursty or unpredictable traffic where paying for idle EC2/container capacity doesn't make sense.
- APIs with genuinely spiky or low-average traffic, fronted by API Gateway.
- Short, stateless processing steps in a larger pipeline.

### When Should I NOT Use It?
- Long-running processes exceeding 15 minutes, or workloads needing to hold persistent in-memory state across requests.
- Extremely latency-sensitive paths where cold starts (see §2's Important Concepts) are unacceptable and can't be mitigated.
- Steady, high, predictable load — at sustained high volume, a container fleet on Reserved/Savings-Plan pricing is usually cheaper than Lambda's per-invocation pricing.
- Workloads needing specific OS-level control, custom kernels, or GPU access at scale (Lambda supports some GPU-adjacent use via container images, but it's not the natural fit).

### Common Real-World Use Cases
- API backend behind API Gateway for low-to-moderate, bursty traffic.
- S3-triggered processing: thumbnail generation, virus scanning, format conversion.
- Scheduled jobs (via EventBridge rules) replacing cron.
- Stream processing consumers for Kinesis/DynamoDB Streams.
- Glue code between other AWS services in an event-driven architecture (companion §41).

### Typical Architecture
```
API Gateway → Lambda → DynamoDB / RDS (via RDS Proxy) / S3
                ↓
             CloudWatch Logs + X-Ray (companion §18)

S3 (upload event) → Lambda → [processing] → S3 (result) / SNS (notify)
```
Lambda functions almost always sit behind a trigger, not called directly by a client — and when a Lambda talks to a relational database, it should go through **RDS Proxy**, not a direct connection, since Lambda's concurrency model (§2 Important Concepts) can otherwise exhaust a database's connection limit in seconds under load.

### Important Concepts
- **Cold starts** — the first invocation (or one after a scale-up) pays the cost of initializing a new execution environment; this is the single most-discussed Lambda characteristic and the subject of companion §49's failure-engineering chapter.
- **Concurrency and throttling** — Lambda scales by running many concurrent execution environments; an account/function concurrency limit exists and, once hit, further invocations are throttled, not queued (unless the trigger itself buffers, like SQS).
- **Memory-to-CPU ratio** — CPU allocation scales linearly with configured memory; a CPU-bound function that seems "too slow" is very often simply under-provisioned on memory, not actually CPU-bound in a fundamental sense.
- **Statelessness between invocations** — anything outside the handler function (module-level code, a database connection) *may* persist across invocations on a warm environment, but this is never guaranteed and must never be relied on for correctness — only as a performance optimization (e.g., reusing a connection pool opportunistically).
- **Execution timeout** — hard cap, up to 15 minutes; a function approaching this ceiling routinely is a signal it should be redesigned as a Step Functions workflow (companion §20) or moved to a longer-running compute option.
- **Provisioned Concurrency** — pre-warms a set number of execution environments, trading cost for eliminating cold starts on that reserved capacity.

### Security Considerations
Lambda's execution role (IAM) should be scoped per-function, least-privilege — a shared, broad role across many functions is a common way one compromised function's blast radius becomes every function's blast radius. Environment variables can hold configuration but should never hold long-lived secrets directly (use Secrets Manager/Parameter Store, companion §17/§22, and cache the fetched value across warm invocations rather than fetching on every call). If a function needs VPC access (to reach RDS or an internal service), be aware this affects cold-start latency and requires careful ENI/subnet capacity planning.

### Monitoring
CloudWatch Logs are automatic per invocation; the key custom metrics to alarm on are **Errors**, **Throttles**, **Duration** (watch p99, not average — a distribution of mostly-fast, rarely-very-slow requests hides in an average), and **ConcurrentExecutions** approaching your account/function limit. X-Ray tracing (companion §18) is the fastest way to see whether time is spent in your code, in a downstream call, or in cold-start initialization specifically.

### Scaling
Lambda scales concurrency automatically and near-instantly up to your account's concurrency limit (a soft limit, raisable via support request). The real scaling constraint in practice is almost never Lambda itself — it's whatever Lambda talks to: a database connection pool, a downstream API's own rate limit, or a shared account-level concurrency ceiling being exhausted by an unrelated function sharing the account.

### Cost Model
Billed per invocation count plus GB-seconds (memory allocated × execution duration, rounded up to the nearest millisecond). Doubling memory to halve duration is cost-neutral at best and often a net win if it also reduces cold-start-driven retries — this is a genuinely counter-intuitive cost lever worth knowing. Provisioned Concurrency bills for reserved capacity whether invoked or not, trading Lambda's core "pay only when running" property for latency consistency.

### Common Mistakes
- Establishing a new database connection on every invocation instead of opportunistically reusing one across warm starts, exhausting the database's connection limit under concurrent load.
- Setting memory far too low for a CPU-bound function, then concluding "Lambda is slow" rather than recognizing the CPU allocation was the actual constraint.
- Ignoring p99 duration in favor of the average, missing a cold-start or throttling problem entirely.
- Putting a function in a VPC without accounting for the ENI-provisioning cold-start cost and subnet IP capacity.
- Using Lambda for a genuinely long-running, steady workload where a container is both cheaper and simpler.

### Migration Path
**Outgrowing it**: a function consistently approaching the 15-minute timeout, needing persistent state, or running at high, steady, predictable volume should move to ECS/Fargate. **Downgrading from it**: rare in practice — Lambda is usually the destination, not the origin, of a migration; a monolithic EC2/container endpoint with genuinely bursty, low-average traffic is the typical direction *into* Lambda.

### Interview Questions
1. What causes a Lambda cold start, and what are the levers to reduce its impact?
2. Why does increasing a Lambda function's memory sometimes make it both faster and cheaper?
3. How should a Lambda function safely connect to a relational database under high concurrency?
4. What's the difference between Lambda's account-level and function-level concurrency limits?
5. Why is Provisioned Concurrency a tradeoff, not a strictly-better option?
6. What happens to an SQS-triggered Lambda invocation that fails repeatedly?
7. How would you design a workflow that needs to run longer than Lambda's 15-minute limit?
8. What's the security risk of a single, broad IAM execution role shared across many functions?
9. Why can placing a Lambda function inside a VPC increase its cold-start latency?
10. How do you decide between Lambda and a container-based service for a new workload?

### Python Example
```python
import boto3
import os

# Reused across warm invocations -- established once, not per-request, avoiding
# connection-pool exhaustion under concurrent load (see Common Mistakes above).
_db_client = None

def get_db_client():
    global _db_client
    if _db_client is None:
        _db_client = boto3.client("rds-data")  # e.g. Aurora Serverless Data API
    return _db_client

def handler(event, context):
    db = get_db_client()
    order_id = event["pathParameters"]["order_id"]
    result = db.execute_statement(
        resourceArn=os.environ["DB_CLUSTER_ARN"],
        secretArn=os.environ["DB_SECRET_ARN"],   # fetched via Secrets Manager, not hardcoded
        database="orders",
        sql="SELECT status FROM orders WHERE id = :id",
        parameters=[{"name": "id", "value": {"stringValue": order_id}}],
    )
    return {"statusCode": 200, "body": str(result["records"])}
```
`_db_client` is declared at module scope specifically so it's initialized once per execution environment and reused across warm invocations, not recreated on every call — the exact pattern that avoids the connection-exhaustion mistake named above, while never assuming it persists (a cold start simply reinitializes it, safely).

### Best Practices
- Reuse connections/clients across warm invocations; never rely on it for correctness.
- Right-size memory by testing, not guessing — it directly sets CPU allocation.
- Alarm on p99 Duration and Throttles, not just Errors.
- Scope IAM execution roles per-function, least-privilege.
- Use RDS Proxy (or a serverless-native database like DynamoDB/Aurora Serverless) instead of direct RDS connections under concurrent load.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Serverless Function | Lambda | Azure Functions | Cloud Functions / Cloud Run Functions |

---
