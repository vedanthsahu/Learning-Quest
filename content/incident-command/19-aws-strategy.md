# 19 — AWS Strategy

## Status
Proposed. Direction (progressive adoption, starting once local system is correct) is Confirmed; exact topology/timing per phase is Proposed/Open.

## Posture

**2026-10-01 build-plan amendment:** [18-deployment-strategy](18-deployment-strategy.md) governs adoption order and gates; [25-build-blueprint](25-build-blueprint.md) governs implementation. Ollama plus free OpenRouter are sufficient for the core product. Bedrock is optional and not the first required AWS step. Existing per-service learning goals below are retained, including the frontend-hosting comparison, but dated credit amounts, Free Tier figures, and cost estimates must be checked in the actual account before provisioning. AgentNow remains an unverified candidate; older AgentRouter mentions are not a confirmed provider choice.
Real, budgeted AWS credits exist: **$100 USD, 161 days remaining as of 2026-09-02** (expires 2027-02-08 or on depletion), region **ap-south-1 (Mumbai)**. This makes AWS a genuine second track of the project, not a hypothetical. The governing principle is unchanged from the original charter and restated by the source brief's added context: **use a service because it teaches, validates, or provides real deployment/operational value — never because it's available or "looks good on the diagram."**

## Per-service scorecard (source brief's required format: why / learning / local equivalent / AWS-specific concerns / cost monitoring / required-or-experimental)

### Amazon Bedrock
- **Why**: a real model-gateway provider comparison point (latency, quality, cost) against Ollama (local) and OpenRouter/AgentRouter (free external).
- **Learning**: AWS-native model invocation, IAM-scoped model access, provider abstraction in practice.
- **Local equivalent**: Ollama/OpenRouter behind the same Model Gateway interface ([09-ai-engine-architecture](09-ai-engine-architecture.md)).
- **AWS-specific concerns**: per-token cost (real spend against the $100 credit — must be capped), model availability in ap-south-1 (verify before committing to a specific Bedrock model at implementation time), IAM permission scoping.
- **Cost monitoring**: a hard per-run/per-day call-count or spend cap in the model gateway from the moment Bedrock is wired in (same discipline as [ADR-010](adr/ADR-010-api-cloud-model-strategy.md)'s spend-cap requirement for any paid provider); CloudWatch billing alarm as a backstop.
- **Required or experimental**: Experimental/comparison — the routing thesis is fully demonstrable without Bedrock; it's a valuable *addition*, not a blocker.

### Amazon EC2 (hosting the Production Simulator)
- **Why**: creates real separation between "the system experiencing the incident" and "the system responsible for investigating it" — more meaningful than deploying the whole app to EC2, per the source brief's own framing.
- **Learning**: provisioning, security groups/networking, SSH/access management, running a real service outside the local dev loop.
- **Local equivalent**: the Simulator running as a local Docker service (see [22-production-simulator](22-production-simulator.md)) — same code, different host.
- **AWS-specific concerns**: instance sizing (a single small instance is sufficient — the simulator is a lightweight state generator, not real infra, see [22-production-simulator](22-production-simulator.md)), network reachability from the Python engine, idle-cost risk if left running (stop when not actively demoing/evaluating).
- **Cost monitoring**: use a small instance type, stop/start deliberately rather than leaving it running continuously; track hours via the AWS console/Cost Explorer.
- **Required or experimental**: Experimental initially, becomes part of the final integrated demo (Phase 7) if the earlier phases go well.

### Amazon RDS for PostgreSQL
- **Why**: real managed-database experience — connection handling, security groups, credentials, backups — directly relevant to the "enterprise backend" learning goal.
- **Learning**: managed DB operations, connection pooling against a network-hop DB, migrations against a real environment, backup/recovery concepts.
- **Local equivalent**: local PostgreSQL container — same schema, same `docker-compose` fallback if RDS is torn down between sessions to save cost.
- **AWS-specific concerns**: network configuration (VPC/security group access from wherever Spring Boot runs), credential/secrets handling (see [15-security-and-rbac](15-security-and-rbac.md)), instance-hours cost.
- **Cost monitoring**: smallest viable instance class (or Aurora Serverless v2 if idle-cost matters more than raw learning fidelity — evaluate at implementation time), stop when not in active use if the instance class supports it.
- **Required or experimental**: Experimental/learning-driven — the logical data model does not change because RDS is used (source brief explicit instruction); do not build a second data architecture for it.

### Amazon S3
- **Why**: already the object-storage abstraction locally via MinIO ([ADR-007](adr/ADR-007-s3.md)) — moving to real S3 is a config change, not a redesign.
- **Learning**: bucket policies, IAM scoping, real object lifecycle.
- **Local equivalent**: MinIO.
- **AWS-specific concerns**: minimal — S3 storage cost at this project's data volume is negligible relative to the $100 credit.
- **Cost monitoring**: negligible; monitor via Cost Explorer alongside everything else.
- **Required or experimental**: Low-risk, straightforward — reasonable to adopt early in the AWS phase.

### Frontend hosting — Amplify Hosting AND raw S3 static hosting, deliberately both
**Resolved** (2026-10-01, was TBD): deploy the same React app both ways, as a side-by-side comparison exercise, not because the app needs two hosting paths. This is accepted as deliberate redundancy for learning purposes — flagged explicitly as such, not a silent drift from "every technology earns its place."
- **Why**: the React app should have a real deployment, not remain permanently localhost-only; comparing the two paths is itself a learning goal the user asked for directly.
- **Learning (Amplify)**: managed build/deploy pipeline (connects to a git branch, builds on push), environment variables per branch, HTTPS/CDN handled for you.
- **Learning (raw S3 static hosting)**: manually wiring the build→upload→invalidate pipeline, bucket website-hosting config, optionally fronting it with CloudFront yourself — more manual, teaches what Amplify does under the hood.
- **Local equivalent**: local dev server / local static build.
- **AWS-specific concerns**: CORS configuration against the Spring Boot API's real endpoint (same for both paths), cache invalidation on redeploy (automatic with Amplify, manual with raw S3+CloudFront).
- **Cost monitoring**: negligible at this scale for either.
- **Required or experimental**: Straightforward, low-cost — Phase 6, both paths.

### Amazon SQS
- **Why**: decouples SLA-escalation detection (Lambda, below) from notification delivery — the Lambda just enqueues, a separate consumer handles actually sending, so a slow/failing notification channel never blocks the next scheduled check.
- **Learning**: queue-based decoupling, at-least-once delivery semantics, dead-letter queue concepts.
- **Local equivalent**: none currently (in-process notification dispatch, see [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md)) — this is additive, not a replacement for anything.
- **AWS-specific concerns**: queue visibility timeout tuning, DLQ setup so a poison message doesn't loop forever.
- **Cost monitoring**: negligible at this volume (first 1M requests/month free tier).
- **Required or experimental**: Experimental — part of the Lambda/SES escalation feature below, not required for the core product.

### Amazon SES
- **Why**: real email delivery for the "email" notification channel that [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) already listed as Good to Have ("behind a channel abstraction so Slack/email/webhook can be added without a redesign") — this is that channel, not a new idea.
- **Learning**: IAM role scoped to a single action (`ses:SendEmail`) on a verified identity, sandbox-mode email verification (SES starts in a sandbox that only sends to verified addresses until you request production access).
- **Local equivalent**: in-app notification only (current MVP).
- **AWS-specific concerns**: must verify a sender identity (email address or domain) before sending anything; stays in sandbox mode (verified recipients only) unless production access is explicitly requested — fine for a dev/demo project, don't bother requesting production access.
- **Cost monitoring**: negligible (SES free tier covers far more volume than this project will ever send).
- **Required or experimental**: Experimental — Good to Have notification channel, not required for the core routing/investigation thesis.

### AWS IAM
- **Why**: governs what AWS *infrastructure* can do — required the moment any real AWS resource exists. Kept explicitly separate from application RBAC (see [15-security-and-rbac](15-security-and-rbac.md)).
- **Required or experimental**: Required as soon as any other AWS service above is used — not optional or experimental.

### AWS observability (CloudWatch, or continuing to export the existing OpenTelemetry pipeline to a self-hosted collector even in AWS)
- **Why**: keep the trace/metrics story ([13-observability](13-observability.md)) intact once components are distributed across local + AWS.
- **Required or experimental**: Required once Phase 3+ introduces real network boundaries between components — a failure mode ("what changed when a network boundary was introduced") that's explicitly worth documenting per the source brief.

### Amazon Lambda — resolved use case: SLA-escalation checker
**Resolved** (2026-10-01, was conditional): the original candidate use case (`S3 upload -> Lambda -> document extraction -> embedding -> indexing`) still has no real trigger — no document-upload feature exists in [01-pdd](01-pdd.md)'s journeys, and it is **not** built speculatively. A different, genuinely justified use case replaces it:

```
EventBridge Scheduler (e.g., every 1 min)
   -> Lambda: scan incidents for SLA-deadline proximity
   -> SQS: enqueue one message per incident needing a notification
   -> consumer (could be the same Lambda, or a second one, or the backend
      polling the queue): send via SES
```

- **Why**: this is the actual implementation of the "Good to Have" SLA-percentage-consumed escalation tier from [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) — a real feature with a real trigger, not infrastructure in search of a use case.
- **Why Lambda specifically, not just another `@Scheduled` method in the already-running Spring Boot backend**: this is a genuine architectural choice, not forced — running it serverless means it keeps working even if the backend is down/restarting, and it's a clean, isolated place to practice IAM execution roles, EventBridge Scheduler, and SQS, which is the explicit learning goal here. The tradeoff (another moving part, another deploy target) is accepted deliberately for that reason.
- **Learning**: Lambda execution role scoping (DB read access + `sqs:SendMessage` on one queue, nothing broader), EventBridge Scheduler rule configuration, Lambda-to-RDS networking (Lambda needs VPC config to reach a non-public RDS instance, or the RDS security group needs to allow the Lambda's outbound range if RDS stays publicly accessible as set up in [24-aws-prerequisites-setup-guide](24-aws-prerequisites-setup-guide.md)).
- **AWS-specific concerns**: cold start latency (irrelevant here — this isn't latency-sensitive), Lambda's execution timeout (default 3s, raise it), connection pooling to RDS from a function that may run concurrently (keep the query simple and the Lambda's own concurrency low — this is a low-volume scheduled job, not a high-throughput API).
- **Cost monitoring**: negligible at this invocation frequency (Lambda free tier is 1M requests/month).
- **Required or experimental**: Experimental/learning-driven, same as SQS/SES above — not required for the core product thesis, built specifically for the hands-on IAM/Lambda/EventBridge/SQS/SES exposure.

## Explicitly not adopted regardless of credit availability
Kubernetes/ECS/EKS, Kafka/MSK, service mesh, multi-region deployment, complex autoscaling, managed queues without a demonstrated need — the credit budget does not change the "Not Now" list in [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md); it only funds the services already justified above.

## Incremental migration discipline
Each phase answers one concrete question before moving to the next (per source brief's explicit list): can the engine reliably invoke Bedrock; what's the latency/cost delta vs. Ollama/OpenRouter; can the incident system investigate an EC2-hosted simulator; what changes when Postgres moves to RDS; what belongs in S3 vs. Postgres; how do secrets/config differ local vs. AWS; what observability is needed once distributed; what failure modes appear at new network boundaries. Findings get written back into the relevant doc (this one, [07-system-architecture](07-system-architecture.md), [13-observability](13-observability.md)) as they're learned, not left implicit.

## Related docs
[00-project-charter](00-project-charter.md) (AWS posture) · [18-deployment-strategy](18-deployment-strategy.md) · [22-production-simulator](22-production-simulator.md) · [09-ai-engine-architecture](09-ai-engine-architecture.md) · [15-security-and-rbac](15-security-and-rbac.md) · [ADR-014](adr/ADR-014-dev-vs-deployment-architecture.md) · [24-aws-prerequisites-setup-guide](24-aws-prerequisites-setup-guide.md) (the console-by-console "how")
