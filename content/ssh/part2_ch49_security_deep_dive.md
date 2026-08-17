## 49. Security Engineering Deep Dive: Threat Modeling, OWASP Top 10, Encryption, Secrets Management, Supply Chain

### 49.1 What This Chapter Adds to §17

§17 established trust boundaries and defense in depth conceptually. This chapter covers the concrete methodology for finding vulnerabilities before they're exploited (threat modeling), the specific, most common real-world vulnerability classes, the mechanics of encryption at rest and in transit, secrets management, and supply chain security.

### 49.2 Threat Modeling: A Structured Methodology for §17.2's "Find It Before an Attacker Does"

**Threat modeling** is a structured process for systematically identifying a system's trust boundaries (§17.3) and, for each one, enumerating what could go wrong. A widely-used framework, **STRIDE**, organizes this enumeration into six categories: **S**poofing (pretending to be something/someone you're not — an authentication failure), **T**ampering (unauthorized modification of data), **R**epudiation (denying having performed an action, without proof otherwise), **I**nformation disclosure (exposing data to those not authorized to see it — an authorization failure), **D**enial of service (degrading or blocking legitimate use), and **E**levation of privilege (gaining capabilities beyond what was granted). Applying STRIDE to each trust boundary identified in a system's architecture diagram converts an unstructured, easy-to-miss brainstorming exercise into a systematic checklist — directly operationalizing §17.2's argument that security must be designed in, by giving engineers a concrete method to apply during design, not just a principle to remember.

### 49.3 The OWASP Top 10: The Most Common Real-World Vulnerability Classes

The OWASP Top 10 is a periodically-updated, industry-standard list of the most common and impactful web application vulnerability categories, several of which connect directly to concepts already developed in this handbook:

- **Broken Access Control** — consistently the most common category in recent editions, and precisely the authorization gap warned about at the mental-model level in §5.4 and §17: an authenticated user reaching data or actions beyond their intended permissions.
- **Injection** (including SQL injection) — occurs when untrusted input is concatenated directly into a command or query rather than being treated strictly as data, allowing an attacker to alter the query's actual logic; the standard mitigation is **parameterized queries**, which keep user input structurally separated from query logic regardless of its content.
- **Cryptographic Failures** — using weak, outdated, or misconfigured encryption, or failing to encrypt sensitive data at all, directly relevant to §49.4's treatment of encryption at rest and in transit.
- **Security Misconfiguration** — default credentials left unchanged, overly permissive settings left in place, unnecessary features left enabled — a broad category that echoes §17.3's warning about implicit, unexamined trust assumptions.
- **Vulnerable and Outdated Components** — using dependencies with known, unpatched vulnerabilities, directly relevant to §49.6's supply chain discussion.

The value of this list is not memorization — it's recognizing that most real-world breaches trace back to a small, recurring, well-documented set of mistakes, which means a disciplined engineering team can eliminate a large fraction of realistic risk simply by systematically checking for this specific, known set rather than needing to anticipate every conceivable novel attack.

### 49.4 Encryption at Rest and in Transit: Concrete Mechanisms

**Encryption in transit** protects data while it moves across a network — TLS (§27.5) is the standard mechanism, ensuring that anything intercepted between two communicating parties is unreadable without the negotiated keys. **Encryption at rest** protects data while it's stored — on disk, in a database, in a backup — ensuring that someone who gains access to the underlying storage medium directly (a stolen disk, an improperly-secured backup, unauthorized cloud storage access) cannot read the data without the appropriate decryption key. A critical, often-overlooked detail: encryption at rest is only meaningful if the decryption keys are managed separately from the encrypted data itself and are properly access-controlled (§49.5) — encrypting data but storing the key alongside it, equally accessible, provides the appearance of protection without the substance, precisely the gap between "compliance checkbox" and "actual security" that mature security practice is careful to avoid.

### 49.5 Secrets Management: Why Credentials Don't Belong in Code or Config Files

**Secrets** — database passwords, API keys, encryption keys, credentials for third-party services — require careful handling because they are, by definition, the keys to a trust boundary (§17.3): anyone who obtains a secret can act with the authority it grants. Committing secrets directly into source code or configuration files checked into version control is a common, serious mistake, because version control history is durable and often broadly accessible (to every current and former contributor, and potentially to anyone who ever clones the repository) — a secret committed and later "removed" typically remains recoverable from history indefinitely unless the entire repository history is rewritten, which is itself a disruptive, error-prone operation. The standard mitigation is a dedicated **secrets management** system: secrets are stored in a specialized, access-controlled, audited store, and applications retrieve them at runtime (via an authenticated request to the secrets store) rather than having them baked into deployable artifacts or version-controlled files at all — directly limiting the blast radius (§1.3.3) of a compromised code repository or deployable artifact, since neither one actually contains the secret itself.

### 49.6 Supply Chain Security: Trusting Code You Didn't Write

Modern software depends heavily on third-party dependencies — libraries, frameworks, base container images — and each one is, functionally, code you are trusting without having personally reviewed it, directly extending the trust-boundary concept from §17.3 to your own dependency tree, not just your own code. **Supply chain security** addresses the risks this introduces: a dependency with an undiscovered vulnerability (addressed by continuously scanning dependencies against known-vulnerability databases and promptly updating), or, more insidiously, a dependency that has been deliberately compromised by an attacker (a maintainer's account compromised, or malicious code inserted into a popular package) — addressed by practices like verifying package signatures/checksums, minimizing the total number of dependencies actually pulled in, and pinning dependencies to specific, reviewed versions rather than automatically accepting any future update without review. The engineering-relevant mental shift: your system's actual attack surface includes every dependency's code, not merely the code your own team wrote, and the STRIDE analysis from §49.2 should account for this extended surface, not stop at your own repository's boundary.

### 49.7 Common Mistakes and Production Debugging Signals

- Building string-concatenated SQL queries from user input rather than using parameterized queries (§49.3), leaving a direct, well-documented SQL injection vulnerability that automated scanning tools and even casual manual testing would typically catch.
- Storing an encryption key in the same location as the data it encrypts, or in a configuration file alongside other, less sensitive settings, defeating the actual protective purpose of encryption at rest (§49.4) while still technically satisfying a superficial "is data encrypted" checklist item.
- Pulling in third-party dependencies without any process for tracking known vulnerabilities in them over time, leaving the system exposed to disclosed vulnerabilities in dependencies long after fixes are available (§49.6).

### 49.8 Engineering Intuition

> **How do I know if I need a formal threat-modeling process?** Any system handling data whose exposure or manipulation would cause real harm (financial, personal, reputational) benefits from at least a lightweight STRIDE pass (§49.2) over its key trust boundaries during design, not only after an incident.
>
> **What symptoms indicate a secrets-management gap?** Credentials findable via a simple search through source code or version control history; the same database password shared identically across every environment (development, staging, production) with no rotation process.
>
> **What metrics indicate supply chain risk?** Number of dependencies with known, unpatched vulnerabilities (tracked via automated scanning); average time between a vulnerability's disclosure and its remediation in your dependency tree.
>
> **What breaks first if these practices are skipped?** A single, well-documented, easily-automatable attack (SQL injection via unparameterized queries, or a credential found in version control history) succeeds — the OWASP Top 10 (§49.3) exists precisely because these specific, preventable mistakes remain the most common real-world cause of breaches.
>
> **When is a lighter security investment appropriate?** A genuinely low-stakes internal tool with no sensitive data and no significant blast radius if compromised warrants proportionally less investment in formal threat modeling and secrets infrastructure — investment should scale with actual risk (§17.7), not be applied uniformly regardless of stakes.
>
> **What would a hyperscale company do?** Run continuous automated dependency scanning, mandatory secrets-management infrastructure with no exceptions, regular formal threat-modeling reviews for new features, and dedicated security teams auditing against the OWASP Top 10 and beyond as standard practice (§72).
>
> **What would a two-person startup do?** Use parameterized queries and a managed secrets store from day one (both are low-cost, low-friction defaults available in virtually every modern framework and cloud platform), and rely on automated dependency-vulnerability scanning built into their existing tooling rather than a dedicated security team.
>
> **What changes with scale?** The baseline practices in this chapter (parameterized queries, basic secrets management, dependency scanning) are cheap enough to be worth adopting at any scale from day one. What changes with scale is the formality and depth of threat modeling, the sophistication of supply chain controls, and the existence of dedicated security roles and compliance obligations (§72).

### 49.9 Exercises

1. Apply STRIDE (§49.2) to a login endpoint you're familiar with, identifying at least one concrete concern under three different STRIDE categories.
2. A team stores their database password in a `.env` file that is checked into their Git repository, and later removes it in a subsequent commit. Using §49.5, explain why the secret should still be considered compromised and what the correct remediation is.

### 49.10 Further Reading

- OWASP, "OWASP Top 10" (owasp.org) — the authoritative, continuously updated source underlying §49.3.
- Adam Shostack, *Threat Modeling: Designing for Security* — the definitive practitioner's guide to STRIDE and threat modeling methodology, extending §49.2 in full depth.

---
