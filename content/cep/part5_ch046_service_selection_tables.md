## 46. Service Selection Tables

### 46.1 Purpose

A quick-lookup reference for "I need to do X" → "use Y" — the fast path for a decision that doesn't need the full deliberation of companion §47's hard-choice decision trees, because the answer is usually clear once the need is stated precisely.

### 46.2 Compute

| Need | Use | Chapter |
|---|---|---|
| Full OS control, custom kernel/GPU | EC2 | §1 |
| Short, event-driven, bursty | Lambda | §2 |
| Containerized, AWS-native orchestration | ECS | §3 |
| Containerized, portable/multi-cloud Kubernetes | EKS | §3 |
| Large-scale independent batch jobs | AWS Batch | §26 |
| Multi-step workflow with retries/branching | Step Functions | §20 |

### 46.3 Storage

| Need | Use | Chapter |
|---|---|---|
| Object storage (files, backups, static assets) | S3 | §4 |
| Block storage for a single instance | EBS | §5 |
| Shared filesystem across many instances | EFS | §28 |

### 46.4 Database

| Need | Use | Chapter |
|---|---|---|
| Standard relational database | RDS | §11 |
| High-throughput relational, many read replicas | Aurora | §12 |
| Known access patterns, unlimited scale, key-value | DynamoDB | §13 |
| In-memory cache/session store | ElastiCache | §21 |
| Data warehouse for complex analytical queries | Redshift | §33 |

### 46.5 Networking

| Need | Use | Chapter |
|---|---|---|
| DNS | Route 53 | §7 |
| CDN / edge caching | CloudFront | §8 |
| HTTP(S) load balancing | Application Load Balancer | §10 |
| Non-HTTP (TCP/UDP) load balancing | Network Load Balancer | §10 |
| API front door (Lambda-backed) | API Gateway | §9 |
| Isolated network / subnetting | VPC | §6 |

### 46.6 Messaging

| Need | Use | Chapter |
|---|---|---|
| Point-to-point work queue | SQS | §14 |
| Simple fan-out to multiple subscribers | SNS | §14 |
| Content-based routing across many event types | EventBridge | §15 |
| Ordered, replayable, high-volume streaming | Kinesis | §34 |

### 46.7 Security & Identity

| Need | Use | Chapter |
|---|---|---|
| AWS resource access control | IAM | §16 |
| Application secrets, auto-rotated | Secrets Manager | §17 |
| Non-secret configuration | Parameter Store | §22 |
| End-user authentication | Cognito | §24 |
| Edge request filtering (SQLi, XSS, rate limiting) | WAF | §27 |
| DDoS protection | Shield | §27 |

### 46.8 Observability & Governance

| Need | Use | Chapter |
|---|---|---|
| Logs, metrics, alarms | CloudWatch | §18 |
| Distributed tracing | X-Ray | §18 |
| API call audit trail | CloudTrail | §29 |
| Cost visibility and budget alerts | Cost Explorer / Budgets | §29 |
| Infrastructure provisioning | Terraform / CDK / CloudFormation | §19 |

### 46.9 Analytics

| Need | Use | Chapter |
|---|---|---|
| Ad hoc SQL over S3 data | Athena | §31 |
| ETL / data transformation | Glue | §30 |
| Sustained, complex BI workload | Redshift | §33 |
| Full-text/faceted search | OpenSearch | §25 |

### 46.10 How to Use This Chapter

If your need maps cleanly to one row, that's very likely the right starting answer — go read that service's chapter for the details (when *not* to use it, common mistakes, cost model) before committing. If your need seems to map to more than one row plausibly, or the "right" answer genuinely depends on scale/team/existing-investment factors, that's precisely what companion §47's decision trees exist for — this chapter is the fast path, not the complete one.

---
