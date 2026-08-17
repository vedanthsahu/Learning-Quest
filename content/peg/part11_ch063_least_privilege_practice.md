## §63. The Principle of Least Privilege in Practice

### 1. The Vocabulary

- **Least privilege** — granting exactly the access needed to do a job, and no more.
- **Broad/wildcard permission** — a policy granting access to everything of a type
  (`s3:*` on `*`), the opposite of least privilege, and a common shortcut under time pressure.
- **Scoped permission** — access limited to the specific resource, action, and sometimes
  condition actually needed (e.g. read-only access to one specific S3 bucket, not all buckets).
- **Permission audit** — periodically reviewing who/what has access to what, and removing
  anything no longer needed.

### 2. Where It Sits, and Why Teams Use It

This is the difference between saying "I'll restrict access" as a vague intention and actually
being able to describe *what* a least-privilege policy looks like — a distinction that shows up
directly in how credible an answer sounds in a design discussion or an interview, not just in
actual security posture.

### 3. What Actually Breaks

- **"Just make it work" wildcard permissions during development that never get tightened later**
  — a policy granted broadly to unblock a deadline, with a mental note to "fix it later," is one
  of the most common ways real systems end up far more permissive than intended, because "later"
  competes with every other priority afterward.
- **One role/credential shared across very different jobs** — a single service role with
  permissions for everything that service *might ever* touch, instead of separate, narrower roles
  per distinct responsibility, means any compromise of that one role has a much larger blast
  radius than necessary.
- **Not distinguishing "I'll restrict access" from an actual policy** — being able to say the
  *specific* permissions, resources, and conditions a role needs (read-only, this one bucket, this
  one prefix) reads as genuinely more experienced than a vague gesture at "least privilege" as a
  buzzword.
- **Never auditing existing permissions** — access granted for a project that ended six months ago
  often just... stays granted, quietly expanding the actual attack surface over time with nobody
  actively deciding that should happen.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I can describe a specific least-privilege policy, not just gesture at the principle — which
  actions, on which resources, under which conditions."
- "I treat a broad permission granted 'temporarily to unblock something' as technical debt that
  needs an explicit follow-up, not a permanent shortcut."
- "I'd periodically audit existing permissions and remove access that's no longer actually
  needed, rather than assuming grants stay appropriately scoped forever."

### 5. Interview-Ready Answer

> "Least privilege in practice means I can name the specific actions and resources a role
> actually needs, not just say 'we'll restrict access.' For example, instead of granting broad S3
> access, I'd scope a policy to read-only on one specific bucket and prefix, because that's the
> only thing the service actually needs to do its job. And I treat any permission granted broadly
> under time pressure as a tracked follow-up to tighten, not a permanent state — because 'I'll fix
> it later' is exactly how systems drift toward being more permissive than intended."

### 6. Go Deeper

companion Cloud Engineering Playbook's §16 (IAM) chapter (concrete AWS policy examples); companion
Python Backend Engineering Handbook's §59 (Authentication & Authorization Implementation
Patterns) chapter.

---
