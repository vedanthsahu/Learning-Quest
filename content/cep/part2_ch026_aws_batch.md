## 26. AWS Batch

> **Decision Snapshot** — Tier 2 · Compute · Verdict: the default choice for large-scale, queue-driven batch computation (data processing, simulations, ML preprocessing) where you want job scheduling and compute provisioning handled for you. Primary alternative: Step Functions + Lambda/ECS for a smaller number of orchestrated steps rather than a large volume of independent compute jobs.

### One-Line Summary
Runs a large volume of batch computing jobs on dynamically provisioned EC2 or Fargate capacity, queuing and scheduling them without you managing a cluster by hand.

### Category
Compute

### Tier
Tier 2

### What It Does
AWS Batch accepts job submissions into a queue, matches them against a compute environment (a managed EC2/Spot or Fargate capacity pool sized dynamically based on queue depth), and runs them as containers, handling retries and dependency ordering between jobs. It's purpose-built for the "I have a large number of independent (or dependency-graph-linked) computational jobs to run, and I don't want to manage the underlying cluster" problem — genuinely different from Step Functions' focus on orchestrating a smaller number of business-process steps.

### When Should I Use It?
- Large-scale, embarrassingly parallel batch computation: data transformation jobs, scientific simulations, video transcoding at scale, ML training/preprocessing pipelines.
- Workloads that benefit significantly from Spot capacity for cost savings, where Batch's native Spot integration (with automatic fallback) removes you from hand-managing that complexity.

### When Should I NOT Use It?
- A small number of business-process steps needing explicit orchestration/visibility — Step Functions (companion §20) fits that shape better.
- Workloads needing sub-second responsiveness — Batch is built for throughput-oriented batch computation, not low-latency request/response.

### Common Real-World Use Cases
- Nightly/scheduled large-scale data processing pipelines.
- ML training job queues, especially ones benefiting from GPU Spot capacity.
- Genomics, financial modeling, or rendering workloads with many independent, parallelizable jobs.

### Typical Architecture
```
Job Submission → Job Queue → Compute Environment (dynamically sized EC2/Spot/Fargate)
                                       ↓
                              [Job] [Job] [Job] ... (containers, run to completion)
                                       ↓
                                  S3 / Database (results)
```
The compute environment scales up as queue depth grows and back down to zero when idle — genuinely paying only for the compute actually consumed by queued work, rather than maintaining a standing fleet sized for peak batch volume.

### Important Concepts
- **Job queues and compute environments** — a queue is bound to one or more compute environments (which can mix On-Demand and Spot with automatic fallback); job priority across queues determines scheduling order when multiple queues share a compute environment.
- **Job definitions** — analogous to an ECS task definition (companion §3): the container image, resource requirements, and retry strategy for a given job type.
- **Array jobs and dependencies** — an array job runs the same job definition many times over a parameter range efficiently; explicit job dependencies let one job wait for another (or an array job's completion) before starting.
- **Spot integration** — Batch natively handles Spot interruption by automatically retrying an interrupted job, removing the interruption-handling complexity a hand-rolled Spot fleet would otherwise require you to build.

### Security Considerations
Scope each job definition's IAM role to exactly what that job type needs (the same per-task role discipline as ECS, companion §3) — a batch job processing sensitive data warrants the same least-privilege scrutiny as any other workload.

### Monitoring
Job status transitions (submitted → runnable → starting → running → succeeded/failed) and queue depth are the primary signals; a queue with jobs stuck in `RUNNABLE` for a long time usually indicates the compute environment isn't scaling up fast enough or has hit a capacity/quota limit.

### Scaling
Compute environments scale automatically based on queue depth, up to a configured maximum vCPU limit; the practical ceiling is usually an account-level EC2/Spot capacity limit (raisable via support request) rather than Batch itself.

### Cost Model
You pay only for the underlying EC2/Fargate/Spot compute consumed by running jobs — no charge for AWS Batch's own orchestration. Spot-based compute environments can meaningfully reduce cost for interruption-tolerant batch workloads, which is precisely the workload shape Batch is designed around.

### Common Mistakes
- Using Batch for a small number of steps needing explicit visibility/orchestration, where Step Functions would be a better fit.
- Not leveraging Spot for genuinely interruption-tolerant batch work, missing a substantial, low-effort cost saving.
- Under-provisioning the compute environment's maximum vCPU limit, causing jobs to queue far longer than the actual workload volume should require.
- Granting a broad, shared IAM role across all job definitions instead of scoping per job type.

### Migration Path
**From a hand-managed batch cluster**: the common direction, given the real operational cost of managing your own queue/scheduler/scaling logic for batch jobs. **To Step Functions**: if the actual need turns out to be a smaller number of orchestrated business steps rather than high-volume batch computation.

### Interview Questions
1. What's the practical difference between AWS Batch and Step Functions, given both can "orchestrate work"?
2. How does Batch handle Spot instance interruption automatically?
3. What's an array job, and what problem does it solve?
4. Why might jobs sit in a "RUNNABLE" state for an extended period, and how would you investigate it?
5. How would you design job definitions with appropriately scoped, per-job-type IAM roles?

### Python Example
```python
import boto3

batch = boto3.client("batch", region_name="us-east-1")

batch.submit_job(
    jobName="video-transcode-batch-001",
    jobQueue="transcoding-queue",
    jobDefinition="video-transcode-job-def",
    arrayProperties={"size": 100},   # runs the same job definition 100 times,
                                       # once per item in the batch, efficiently
    retryStrategy={"attempts": 2},
)
```
`arrayProperties={"size": 100}` submits 100 related jobs as a single array job rather than 100 individual `submit_job` calls — Batch schedules and tracks them as a cohesive unit, which is both operationally simpler and the intended, efficient way to express "run this same job definition across many independent inputs."

### Best Practices
- Use Spot-backed compute environments for interruption-tolerant workloads.
- Scope IAM roles per job definition, not shared broadly.
- Use array jobs for large numbers of structurally identical, independent jobs.
- Monitor queue depth and job-state transition times, not just job success/failure.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Managed Batch Computing | AWS Batch | Azure Batch | Batch on GCP (via Cloud Batch) |

---
