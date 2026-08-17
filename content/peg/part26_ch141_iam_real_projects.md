## §141. IAM in Real Projects: Roles, Policies, Trust Policies, and Least Privilege

### 1. The Vocabulary

- **IAM role** — an identity a workload (not a person) assumes temporarily to get permissions,
  with no long-lived credentials to leak — the AWS-recommended way for an application to access
  other AWS services.
- **Permission policy** — a JSON document with `Effect` (Allow/Deny), `Action` (which API calls),
  `Resource` (which specific ARNs), and optionally `Condition` (extra constraints, like source IP
  or time) — this is *what the role can do*.
- **Trust policy** — a separate JSON document attached to the role itself, defining *who or what
  is allowed to assume this role* (the `Principal`) — this is not the same document as the
  permission policy, and mixing the two up is a common early confusion.
- **Access keys vs roles** — long-lived access keys (an access key ID + secret) can leak in code,
  logs, or a public repo and keep working until manually revoked; a role's temporary credentials
  expire automatically, which is why roles are preferred for workloads.

### 2. Where It Sits, and Why Teams Use It

This is the gap between "IAM manages who can access what" and actually being able to describe a
real least-privilege setup. A concrete shape worth internalizing: an ECS task or Lambda function
gets an IAM role (not a hardcoded access key) whose permission policy grants only the specific
actions it needs — say `s3:GetObject` and `s3:PutObject` — scoped to one bucket's prefix, not
`s3:*` on `*`. The trust policy on that role says "the ECS task execution service (or Lambda) is
allowed to assume this role" — a completely separate concern from what the role can then do.

### 3. What Actually Breaks

- **`Action: "*"` or `Resource: "*"` "to make it work," left in place** — a permission broad enough
  to unblock local development, never narrowed before shipping, is the single most common
  real-world least-privilege failure — and the thing an interviewer is specifically listening for
  you to mention avoiding.
- **Long-lived access keys committed to a repo or baked into an image** — keys don't expire on
  their own; once leaked, they work until someone notices and manually revokes them, which is often
  measured in days, not minutes.
- **Confusing trust policy and permission policy** — a role's trust policy defines who can assume
  it, not what it can do once assumed; debugging "access denied" by only looking at the permission
  policy misses the case where the *wrong entity* is trying to assume the role in the first place.
- **Reusing one broad role across unrelated services** — one shared role with accumulated
  permissions for everything it's ever needed means every service using it has access to
  everything the others do too, far beyond what any single service actually requires.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "For a workload, I use a role, not a long-lived access key, because the role's credentials are
  temporary and there's nothing static to leak."
- "I scope the permission policy to the exact actions and resource ARNs the workload needs — not
  a wildcard 'to make it work for now.'"
- "I know the trust policy and the permission policy are separate documents solving separate
  questions — who can assume the role, versus what the role can then do."

### 5. Interview-Ready Answer

> "In a real project, I'd give the workload an IAM role rather than a long-lived access key, since
> the role's credentials are temporary and there's nothing that leaks and keeps working
> indefinitely. I'd scope the permission policy tightly — for example `s3:GetObject` and
> `s3:PutObject` on one specific bucket prefix, not a wildcard — and I keep the trust policy, which
> controls who can assume the role, conceptually separate from the permission policy, which
> controls what the role can do once assumed. If I ever see a wildcard resource or action left in a
> policy past initial development, that's something I'd flag before it ships."

### 6. Go Deeper

companion Cloud Engineering Playbook's §16 (IAM) chapter for the full policy-document mechanics
and multi-account patterns; this book's §63 (least privilege in practice) and §69 (IAM roles/
policies) for the security-principle and AWS-mechanics framing of this same topic.

---
