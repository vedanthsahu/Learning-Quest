## 45. Cost-Optimized Architecture Patterns

### 45.1 Pattern: Serverless-First for Unpredictable Load

```
API Gateway → Lambda → DynamoDB (On-Demand)
```
**When to choose this**: genuinely spiky, low-average, or unpredictable traffic, where every component's cost scales to exactly zero at zero load. **Tradeoff**: at sustained high volume, per-invocation/per-request serverless pricing can exceed the equivalent steady-state container/provisioned-capacity cost — this pattern's cost advantage is specifically at low-to-moderate, bursty volume, not universally.

### 45.2 Pattern: Spot-Backed Compute for Interruption-Tolerant Workloads

```
Auto Scaling Group / ECS / AWS Batch (companion §23, §3, §26)
       ↓ (mixed instance policy: On-Demand baseline + Spot for burst capacity)
   Workload tolerant of instance interruption with a 2-minute warning
```
**When to choose this**: batch processing, CI/CD runners, or stateless worker fleets that can tolerate an instance being reclaimed — Spot pricing can reduce compute cost substantially for genuinely interruption-tolerant work. **Tradeoff**: this pattern is fundamentally unsuitable for stateful, interruption-sensitive workloads (a database, a long-lived stateful connection) — applying it there trades reliability for savings in a way that isn't a fair exchange.

### 45.3 Pattern: Storage Tiering by Access Pattern

```
S3 Standard (hot, frequently accessed)
     ↓ (lifecycle policy, companion §4)
S3 Infrequent Access (accessed occasionally)
     ↓ (lifecycle policy)
S3 Glacier (rarely accessed, retrieval-time tolerant)
```
**When to choose this**: any data with a genuinely predictable access-frequency decay over time (logs, backups, completed-order records) — which describes most data most organizations store. **Tradeoff**: retrieval from colder tiers has real latency (and small retrieval cost) — data genuinely needed instantly at unpredictable times shouldn't be tiered down regardless of age.

### 45.4 Pattern: Right-Sized Reserved Capacity for Steady-State Load

```
Measure actual steady-state usage (CloudWatch, companion §18, over a real observation window)
       ↓
Purchase Savings Plans / Reserved Instances matched to that measured baseline
       ↓
Auto Scaling Group handles variance ABOVE the reserved baseline with On-Demand/Spot
```
**When to choose this**: any workload with a genuinely steady, predictable baseline load — committing to that baseline via Savings Plans/Reserved Instances while letting Auto Scaling absorb variance above it captures the discount without losing elasticity. **Tradeoff**: this requires actually measuring real usage before committing — a Reserved Instance purchase sized against a guess, not measured data, is a common source of paying for committed capacity that goes partly unused.

### 45.5 Decision Guidance
These four patterns aren't mutually exclusive — a mature, cost-conscious architecture typically combines all four: serverless or Spot for the right workload shapes, storage tiering for aging data, and reserved capacity for the measured, steady baseline underneath variable Auto Scaling. The common thread across all of them is measuring actual usage before optimizing — every one of these patterns, applied against a guess rather than real data, risks costing more than the naive alternative it was meant to improve on.

---
