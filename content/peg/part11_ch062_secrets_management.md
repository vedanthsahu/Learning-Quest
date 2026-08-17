## §62. Secrets Management

### 1. The Vocabulary

- **Secrets manager** (AWS Secrets Manager, HashiCorp Vault) — a dedicated service for storing,
  retrieving, and rotating secrets, with access control and audit logging built in.
- **Parameter store** — similar, often used for general config plus lighter-weight secrets.
- **Secret rotation** — periodically changing a secret's value (and updating everywhere it's used)
  specifically to limit how long a leaked secret stays useful to an attacker.
- **Encryption at rest** — data (including secrets) stored encrypted on disk, so a raw storage-
  level breach doesn't directly expose plaintext.

### 2. Where It Sits, and Why Teams Use It

Every real system has secrets — database passwords, API keys, encryption keys — and the question
is never "do we have secrets" but "where do they live and who/what can read them." A dedicated
secrets manager exists specifically to make that answerable and auditable.

### 3. What Actually Breaks

- **Secrets in environment variables with no rotation plan** — env vars are a reasonable *delivery*
  mechanism, but if nothing ever rotates the underlying value, a leaked secret (from a log, a
  crash dump, a compromised instance) stays valid indefinitely.
- **One shared secret used everywhere** — a single database password used by every service means
  compromising any one of them (or any one engineer's laptop with that value) compromises all of
  them; scoping secrets more narrowly limits blast radius.
- **No audit trail for who accessed a secret** — a dedicated secrets manager logs access; a
  secret sitting in a shared document or a Slack message has no such trail, and no way to know if
  it's already been seen by someone it shouldn't have.
- **Rotation that isn't actually automated or tested** — a rotation "policy" that exists only on
  paper, with no actual mechanism updating every consumer of the secret, means rotation either
  never happens or breaks something when it finally does.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use a dedicated secrets manager, not just environment variables with no further plan, so
  secrets can actually be rotated and access can be audited."
- "I scope secrets narrowly rather than sharing one credential across every service, specifically
  to limit blast radius if one leaks."
- "Rotation needs to be an automated, tested mechanism, not a policy that exists only in
  documentation."

### 5. Interview-Ready Answer

> "The question I always ask about a secret isn't just 'is it encrypted' but 'where does it live,
> who can access it, is that access audited, and can it actually be rotated.' A dedicated secrets
> manager answers all of those; environment variables alone answer none of them beyond basic
> delivery. I also try to scope secrets narrowly — one shared credential across every service
> means one leak compromises everything, versus a leak that's contained to whatever narrowly used
> that specific secret."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §62 (Secrets, Password Hashing & Secure File
Uploads) chapter; companion Cloud Engineering Playbook's §17 (Secrets & Encryption: Secrets
Manager & KMS) chapter.

---
