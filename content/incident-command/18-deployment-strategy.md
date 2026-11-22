# 18 — Deployment Strategy

## Direction — 2026-10-01
Build and verify locally, then move a proven component for a specific learning objective and budget. The [build blueprint](25-build-blueprint.md) is the implementation sequence. Neither Bedrock nor AWS is required to demonstrate the product with Ollama and free OpenRouter models.

## Local baseline
React, Spring Boot, Python engine, and Python simulator are separate components. PostgreSQL/pgvector and MinIO provide persistence/artifacts. Current Docker Compose defines the two data services only; document app startup and package the other components later. PostgreSQL uses host port 5433. Redis and Kubernetes are not baseline requirements.

Before cloud work, the relevant feature must pass its local acceptance gate with reproducible commands and measurements. Tests use isolated databases. Configuration separates local/cloud storage and database endpoints from model-provider settings.

## Optional experiments
1. Account hygiene and budget visibility before billable provisioning; verify current credit/expiry.
2. S3 after local report export works; verify scoped upload/read and failure handling.
3. RDS after migrations and persistence pass locally; verify connectivity, migrations, restart persistence, and rollback/export.
4. EC2 simulator after authenticated read/action boundaries and the local recovery workflow pass; preserve trace IDs and test network failures.
5. Frontend hosting after authenticated backend HTTPS access exists. Preserve the requested Amplify versus raw-S3 learning comparison from [19-aws-strategy](19-aws-strategy.md), with an explicit experiment budget.
6. Bedrock only as a separately budgeted comparison if useful; it is not a prerequisite for other experiments.
7. Lambda/SQS/SES after local notification/escalation works, as optional learning extensions.

These are dependency gates, not a requirement to complete Levels 0–9 before any cloud test. Each experiment records expected cost, account/region, acceptance checks, and teardown/rollback steps. Remote components use the same contracts as local ones. Cloud hosting must not expose the laptop's Ollama endpoint publicly; remote inference topology requires a separate secure configuration decision.

## Related docs
[19-aws-strategy](19-aws-strategy.md) · [24-aws-prerequisites-setup-guide](24-aws-prerequisites-setup-guide.md) · [ADR-014](adr/ADR-014-dev-vs-deployment-architecture.md)
