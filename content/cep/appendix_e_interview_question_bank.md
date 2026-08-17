## Appendix E: Interview Question Bank

*Every chapter's interview questions, consolidated here by chapter for quick review before an interview, without needing to re-read every chapter in full.*

### Part I — Tier 1 Services

**§1 EC2**: Reserved vs. Savings Plan vs. Spot pricing · why low CPU can still mean a slow app · what IMDSv2 protects against · designing for Spot reclamation · status check types · why default metrics miss memory · choosing instance families · AMI vs. user data · credential rotation without static keys · instance-store vs. EBS on stop/terminate.

**§2 Lambda**: what causes cold starts and how to reduce them · why more memory can be faster and cheaper · safe DB connections under concurrency · account vs. function concurrency limits · Provisioned Concurrency tradeoffs · SQS-triggered failure handling · workflows beyond 15 minutes · risk of one broad execution role · VPC attachment and cold starts · Lambda vs. container decision.

**§3 Containers (ECS/EKS)**: ECS vs. EKS · Fargate vs. EC2 launch type · task roles/IRSA vs. shared roles · premature container kills during rollout · EKS cost vs. ECS · service-to-service communication design · Kubernetes RBAC vs. IAM · Lambda vs. container decision · bin-packing and cost · debugging a crash-looping-but-"healthy" service.

**§4 S3**: why S3 isn't mountable like EBS/EFS · presigned URLs · consistency model history · bucket policy vs. IAM policy vs. ACL · lifecycle policy design · Block Public Access as a default · investigating a cost spike · multipart upload · SSE-S3 vs. SSE-KMS · direct-to-S3 client upload design.

**§5 EBS**: EBS vs. instance store · AZ-locking and cross-AZ moves · IOPS vs. throughput · high latency despite available IOPS · snapshot mechanics · io2 vs. gp3 · termination behavior · why EFS exists for shared access.

**§6 VPC**: public vs. private subnet mechanics · stateful security groups vs. stateless NACLs · Peering vs. Transit Gateway · VPC Endpoints vs. NAT Gateway · debugging unreachable resources · CIDR planning · private vs. isolated subnet · subnet IP exhaustion · Flow Log usage · Lambda-in-VPC networking differences.

**§7 Route 53**: Alias vs. CNAME · failover health-check mechanics · TTL tradeoffs · weighted vs. latency-based routing · public vs. private hosted zones · testing failover proactively · passing health checks with an unhealthy app behind them.

**§8 CloudFront**: cache hit vs. miss · Origin Access Control necessity · diagnosing low hit ratio · Lambda@Edge vs. CloudFront Functions · invalidations vs. a real caching strategy · multi-origin distribution design · Origin Shield · WAF-at-CloudFront rationale.

**§9 API Gateway**: REST vs. HTTP API · authorizer types · Latency vs. IntegrationLatency · request validation's effect on Lambda invocations · usage plans · WebSocket API design · stages for environment promotion.

**§10 ALB**: NLB vs. ALB · path-based routing use case · target security groups referencing the ALB's SG · health-check mechanics · sticky sessions as a design smell · TargetResponseTime vs. client-observed latency · diagnosing rising 5XX rates.

**§11 RDS**: Multi-AZ vs. read replica · Lambda connection exhaustion and RDS Proxy · Performance Insights for slow queries · Multi-AZ cost tradeoff · point-in-time recovery vs. daily snapshots · RDS vs. Aurora · failover mechanics · password rotation without downtime.

**§12 Aurora**: what makes Aurora's replica lag lower · cluster vs. reader endpoint · Serverless v2 vs. provisioned · why Aurora failover is faster · does Aurora solve write scaling · Aurora Global Database · I/O-request cost consideration.

**§13 DynamoDB**: why no arbitrary WHERE clause · single-table design rationale · hot partition causes and fixes · GSI vs. primary key · On-Demand vs. Provisioned · Streams for event reactions · why it pairs naturally with Lambda · signal that DynamoDB was the wrong choice.

**§14 SQS & SNS**: SQS vs. SNS and why used together · visibility timeout effects · idempotency requirement · Standard vs. FIFO · dead-letter queue mechanics · SNS fan-out vs. EventBridge · multi-subscriber design · long vs. short polling.

**§15 EventBridge**: EventBridge vs. SNS routing model · event pattern matching · Schema Registry purpose · DLQ on a rule/target · default vs. custom vs. partner bus · differently-reacting-to-different-event-types design · EventBridge vs. Step Functions.

**§16 IAM**: trust policy vs. permission policy · role vs. long-lived access key · Access Analyzer for least privilege · managed vs. customer-managed policy · condition keys · root user policy · cross-account access design · how a workload actually obtains permissions.

**§17 Secrets Manager & KMS**: caching a fetched secret vs. fetching per-request · RDS auto-rotation mechanics · key policy vs. grant · envelope encryption rationale · customer-managed vs. default KMS key · detecting silent rotation failure · Secrets Manager vs. Parameter Store · logging secrets as an incident.

**§18 Observability (CloudWatch & X-Ray)**: EC2's default-metric gap · distinguishing "my code" from "what it calls" via tracing · metric/dimension/namespace · cardinality-explosion risk · composite alarms · X-Ray sampling tradeoff · Logs Insights use case · third-party APM vs. X-Ray.

**§19 IaC**: CloudFormation vs. CDK vs. Terraform · drift detection · plan/diff review importance · state-file loss risk · Terraform vs. CDK choice factors · CDK synthesis · securing the CI/CD provisioning role · multi-environment structuring.

### Part II — Tier 2 Services

**§20 Step Functions**: Standard vs. Express · per-state retry/catch vs. hand-rolled retries · direct service integration vs. Lambda wrapper · Map state · execution-history value · Express use case.

**§21 ElastiCache**: Redis/Valkey vs. Memcached · Multi-AZ failover behavior · hot key causes · cache-as-non-authoritative principle · evictions and undersizing.

**§22 Parameter Store & Systems Manager**: Parameter Store vs. Secrets Manager · Session Manager vs. bastion hosts · hierarchical naming value · session logging value.

**§23 Auto Scaling**: fixed-size fleets still needing an ASG · target tracking vs. step scaling · wrong scaling metric for a worker fleet · cooldown purpose · warm pools · manual fixes lost on replacement.

**§24 Cognito**: User Pools vs. Identity Pools · native JWT validation at API Gateway · Lambda trigger use case · Identity Pool role exposure · token lifetime tradeoff.

**§25 OpenSearch**: database full-text search vs. dedicated engine tradeoff · dual-write consistency problem · shard-count consequences · index lifecycle management · cluster health status meaning.

**§26 AWS Batch**: Batch vs. Step Functions · Spot interruption handling · array jobs · RUNNABLE-state stalls · per-job-definition IAM scoping.

**§27 WAF & Shield**: count-mode validation before block mode · Shield Standard vs. Advanced · rate-based rules vs. app-level limiting · consistent WAF placement · Shield Advanced cost protection scope.

**§28 EFS**: the gap EFS fills versus EBS/S3 · performance modes · Elastic throughput mode · access points for isolation · multi-AZ mount targets.

**§29 Account Governance**: management vs. data events · isolating CloudTrail logs from the audited account · tagging strategy for cost attribution · Organization Trail guarantee · automated detection of high-risk actions.

### Part III — Tier 3 Services

**§30 Glue**: Data Catalog's shared role · Lambda vs. Glue job choice · Crawler function.
**§31 Athena**: partitioning's effect on cost · Athena vs. standing up Redshift · relationship to the Glue Catalog.
**§32 EMR**: EMR vs. Glue choice factors · cluster-control tradeoff.
**§33 Redshift**: Redshift vs. Athena · OLAP vs. OLTP unsuitability · Spectrum's purpose.
**§34 Kinesis**: Kinesis vs. SQS · Data Streams vs. Firehose · shard's role in throughput.
**§35 AppSync**: AppSync/GraphQL vs. REST on API Gateway · subscriptions vs. custom WebSocket handling.
**§36 IoT Core**: device shadow purpose · rules-engine routing.
**§37 Pre-Built AI Services**: Rekognition vs. custom model training · Textract production use case · Lex within a broader conversational architecture.
**§38 SageMaker**: SageMaker vs. pre-built AI services · real-time endpoint vs. Batch Transform · Spot-based training fit.

### Part IV-VI — Patterns, Decisions, and Failure Engineering

Representative questions drawn from these Parts appear inline within each chapter (companion §39-56) rather than as a separate numbered list here, since they're framed as scenario/design questions ("how would you design...") rather than discrete Q&A pairs — read the specific pattern/decision-tree/failure chapter directly for the scenario in full.

---
