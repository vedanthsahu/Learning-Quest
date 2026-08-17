## 51. Why Did My Auto Scaling Group Not Scale (or Scale Too Late)?

*(Prerequisite: companion §23 Auto Scaling, §10 Application Load Balancer)*

### 51.1 Symptoms
A fleet remains under-provisioned during a genuine traffic spike, with rising latency or error rates, while the Auto Scaling Group's actual instance count doesn't grow to match — or grows, but only after user-visible degradation has already occurred.

### 51.2 Possible Causes
Scaling on a metric (commonly CPU) that isn't actually well-correlated with the real bottleneck for this workload; a scaling cooldown period too long relative to how quickly load is actually changing; the ASG's configured maximum size being reached, capping further scale-out regardless of demand; new instance boot/initialization time itself being the source of the lag between "scaling triggered" and "capacity actually serving traffic"; an account-level EC2/Spot capacity limit being hit.

### 51.3 Metrics
`GroupDesiredCapacity` versus `GroupInServiceInstances` over time, overlaid against the actual load metric and the configured maximum size; scaling activity history showing exactly when scaling actions were triggered relative to when load actually rose.

### 51.4 Logs
Auto Scaling activity logs show the specific reason a scaling action did or didn't occur (e.g., "already at maximum capacity," "instance failed to launch due to capacity limit") — this is usually the fastest, most direct diagnostic source, often skipped in favor of guessing from CloudWatch metrics alone.

### 51.5 Investigation
Confirm whether the ASG actually attempted to scale and hit a configured maximum or account limit (visible directly in activity logs) versus never triggering a scaling action at all (suggesting the chosen metric/threshold doesn't reflect actual load). Check the time gap between a scaling action being triggered and new instances actually reaching a healthy, in-service state — if this gap is large, boot/initialization time, not the scaling policy itself, is the bottleneck.

### 51.6 Root Cause
In practice, the most common causes are: scaling on CPU for a workload whose actual bottleneck is something else entirely (e.g., a worker fleet actually bottlenecked on SQS queue depth, companion §23's own example), and the ASG's configured maximum size being set too conservatively for actual peak demand and never revisited as traffic grew.

### 51.7 Fix
Scale on the metric actually correlated with the real bottleneck — queue depth for a worker fleet, request-count-per-target for a web fleet behind an ALB, not CPU by default. Raise the ASG's maximum size to genuinely accommodate peak demand, informed by actual measured traffic, not a guess made at initial setup. Use a warm pool (companion §23) if boot/initialization time itself is the dominant source of scale-out lag.

### 51.8 Tradeoffs
A higher maximum size costs nothing unless actually scaled to (you pay for running instances, not headroom), so erring generous here is usually low-risk. Warm pools have their own standing cost (pre-initialized instances aren't free even if not yet "in service") — worth it specifically when boot time, not policy responsiveness, is the measured bottleneck.

### 51.9 Prevention
Review the ASG's maximum size against actual peak traffic on a recurring schedule, not only at initial setup. Choose scaling metrics deliberately based on the workload's actual bottleneck, validated by correlation with real incidents, not assumed by default. Load-test scale-out behavior specifically, not just steady-state capacity.

### 51.10 Decision Tree
```
Check the ASG's scaling activity log for this time window -- did it attempt to scale?
  NO scaling action triggered -> The metric/threshold likely doesn't reflect real
     load. Reconsider what metric actually correlates with this workload's bottleneck.
  YES, but hit max size or a capacity limit -> Raise max size / request a service
     quota increase, informed by actual measured peak demand.
  YES, scaled correctly, but new instances took a long time to become healthy ->
     Boot/initialization time is the bottleneck; consider a warm pool or a leaner AMI.
```

---
