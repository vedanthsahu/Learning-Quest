## 23. Auto Scaling

> **Decision Snapshot** — Tier 2 · Compute · Verdict: the default mechanism for matching EC2 (or ECS/EKS) capacity to actual demand automatically, and for automatically replacing unhealthy instances even at a fixed desired size. Primary alternative: none for EC2-based fleets — even a "fixed size" fleet should use an Auto Scaling Group for its health-replacement behavior alone.

### One-Line Summary
Automatically adds or removes EC2 instances (or ECS/EKS tasks, via their own analogous mechanisms) to match a target metric, and replaces unhealthy instances without manual intervention.

### Category
Compute

### Tier
Tier 2

### What It Does
An Auto Scaling Group (ASG) maintains a fleet of EC2 instances within a configured min/max/desired size, launching new instances from a launch template when scaling out, terminating instances when scaling in, and — critically, even at a fixed desired size — automatically replacing any instance that fails its health check. Scaling policies (target tracking on CPU or a custom CloudWatch metric, step scaling, or scheduled scaling for predictable patterns) determine when and how much to scale. Application Auto Scaling extends the same underlying concept to ECS services, DynamoDB tables, and several other scalable resources.

### When Should I Use It?
- Any EC2 fleet, even a "fixed size" one — the automatic unhealthy-instance replacement alone is worth adopting universally.
- Variable load where matching capacity to actual demand (rather than provisioning for peak permanently) meaningfully reduces cost.
- Predictable, scheduled load patterns (e.g., a batch job fleet only needed during business hours) via scheduled scaling.

### When Should I NOT Use It Alone
- Extremely fast-scaling needs (a true instant burst) where new-instance boot time is too slow — combine with a pre-warmed baseline or move the bursty portion to Lambda/Fargate instead.

### Common Real-World Use Cases
- Web application fleets scaling on CPU or request-count-per-target behind an ALB.
- Batch/worker fleets scaling on SQS queue depth (companion §14) rather than CPU, matching capacity to actual backlog.
- Scheduled scaling for known daily/weekly traffic patterns.

### Typical Architecture
```
CloudWatch Alarm (e.g., CPU > 70%) → Auto Scaling Policy → Auto Scaling Group
                                                                  ↓
                                                    [EC2] [EC2] [EC2] ... (adjusted count)
                                                                  ↓
                                                          ALB Target Group (registered automatically)
```
Health-check integration with the ALB (companion §10) means an ASG doesn't just react to load metrics — it also continuously replaces any instance the load balancer's own health checks mark unhealthy, closing the loop between "is this instance actually serving traffic correctly" and "should it still be part of the fleet."

### Important Concepts
- **Target tracking scaling** — the simplest, most common policy type: pick a metric and a target value (e.g., CPU at 60%), and the ASG adjusts capacity automatically to maintain it, without you defining explicit step thresholds.
- **Launch templates** — the AMI, instance type, security groups, and user data new instances launch with; versioned, so a new template version can be rolled out to new instances without affecting already-running ones.
- **Scaling cooldown** — a period after a scaling activity during which further scaling actions are paused, preventing rapid, oscillating scale-out/scale-in from a metric bouncing around a threshold.
- **Warm pools** — pre-initialized instances kept in a stopped or running-but-not-yet-in-service state, reducing the effective scale-out latency for workloads with slow boot/initialization.

### Security Considerations
The launch template's IAM instance profile and security groups apply to every instance the ASG launches — get this right once, in the template, rather than needing to remember to configure it per-instance. Since instances are routinely terminated and replaced, no instance-specific manual configuration should ever be load-bearing — anything an instance needs must come from the launch template/AMI/user data, not a one-off manual fix applied after the fact.

### Monitoring
`GroupDesiredCapacity`/`GroupInServiceInstances` versus min/max bounds, and scaling activity history (why did it scale, and when) are the direct diagnostic surface for companion §51's failure-engineering chapter ("why didn't my ASG scale, or why did it scale too late").

### Scaling
This service *is* the scaling mechanism for the rest of the fleet — its own "scaling" consideration is really about correctly choosing the scaling metric (CPU is a common default but not always the right signal — a queue-depth-based scaling policy for a worker fleet is often more directly correlated with actual backlog than CPU is) and setting realistic cooldown periods.

### Cost Model
No separate charge for the Auto Scaling Group itself — you pay only for the EC2 instances it launches. The cost benefit is indirect but real: matching capacity to actual demand, rather than provisioning permanently for peak, is one of the more straightforward, high-leverage cost optimizations available (companion §45's cost-optimized patterns chapter revisits this directly).

### Common Mistakes
- Scaling on CPU alone for a workload where CPU isn't actually the right proxy for load (a worker fleet whose real backlog signal is queue depth, not CPU utilization).
- Setting scaling thresholds and cooldowns too aggressively, causing oscillating scale-out/scale-in ("flapping") under normal, brief load variance.
- Forgetting that new instances need boot/initialization time — scaling policies that assume instant capacity availability will still see a real lag between "scale-out triggered" and "new capacity actually serving traffic."
- Manually patching a running instance instead of updating the launch template, losing that fix the next time the instance is replaced.

### Migration Path
Rarely outgrown at the mechanism level — the evolution is typically toward more sophisticated scaling policies (moving from a simple CPU target to a custom, more directly-correlated metric) as understanding of the workload's actual bottleneck matures, or toward ECS/EKS's own scaling (companion §3) if the workload has moved to containers.

### Interview Questions
1. Why should even a "fixed size" EC2 fleet use an Auto Scaling Group?
2. What's target tracking scaling, and how does it differ from step scaling?
3. Why might CPU be the wrong metric to scale a worker fleet on, and what would you use instead?
4. What's a scaling cooldown, and what problem does it prevent?
5. How do warm pools reduce effective scale-out latency?
6. What happens to a manually-applied fix on a running instance when the Auto Scaling Group replaces it?

### Python Example
```python
import boto3

autoscaling = boto3.client("autoscaling", region_name="us-east-1")

autoscaling.put_scaling_policy(
    AutoScalingGroupName="worker-fleet-asg",
    PolicyName="scale-on-queue-depth",
    PolicyType="TargetTrackingScaling",
    TargetTrackingConfiguration={
        "CustomizedMetricSpecification": {
            "MetricName": "ApproximateNumberOfMessagesVisible",
            "Namespace": "AWS/SQS",
            "Dimensions": [{"Name": "QueueName", "Value": "order-processing"}],
            "Statistic": "Average",
        },
        "TargetValue": 10.0,   # aim for ~10 messages per instance in the fleet
    },
)
```
Scaling on `ApproximateNumberOfMessagesVisible` (the SQS queue depth metric, companion §14) rather than CPU directly targets this specific worker fleet's actual bottleneck signal — a backlog of unprocessed messages — rather than a proxy metric that may or may not correlate well with real backlog for this particular workload.

### Best Practices
- Use an ASG even for fixed-size fleets, for its automatic health-replacement behavior alone.
- Choose a scaling metric that's actually correlated with the workload's real bottleneck, not just CPU by default.
- Push all instance configuration into the launch template/AMI; never rely on a manual post-launch fix.
- Tune cooldowns to avoid flapping under normal load variance.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Compute Auto Scaling | Auto Scaling Groups | Virtual Machine Scale Sets | Managed Instance Groups |

---
