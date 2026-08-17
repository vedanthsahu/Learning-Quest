## §69. IAM Roles & Policies: AWS-Specific Mechanics

### 1. The Vocabulary

- **IAM user** — a long-lived identity with its own credentials, typically for a human.
- **IAM role** — a temporarily-assumable identity with no long-lived credentials of its own —
  the standard, preferred way for a service (an EC2 instance, a Lambda function) to get
  permissions.
- **Policy** — a JSON document listing specific allowed (or denied) actions on specific resources.
- **Trust policy** — defines *who* (or what) is allowed to assume a role, separate from the
  role's *permission policy*, which defines what it can actually do once assumed.
- **Instance profile** — the mechanism that attaches an IAM role to an EC2 instance so code
  running on it can assume that role automatically.

### 2. Where It Sits, and Why Teams Use It

This is the concrete, AWS-specific version of §63's general least-privilege principle — the exact
gap the "I'll restrict access" vs. "I'll write a scoped policy" distinction lives in.

### 3. What Actually Breaks

- **Long-lived access keys instead of roles** — a static IAM user access key embedded in code or
  config is a durable secret that can leak and stay valid indefinitely; a role assumed by an
  EC2 instance or Lambda function has no such long-lived credential to leak in the first place.
- **A policy that "just works" via `Action: "*"` on `Resource: "*"`** — grants everything, the
  complete opposite of least privilege, often left in place because narrowing it down "later" was
  never prioritized (see §63).
- **Confusing the trust policy with the permission policy** — a role's trust policy controls *who*
  can assume it; its permission policy controls what it can *do*. A role with an overly permissive
  trust policy can be assumed by more principals than intended, regardless of how tightly its
  permissions are scoped.
- **Not scoping by resource ARN or condition** — a policy that says "can read from S3" without
  specifying *which* bucket, or without a condition restricting by source IP/VPC, is far broader
  than most real use cases actually need.
- **Cross-account access set up without understanding assume-role** — accessing resources in
  another AWS account requires that account's role to trust yours (via its trust policy) and your
  side to explicitly assume it — not just having credentials that happen to work.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use IAM roles, not long-lived access keys, for anything running on AWS infrastructure —
  EC2, Lambda, ECS tasks all support this directly."
- "A role's trust policy (who can assume it) and permission policy (what it can do) are separate
  concerns, and I check both, not just the permissions."
- "I scope policies to specific resource ARNs and add conditions where relevant, rather than using
  wildcards for convenience."

### 5. Interview-Ready Answer

> "For anything running on AWS infrastructure, I use IAM roles instead of long-lived access keys,
> specifically because a role has no durable credential that can leak. When I actually write the
> policy, I scope it to specific resource ARNs and actions rather than wildcards — for example,
> read-only access to one specific S3 bucket and prefix, not `s3:*` on `*`. And I keep the trust
> policy — who can assume the role — as a separate consideration from the permission policy, since
> a tightly-scoped permission policy doesn't help if the trust policy lets the wrong principal
> assume it in the first place."

### 6. Go Deeper

companion Cloud Engineering Playbook's §16 (IAM) chapter (condition keys, Access Analyzer,
cross-account access in full depth); this book's own §63 (general least-privilege principle).

---
