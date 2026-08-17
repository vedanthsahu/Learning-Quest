## 19. Infrastructure as Code on AWS: CloudFormation, CDK & Terraform

> **Decision Snapshot** — Tier 1 · Provisioning · Verdict: Terraform for multi-cloud or organizations with existing Terraform investment; CDK for AWS-only teams wanting infrastructure defined in a real programming language; CloudFormation directly only when you need its specific native features or are consuming a vendor-provided template. Primary alternative: none — provisioning production AWS infrastructure by hand through the console is not a real alternative for anything beyond a throwaway experiment.

### One-Line Summary
Every one of this book's services is, in real production practice, provisioned through code — CloudFormation (AWS-native), CDK (CloudFormation, generated from a real programming language), or Terraform (multi-cloud, its own HCL language) — not clicked together by hand in the console.

### Category
Provisioning

### Tier
Tier 1

### What They Do
**CloudFormation** is AWS's native infrastructure-as-code service: you write a declarative template (JSON or YAML) describing the desired resources, and CloudFormation creates, updates, or deletes them to match, tracking the current state as a "stack." **CDK** (Cloud Development Kit) lets you define that same underlying CloudFormation using a real programming language (Python, TypeScript, and others) — loops, conditionals, and reusable constructs replace copy-pasted template blocks, and CDK synthesizes an actual CloudFormation template underneath, so it inherits CloudFormation's execution model entirely. **Terraform** is a third-party (HashiCorp-originated, now under IBM) tool using its own declarative language (HCL) and its own state file, provisioning AWS (and every other major cloud, plus many non-cloud systems) through provider plugins — it's the closest thing to a cloud-agnostic IaC standard in wide production use.

### When Should I Use CloudFormation Directly
- Consuming an AWS-provided or vendor-provided Quick Start / SAM template as-is, with minimal customization.
- An organization already standardized on raw CloudFormation with significant existing template investment.

### When Should I Use CDK
- AWS-only infrastructure where your team wants real programming-language constructs (loops, conditionals, testable abstractions) rather than templating YAML.
- You want to define infrastructure and, in some cases, application code (e.g., Lambda function code alongside its infrastructure) in the same codebase and language.

### When Should I Use Terraform
- Multi-cloud or hybrid infrastructure, where one tool and one mental model spans AWS plus Azure/GCP/on-prem.
- An organization with existing Terraform investment/expertise — switching IaC tools has real migration cost that should be justified, not assumed.

### When Should I NOT Provision by Hand
Essentially never, for anything beyond a five-minute throwaway experiment — manual console changes are the single most common source of configuration drift (the running infrastructure silently diverging from what's documented/versioned anywhere), and are the direct subject of this chapter's core warning.

### Common Real-World Use Cases
- A CI/CD pipeline applying infrastructure changes automatically on merge to a main branch, with a plan/diff step requiring human review before apply.
- Reusable modules/constructs (a "standard VPC," a "standard ECS service") applied consistently across many projects/teams.
- Multi-environment (dev/staging/prod) infrastructure defined once, parameterized per environment, rather than three independently-maintained copies.

### Typical Architecture
```
Developer → Pull Request (Terraform/CDK/CloudFormation code change)
                  ↓
            CI Pipeline: plan/diff (shows exactly what would change, before it changes)
                  ↓ (human review + approval)
            CI Pipeline: apply
                  ↓
     AWS resources created/updated to match the code -- the code IS the source of truth
```
The plan/diff-before-apply step is the load-bearing safety mechanism in this whole workflow — it's what turns "did this change do what I expected" from a post-hoc discovery into a pre-apply review, and skipping it (applying directly without reviewing a plan) is how unintended, sometimes destructive changes (like an unplanned resource replacement) reach production.

### Important Concepts
- **State** — both CloudFormation (managed internally, per stack) and Terraform (a state file, typically stored remotely in S3 with locking via DynamoDB) track what currently exists so a subsequent apply knows what needs to change versus what's already correct; a lost or corrupted state file is a genuine, serious incident, since it's the tool's only record of reality.
- **Drift** — when real infrastructure diverges from what the IaC state/template describes (usually from a manual console change) — CloudFormation's drift detection and Terraform's `plan` both surface this, but only if run; drift that's never checked for is drift that silently accumulates.
- **Modules (Terraform) / Constructs (CDK) / Nested Stacks (CloudFormation)** — the reuse mechanism in each tool, letting a "standard VPC" or "standard ECS service" pattern be defined once and applied consistently rather than copy-pasted per project.
- **Immutable vs. mutable updates** — some resource changes update in place; others require CloudFormation/Terraform to replace the resource entirely (destroy and recreate) — a plan/diff step is what surfaces this distinction *before* it happens, since an unexpected replacement of a stateful resource (a database) is a genuinely dangerous, easy-to-miss category of change.
- **CDK synthesis** — CDK code doesn't provision anything directly; it synthesizes a CloudFormation template, which is then what actually gets deployed — understanding this makes CDK's behavior (and its debugging) much less mysterious.

### Security Considerations
The CI/CD pipeline's own IAM role (whichever tool applies the infrastructure change) is itself a high-value target — it typically needs broad permissions to create/modify/delete infrastructure, making it one of the most security-critical roles in the entire account; scope it as tightly as the actual set of resources it manages allows, and require human approval on the plan/diff before any apply reaches production. Store Terraform state remotely, encrypted, with access logging — a state file can contain sensitive values (though modern practice increasingly keeps genuine secrets out of state via references to Secrets Manager/Parameter Store instead).

### Monitoring
CloudTrail (companion §29) captures every API call the IaC tool makes, giving a full audit trail of infrastructure changes independent of the tool's own logs. For Terraform specifically, monitor state-lock contention/failures (a stuck lock blocks all future applies until resolved) and drift-detection results if run on a schedule.

### Scaling
The "scaling" concern here is organizational, not computational: as the number of stacks/modules/teams grows, the practical challenge becomes managing shared modules consistently, avoiding state-file/stack sprawl, and keeping apply times reasonable as a single stack grows very large (a common reason to split one large stack into several smaller, more focused ones).

### Cost Model
CloudFormation and CDK have no direct cost (you pay only for the resources they create). Terraform itself is free (open-source core); Terraform Cloud/Enterprise (HashiCorp's managed offering for remote state/collaboration) has its own separate pricing if adopted. The actual cost driver in every case is the infrastructure being provisioned, not the tool provisioning it.

### Common Mistakes
- Making a manual console change "just this once" to fix something urgently, introducing drift that the next apply either silently overwrites or unexpectedly conflicts with.
- Applying infrastructure changes without reviewing the plan/diff first, missing an unexpected resource replacement.
- Storing Terraform state locally (or in an unversioned, unlocked location), risking loss or concurrent-modification corruption.
- Granting the CI/CD pipeline's IaC role broader permissions than the resources it actually manages require.
- Letting one CloudFormation stack or Terraform root module grow unmanageably large instead of splitting it along natural boundaries.

### Migration Path
**Between tools**: migrating from CloudFormation/CDK to Terraform (or vice versa) is a genuine, non-trivial undertaking — typically justified by a multi-cloud requirement (favoring Terraform) or a desire for AWS-native feature parity and a programming-language-based workflow (favoring CDK), not undertaken lightly. **From manual/console-managed infrastructure**: the natural, common migration is importing existing resources into IaC state (both Terraform and CloudFormation support importing pre-existing resources) rather than tearing down and recreating everything.

### Interview Questions
1. What's the practical difference between CloudFormation, CDK, and Terraform?
2. What is infrastructure drift, and how would you detect and address it?
3. Why is reviewing a plan/diff before applying an infrastructure change a critical safety step?
4. What's the risk of losing or corrupting a Terraform state file, and how do you mitigate it?
5. When would you choose Terraform over CDK for a new AWS-only project, or vice versa?
6. What does it mean that CDK "synthesizes" a CloudFormation template, and why does that matter for debugging?
7. Why is the CI/CD pipeline's own IAM role for applying infrastructure changes a particularly sensitive one to scope correctly?
8. How would you structure infrastructure code to support multiple environments (dev/staging/prod) without three independently-maintained copies?

### Python Example
```python
# CDK (Python) -- a reusable construct for "an S3 bucket with sane, secure defaults,"
# applied consistently rather than each project reimplementing the same settings.
from aws_cdk import Stack, aws_s3 as s3, RemovalPolicy
from constructs import Construct

class SecureBucket(Construct):
    def __init__(self, scope: Construct, id: str, bucket_name: str):
        super().__init__(scope, id)
        self.bucket = s3.Bucket(
            self, "Bucket",
            bucket_name=bucket_name,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,   # secure by default,
            versioned=True,                                        # not opt-in
            removal_policy=RemovalPolicy.RETAIN,   # never accidentally destroyed on stack teardown
        )

class AppStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)
        SecureBucket(self, "Uploads", bucket_name="my-app-uploads")
```
`SecureBucket` bundles the secure-by-default settings this book's own S3 chapter (companion §4) argues for — Block Public Access, encryption, versioning — into one reusable construct, so every team using it inherits those defaults automatically rather than each project needing to remember and re-specify them individually.

### Best Practices
- Always review a plan/diff before applying; never apply blind.
- Store Terraform state remotely, encrypted, with locking enabled.
- Import pre-existing manually-created resources into IaC state rather than accumulating unmanaged drift.
- Scope the CI/CD pipeline's provisioning role tightly to what it actually manages.
- Build reusable modules/constructs for common patterns instead of copy-pasting configuration per project.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Native IaC | CloudFormation | Azure Resource Manager (ARM) / Bicep | Deployment Manager |
| Multi-Cloud IaC | Terraform | Terraform | Terraform |

---
