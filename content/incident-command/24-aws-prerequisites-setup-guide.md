# 24 — AWS Prerequisites Setup Guide

## Status
Conditional provisioning reference, updated 2026-10-01. Use [18-deployment-strategy](18-deployment-strategy.md) for readiness gates and [25-build-blueprint](25-build-blueprint.md) for the build order. Start with account hygiene; execute later sections only for the experiment being undertaken in the personal AWS account. This is not a checklist to provision everything now. Detailed console instructions and historical Free Tier/credit assumptions below require current AWS documentation/account verification before use.

The initial model stack is installed Ollama Llama models plus free OpenRouter inference. Phase 2 (Bedrock) is optional; it does not block S3/RDS or the product workflow. Backend S3 region and a future Bedrock provider region are separate configuration concerns. The `backend/.env.example` referenced below was not found during the review: creating an accurate, non-secret configuration template is an implementation prerequisite, not a completed deliverable. Never put model-provider keys in frontend configuration.

## Before you start

- **Account**: your personal AWS account with the free trial credit ($100 USD / 161 days as of 2026-09-02, region **ap-south-1 / Mumbai** — see [00-project-charter](00-project-charter.md)).
- **Free Tier vs. credit**: these are two different things. **AWS Free Tier** is a standard allowance (mostly 12 months from account creation, some services "always free") that applies regardless of credit balance. The **$100 credit** is a separate balance that absorbs anything beyond Free Tier limits. Default to Free-Tier-eligible choices everywhere below so the credit lasts as long as possible — but double-check current Free Tier limits in the console (Billing → Free Tier) before relying on exact numbers, since AWS revises these periodically and this guide's figures may drift.
- **Region**: use **ap-south-1 (Mumbai)** everywhere for consistency, unless a specific step says otherwise (Bedrock model availability can require a different region — flagged where relevant).
- **Budget**: do Phase 0 (budget alarm) before creating anything billable. Non-negotiable ordering.
- **What "done" looks like**: by the end, you'll have real values for every placeholder in `backend/.env.example` (see the checklist at the bottom).

---

## Phase 0 — Account hygiene and cost guardrail

1. Sign in to the [AWS Console](https://console.aws.amazon.com) as **root**.
2. Enable MFA on the root user (IAM → Security credentials, or the prompt on first login). Then stop using root for anything except account-level tasks.
3. **Billing → Budgets → Create budget**:
   - Budget type: Cost budget
   - Amount: $90 (leave a ~$10 buffer under the $100 credit)
   - Alert thresholds: 50%, 80%, 100% — send to your email
4. **Billing → Billing preferences**: turn on "Receive Free Tier usage alerts" and "Receive Billing Alerts" if not already on.
5. Confirm the credit is actually applied: Billing → Credits, note the exact expiry date and remaining balance.

## Phase 1 — IAM: your day-to-day user

Don't do application work as root.

1. IAM → Users → Create user. Name: something like `vedanth-admin`.
2. Attach `AdministratorAccess` directly for now (a tighter least-privilege policy is future work, not a Phase-1 blocker for a single-operator project).
3. Enable console access + MFA for this user.
4. Create access keys for this user (IAM → your user → Security credentials → Create access key → "Command Line Interface (CLI)" use case) — needed for local `aws configure` if you want CLI access separate from the console.
5. From here on, do everything below as this IAM user, not root.

## Phase 2 — Amazon Bedrock: model access request

Free to request, no cost until you actually invoke a model.

1. Bedrock console → **Model access** (left sidebar).
2. Request access to at least one text-generation model. A reasonable starting set: an Anthropic Claude model and/or Amazon Titan/Nova — exact catalog shifts over time, pick what's available and reasonably priced per-token.
3. **Check region availability first**: Bedrock's model catalog varies by region. If your preferred model isn't offered in `ap-south-1`, you have two choices — call Bedrock cross-region (e.g., `us-east-1`) for just that API call while keeping everything else in Mumbai, or pick a model that IS available in `ap-south-1`. Either is fine; note which you picked, it affects the `AWS_REGION` the ai-engine's Bedrock client ultimately uses for that specific call.
4. Approval is usually near-instant for most models. Confirm status under Model access before moving on.
5. **IAM policy** (do this now, use later): create a customer-managed policy scoped to `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` on the specific model ARNs you requested — don't grant blanket Bedrock access. Attach it to a dedicated IAM user (not your admin user) for the application to use. Generate access keys for that user; these become `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` for the ai-engine's `.env` later (a separate `.env`/config from the backend's — see [09-ai-engine-architecture](09-ai-engine-architecture.md)).

## Phase 3 — RDS PostgreSQL

This directly produces the values in `backend/.env`.

1. RDS console → **Create database**.
2. Engine: **PostgreSQL**, latest stable version available.
3. Templates: **Free tier** (if offered for your account) — this auto-selects free-tier-eligible settings. If not offered, manually choose:
   - Instance class: `db.t3.micro` or `db.t4g.micro`
   - Storage: General Purpose SSD (gp3), 20 GB, disable storage autoscaling (keeps cost predictable)
   - Multi-AZ: **No** (single instance — Multi-AZ doubles cost and isn't needed here)
4. Settings:
   - DB instance identifier: `incidentcommand-dev` (or similar — becomes part of nothing user-facing, just a console label)
   - Master username: your choice (this becomes `DB_USER`) — e.g. `vedanth`
   - Master password: set a real one (becomes `DB_PASSWORD`) — generate something strong, store it somewhere safe (not just in `.env`, since that file could be lost)
5. Connectivity:
   - VPC: default is fine
   - Public access: **Yes**, for now — simplest path to connect from your local machine. (Tighten later: restrict the security group to your specific IP instead of leaving it fully open, and consider "No" + a bastion/VPN once this moves toward anything resembling production.)
   - VPC security group: create new, name it `incidentcommand-rds-sg`
   - Availability Zone: no preference
6. Database authentication: Password authentication.
7. Additional configuration:
   - Initial database name: `incidentcommand` (becomes `DB_NAME`) — **must** be set here; RDS doesn't let you create the initial DB after the fact without connecting and running `CREATE DATABASE` yourself.
   - Backup retention: 1 day is enough for a dev instance (reduces storage cost slightly)
   - Enable encryption: yes (free, no reason not to)
8. Create database. Wait for status **Available** (several minutes).
9. **Security group inbound rule**: EC2 → Security Groups → find `incidentcommand-rds-sg` → Edit inbound rules → Add rule: Type `PostgreSQL`, Port `5432`, Source = **My IP** (not `0.0.0.0/0` — don't leave this open to the internet). You'll need to update this rule if your IP changes (home vs. office network, etc.).
10. Note the **endpoint** shown on the DB instance's detail page (looks like `incidentcommand-dev.xxxxxxxxxx.ap-south-1.rds.amazonaws.com`) — this is `DB_HOST`.
11. **Enable pgvector**: once you can connect (see Phase 7 for connection test), run `CREATE EXTENSION IF NOT EXISTS vector;` — RDS PostgreSQL ships pgvector as an allow-listed extension, no special setup needed beyond this one command. (The project's Flyway migrations don't do this automatically yet — see [ADR-006](adr/ADR-006-milvus.md); run it manually for now if/when retrieval work starts.)

## Phase 4 — S3

1. S3 console → **Create bucket**.
2. Bucket name: globally unique, e.g. `incidentcommand-artifacts-<your-name>-dev` (becomes `AWS_S3_BUCKET`).
3. Region: `ap-south-1`.
4. Block all public access: **keep this ON** (default) — nothing in this project needs public object access.
5. Bucket versioning: off (not needed for dev artifacts).
6. Encryption: default (SSE-S3) is fine.
7. Create bucket.
8. **IAM policy**: create a customer-managed policy scoped to `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` on this specific bucket ARN (and `arn:...:bucket-name/*` for objects). Attach to the same application IAM user from Phase 2, or a dedicated one — your call, but don't reuse your admin user's keys in the app's `.env`.

## Phase 5 — EC2 (for the Production Simulator) — do this later, not now

Flagged here for completeness, but per [19-aws-strategy](19-aws-strategy.md) this is Phase 3 of the *application's* AWS adoption (after Bedrock/RDS/S3 basics are proven) — don't provision it yet. When you get there:

1. EC2 console → Launch instance.
2. AMI: Ubuntu Server (latest LTS), free-tier eligible.
3. Instance type: `t2.micro` or `t3.micro` (free-tier eligible, 750 hrs/month for 12 months on a new account).
4. Key pair: create new, download the `.pem`, keep it safe (needed for SSH).
5. Security group: allow inbound SSH (22) from **My IP** only, and whatever port the simulator listens on (8090) from wherever the ai-engine will call it from — if the ai-engine stays local for now, this means your own IP again; if the ai-engine also moves to AWS, scope it to that resource's security group instead, not the open internet.
6. **Cost discipline**: stop the instance (not just the app) when not actively testing — EC2 bills by the hour while running, regardless of CPU usage.

## Phase 6 — Lambda + EventBridge Scheduler + SQS + SES (SLA-escalation checker) — do later, after Phases 0–4 are solid

See [19-aws-strategy](19-aws-strategy.md) "Amazon Lambda" / "Amazon SQS" / "Amazon SES" for why this exists (it's the real implementation of the Good-to-Have email escalation channel from [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md), not infrastructure for its own sake). Order matters below — build the queue and the verified sender before the function that uses them.

1. **SQS queue first**: SQS console → Create queue → Standard queue → name `incidentcommand-sla-notifications-dev`. Default settings are fine for this volume. Also create a dead-letter queue (`incidentcommand-sla-notifications-dlq-dev`) and configure the main queue's redrive policy to send to it after ~3 failed receives — this is the actual DLQ learning point, don't skip it.
2. **SES sender identity**: SES console → Verified identities → Create identity → Email address (use your own email for dev). Check your inbox, click the verification link. SES starts in **sandbox mode** — it will only send to other verified addresses. That's fine for a dev project; don't request production access.
3. **IAM role for the Lambda** (create before the function, so you can attach it at creation time): IAM → Roles → Create role → Trusted entity: Lambda. Attach:
   - `AWSLambdaBasicExecutionRole` (AWS managed — CloudWatch Logs access, needed for any Lambda)
   - A customer-managed policy scoped to `sqs:SendMessage` on the queue ARN from step 1
   - A customer-managed policy scoped to RDS read access appropriate to how you connect (if using the Data API or a direct JDBC-style connection from the function, scope narrowly to what's actually needed — avoid `rds:*`)
   - A customer-managed policy scoped to `ses:SendEmail` / `ses:SendRawEmail` on the verified identity's ARN (needed if this same Lambda also sends the email directly rather than a second consumer doing it — simplest to start with one Lambda doing both enqueue-and-send for a dev project, matching your screenshot's pattern of one function with a scheduler trigger and a queue destination)
4. **Lambda function**: Lambda console → Create function → Author from scratch → name `incidentcommand-sla-escalation-dev` → runtime: Python or Node (your call) → execution role: use the existing role from step 3.
5. **Trigger**: Add trigger → EventBridge Scheduler → new schedule, rate expression e.g. `rate(1 minute)` for dev/demo purposes (tune later).
6. **Destination** (optional, matches your screenshot's pattern): Add destination → On success/failure → SQS queue from step 1, if you want the queue to receive the Lambda's *output* rather than (or in addition to) the function itself calling `sqs:SendMessage` directly — either pattern is valid, pick one and be consistent.
7. Write the function logic once the rest of this phase is provisioned (this is an implementation task, not a console-setup one — flag it back when you're ready and it gets built against these real resources).

## Phase 7 — Frontend hosting — both paths, deliberately, as a comparison exercise

Not needed until the React app has something worth deploying. When you get there:

### 7a. Amplify Hosting
1. Amplify console → Create new app → Host web app.
2. Connect your git repository (GitHub) and the branch to deploy.
3. Amplify auto-detects the Vite/React build settings; review and confirm.
4. Add environment variables (e.g., the backend API URL) under App settings → Environment variables.
5. Deploy. Amplify handles the CDN/HTTPS/cache invalidation on every push automatically — that's the entire point of comparing it against 7b.

### 7b. Raw S3 static hosting
1. Build the frontend locally (`npm run build` in `frontend/`).
2. S3 console → Create bucket → name e.g. `incidentcommand-frontend-<your-name>-dev`, region `ap-south-1`.
3. This bucket needs public read access for website hosting — **this is the one legitimate exception** to "block all public access" in this whole guide. Uncheck "Block all public access" for this bucket specifically, and add a bucket policy allowing `s3:GetObject` for everyone (`Principal: "*"`) on this bucket's objects only.
4. Properties → Static website hosting → Enable → Index document: `index.html` → Error document: `index.html` (SPA routing needs this so deep links don't 404).
5. Upload the `frontend/dist/` contents to the bucket (console upload, or `aws s3 sync dist/ s3://bucket-name/` via CLI).
6. Note the "Bucket website endpoint" URL shown in that same Properties panel — that's your raw-S3 URL, separate from Amplify's.
7. (Optional, more learning) Front it with CloudFront for HTTPS + real CDN behavior — raw S3 website endpoints are HTTP-only, which is a real, honest limitation worth seeing directly before adding CloudFront to fix it.

## Phase 8 — Connect and verify

Do this before considering any phase "done" — an unverified credential is not a completed prerequisite.

1. Test the RDS connection from your machine (adjust to whatever client you have — `psql`, a GUI tool, or just let the backend try):
   ```
   psql "host=<DB_HOST> port=5432 dbname=incidentcommand user=<DB_USER> sslmode=require"
   ```
   It should prompt for the password and connect. If it hangs or refuses, the security group inbound rule (Phase 3, step 9) is the most likely culprit — confirm your current public IP matches what's allowed.
2. Fill in `backend/.env` (copy from `backend/.env.example` if you haven't already) with the real values — see the mapping table below.
3. Run the backend with `--spring.profiles.active=postgres` and confirm it starts cleanly (Flyway migrations should run automatically against the fresh RDS database — see `backend/src/main/resources/db/migration/`).
4. For S3: a quick manual test is fine — trigger any incident resolution locally (per the existing Scenario A walkthrough) and check the bucket for a new `incident-reports/<id>.json` object.
5. For Bedrock: hold off until the ai-engine's `OpenRouterRepository`-equivalent for Bedrock is actually implemented (not built yet — see `docs/adr/ADR-010-api-cloud-model-strategy.md`); for now, just confirm model access shows **Access granted** in the Bedrock console.

---

## Checklist: what feeds into `backend/.env`

| `.env` variable | Comes from |
|---|---|
| `DB_HOST` | RDS instance endpoint (Phase 3, step 10) |
| `DB_NAME` | RDS "Initial database name" (Phase 3, step 7) — `incidentcommand` |
| `DB_USER` | RDS master username (Phase 3, step 4) |
| `DB_PASSWORD` | RDS master password (Phase 3, step 4) — store it somewhere durable, not just in `.env` |
| `DB_PORT` | `5432` (default, unchanged) |
| `DB_SSLMODE` | `require` (default, unchanged — RDS supports SSL out of the box) |
| `AWS_REGION` | `ap-south-1` (or wherever you ended up for Bedrock specifically — see Phase 2, step 3) |
| `AWS_S3_BUCKET` | Bucket name from Phase 4, step 2 |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Access keys for the scoped application IAM user (Phase 2 step 5 / Phase 4 step 8) — **not** your admin user's keys |

## What this guide deliberately does not cover

Secrets Manager (noted as a later evaluation in [15-security-and-rbac](15-security-and-rbac.md), not required for this stage), VPC customization beyond the default, CloudFront fronting the raw S3 site (optional stretch goal in Phase 7b, not required), any multi-AZ/HA setup — none of this is justified yet per [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md). Lambda/SQS/SES/Amplify/raw-S3-hosting are now covered above (Phases 6–7), not deferred-without-a-plan — they're just sequenced *after* the Phase 0–4 basics, not done immediately.

## Related docs
[19-aws-strategy](19-aws-strategy.md) · [00-project-charter](00-project-charter.md) · [15-security-and-rbac](15-security-and-rbac.md) · [18-deployment-strategy](18-deployment-strategy.md)
