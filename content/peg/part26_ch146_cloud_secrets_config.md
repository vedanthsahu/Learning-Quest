## §146. Cloud Secrets and Config: Parameter Store, Secrets Manager, KMS

### 1. The Vocabulary

- **SSM Parameter Store** — a simple, low-cost store for configuration values and (in "SecureString"
  form) secrets, encrypted with KMS — a reasonable default for most config needs.
- **Secrets Manager** — purpose-built for secrets specifically: adds automatic rotation (e.g.,
  rotating a database password on a schedule without manual intervention) and tighter fine-grained
  access auditing, at a higher cost per secret than Parameter Store.
- **KMS (Key Management Service)** — manages the encryption keys used by both of the above (and by
  S3, EBS, and most other AWS encryption-at-rest features); you rarely handle raw keys directly —
  KMS handles that and you just reference a key.
- **Secret rotation** — periodically changing a secret's value automatically and updating everything
  that depends on it, reducing how long a leaked credential stays valid if it's ever exposed.

### 2. Where It Sits, and Why Teams Use It

The practical decision is usually simple: Parameter Store for general configuration and secrets
that don't need automatic rotation, Secrets Manager specifically when a secret should rotate on a
schedule (database credentials being the classic case) or needs tighter audit/access controls.
Both exist so that secrets never need to live in source code, environment files committed to a
repo, or plaintext CI/CD configuration — they're fetched at deploy or runtime from a service
designed to store them safely.

### 3. What Actually Breaks

- **Secrets hardcoded in source code or committed `.env` files** — the single most common secrets
  failure, made worse because git history retains the secret even after it's later removed from
  the current file.
- **Secrets printed into CI/CD logs** — a build step that echoes an environment variable for
  debugging, or a tool that logs its full configuration including secrets, leaks the value into
  log storage that's often far less access-controlled than the secret itself.
- **No rotation on long-lived database credentials** — a credential that's never rotated has an
  unlimited exposure window if it's ever leaked once, silently, without anyone noticing.
- **Over-broad IAM access to the secrets store itself** — a role that can read every secret in
  Secrets Manager, when it only needs one, turns any compromise of that role into a compromise of
  every other secret too.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Secrets never go in source code, `.env` files committed to a repo, or plaintext CI/CD config —
  they're fetched from Parameter Store or Secrets Manager at deploy or runtime."
- "I use Secrets Manager specifically when a secret needs automatic rotation, like a database
  password; Parameter Store covers most other configuration and secret needs at lower cost."
- "I'm careful that CI/CD steps don't accidentally echo a secret value into build logs."

### 5. Interview-Ready Answer

> "I keep secrets out of source code and CI/CD configuration entirely — they live in Parameter
> Store or Secrets Manager and get fetched at deploy or runtime, encrypted via KMS underneath
> either way. I reach for Secrets Manager specifically when something needs automatic rotation,
> like a database credential, since it can rotate the value and update dependents on a schedule
> without manual intervention. And I'm explicit about not letting build or deploy scripts
> accidentally print a secret value into CI logs, since log storage is often much less tightly
> access-controlled than the secret itself."

### 6. Go Deeper

companion Cloud Engineering Playbook's §17 (Secrets & Encryption: Secrets Manager & KMS) chapter
for the full encryption and rotation mechanics; this book's §15 (secrets in CI/CD) and §62
(secrets management) for the adjacent leakage-prevention and general secrets-handling coverage.

---
