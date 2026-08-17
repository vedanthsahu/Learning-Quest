## 16. IAM

> **Decision Snapshot** — Tier 1 · Security · Verdict: not optional — every single AWS API call is authorized (or denied) by IAM, whether you designed it deliberately or not. The real decision is how deliberately you scope permissions, not whether IAM is involved. Primary alternative: none — this is foundational, universal AWS security infrastructure.

### One-Line Summary
Identity and Access Management — who (or what) can do what, to which resources, under what conditions, across every single AWS API call.

### Category
Security

### Tier
Tier 1

### What It Does
IAM controls authentication (who/what is making a request — a human user, an application via an assumed role, another AWS service) and authorization (what that identity is allowed to do). Every single AWS API call, from every service in this book, is evaluated against IAM policies before it's permitted. Policies are JSON documents attached to users, groups, or (far more commonly, in any real production design) **roles** — a role has no long-lived credentials of its own; it's assumed temporarily by a user, an EC2 instance, a Lambda function, or another AWS service, receiving short-lived credentials that expire automatically.

### When Should I Use It?
Always — there is no opt-out. The actual design questions are: use roles instead of long-lived user credentials wherever possible, scope every policy to least privilege, and use groups (for humans) or dedicated per-workload roles (for services) rather than attaching policies to individual users or resources ad hoc.

### When Should I NOT Rely on Root/Broad Access
- Day-to-day operations should never use the account root user — it should be locked away (MFA-protected, credentials not routinely used) and reserved for a small number of actions that genuinely require it.
- Broad managed policies (like `AdministratorAccess`) attached to a workload's role "to make it work" is a real, common anti-pattern that should be treated as a temporary debugging measure, never a permanent solution.

### Common Real-World Use Cases
- EC2 instance roles, Lambda execution roles, ECS task roles — every piece of compute that talks to another AWS service does so via a role, never embedded static credentials.
- Cross-account access via role assumption, for a multi-account organization (companion §48).
- Federated human access via SSO/Identity Center, rather than individual IAM users with passwords.

### Typical Architecture
```
Human user → Identity Center (SSO) → Assumes a role → Temporary credentials
Lambda function → Execution role (attached at function config) → Temporary credentials
EC2 instance → Instance profile (a role) → Temporary credentials via IMDSv2 (companion §1)
                                                    ↓
                                    Every AWS API call evaluated against the role's policy
```
In a well-designed account, there are close to zero long-lived IAM user access keys in active use — humans authenticate via federated SSO, and workloads authenticate via roles, both yielding short-lived, automatically-rotating credentials rather than a static key that can leak and remain valid indefinitely.

### Important Concepts
- **Users, groups, roles, policies** — users are individual identities (increasingly, only for a small number of break-glass/legacy cases, not routine access); groups bundle policies for humans; roles are assumed temporarily by humans or services; policies are the JSON documents defining permissions, attachable to any of the above.
- **Managed vs. inline policies** — AWS-managed policies are maintained by AWS (convenient, but often broader than a specific use case needs); customer-managed policies are yours to define precisely; inline policies are embedded directly in a single principal, harder to reuse or audit at scale.
- **Trust policies** — a role's trust policy defines *who* is allowed to assume it (a specific service, account, or federated identity provider) — distinct from the role's permission policy, which defines what it can *do* once assumed; conflating the two is a common point of confusion.
- **Condition keys** — narrow a policy's effect further (e.g., only from a specific IP range, only with MFA present, only for resources tagged a specific way) — the mechanism behind genuinely fine-grained, context-aware access control.
- **IAM Access Analyzer** — proactively identifies resources shared outside your account/organization, and can generate a least-privilege policy based on actual observed CloudTrail activity — a concrete tool for closing the gap between "what a role is allowed to do" and "what it actually does."

### Security Considerations
This entire chapter is, functionally, a security chapter — the specific disciplines worth naming explicitly: enforce MFA on all human access, especially anything privileged; never embed long-lived access keys in code or configuration (every other Tier 1 service chapter in this book demonstrates the role-based alternative); use IAM Access Analyzer's policy generation to move from broad managed policies toward genuinely least-privilege customer-managed ones; audit unused roles/permissions periodically (a role granted once for a since-removed feature is a real, lingering attack surface).

### Monitoring
CloudTrail (companion §29) is IAM's actual audit trail — every API call, by which identity, is logged there; IAM itself doesn't have "metrics" in the CloudWatch sense so much as an audit and analysis surface (Access Analyzer, Credential Reports for unused/rotatable credentials) that should be reviewed on a schedule, not only after an incident.

### Scaling
IAM itself has no capacity concerns — the "scaling" challenge is organizational: as an account (or an organization of accounts) grows, policy sprawl and the difficulty of reasoning about "who can actually do what" grows with it. This is precisely why a deliberate multi-account strategy with centrally managed permission sets (companion §48) becomes necessary well before any technical IAM limit is ever reached.

### Cost Model
IAM itself is free. The cost consideration is entirely indirect: an over-permissioned identity is a security cost (larger blast radius on compromise), and Access Analyzer/Identity Center are also free — there's no cost-based reason to under-invest in least-privilege design here.

### Common Mistakes
- Attaching `AdministratorAccess` (or similarly broad managed policies) to a workload's role to unblock development, then never narrowing it afterward.
- Embedding a long-lived IAM user access key in application code or a config file instead of using a role.
- Confusing a role's trust policy (who can assume it) with its permission policy (what it can do), leading to either an unreachable role or an unintentionally over-shared one.
- Not enforcing MFA on privileged human access.
- Leaving unused roles/policies from removed features in place indefinitely, growing the account's actual attack surface without corresponding benefit.

### Migration Path
There's no service-level "outgrowing" IAM — the evolution here is organizational maturity: moving from individual IAM users toward federated SSO and role-based access, and from broad managed policies toward least-privilege customer-managed ones generated from Access Analyzer's observed-activity data, as an account/organization matures.

### Interview Questions
1. What's the difference between a role's trust policy and its permission policy?
2. Why is a role preferred over a long-lived IAM user access key for a workload?
3. How would you use IAM Access Analyzer to move a broad policy toward least privilege?
4. What's the difference between an AWS-managed policy and a customer-managed policy?
5. How do condition keys enable fine-grained, context-aware access control?
6. Why should the account root user not be used for routine operations?
7. How would you design cross-account access for a multi-account organization?
8. What's the actual mechanism by which an EC2 instance or Lambda function obtains its permissions?

### Python Example
```python
import boto3
import json

iam = boto3.client("iam")

# A least-privilege policy scoped to exactly one bucket and exactly the actions
# needed -- not a broad S3FullAccess managed policy attached out of convenience.
policy_document = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject"],
        "Resource": "arn:aws:s3:::my-app-uploads/*",
    }]
}

iam.put_role_policy(
    RoleName="order-service-task-role",
    PolicyName="upload-bucket-access",
    PolicyDocument=json.dumps(policy_document),
)

# The role's TRUST policy -- separate from the permission policy above --
# defines WHO can assume it (here, ECS tasks specifically).
trust_policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ecs-tasks.amazonaws.com"},
        "Action": "sts:AssumeRole",
    }]
}
```
The permission policy is scoped to exactly one bucket and exactly two actions (`GetObject`, `PutObject`) — not the broader `s3:*` or an AWS-managed `AmazonS3FullAccess` policy that would technically work but grants far more than this specific task role actually needs, directly implementing the least-privilege discipline this chapter argues for throughout.

### Best Practices
- Use roles, never long-lived access keys, for any workload.
- Federate human access via SSO; reserve the root user for genuine break-glass scenarios only.
- Enforce MFA on all privileged access.
- Use Access Analyzer's generated policies as a starting point for least privilege, then review and tighten further.
- Audit and remove unused roles/policies on a recurring schedule, not reactively.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Identity & Access Management | IAM | Azure Active Directory (Entra ID) + RBAC | Cloud IAM |

---
