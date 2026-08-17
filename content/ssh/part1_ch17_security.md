## 17. Mental Model: Security

### 17.1 The Problem: Every System Has Things That Should Not Happen

Every system, however simple, has actions or exposures that would be harmful if they occurred: a stranger reading another user's data, an attacker modifying records they don't own, a service being knocked offline by malicious traffic, a secret credential leaking into the wrong hands. Security engineering is the discipline of anticipating those "should not happen" scenarios deliberately, before an adversary finds them for you, rather than treating them as bugs to be fixed only after they're exploited. Specific mechanisms — threat modeling frameworks, the OWASP Top 10, encryption details, secrets management — are deferred to Pass 2, §49.

### 17.2 Why "We'll Add Security Later" Fails

Security is frequently treated as a feature that can be layered on top of a finished system, and this framing fails for a structural reason: most serious vulnerabilities are not missing features, they are consequences of trust assumptions baked into the system's original design — which endpoint trusts which caller, which component assumes input has already been validated, which service assumes it's only reachable from inside a trusted network. Retrofitting security after the fact means finding and re-examining every one of those baked-in assumptions across an already-built system, which is far more expensive and far less reliable than making the trust boundaries explicit from the start. This is why security is treated, throughout mature engineering organizations, as a property that must be designed in alongside functionality, not audited in afterward.

### 17.3 Trust Boundaries, Generalized

§5.5 introduced the trust boundary specifically for identity and permission. The same concept generalizes to security as a whole: a trust boundary is any point in the system where data or a request crosses from a context you don't control into a context you do, and at every such boundary, the system must decide explicitly what it is and isn't willing to assume about what just crossed. A public API endpoint is a trust boundary with the entire internet on the other side. An internal service-to-service call is a trust boundary too, even though it's tempting to treat "internal" as automatically safe — and that exact temptation is what makes an internal breach so damaging once a single internal component is compromised (§5.5, §61, §72).

### 17.4 Defense in Depth: Why One Good Lock Isn't Enough

A single security control, however strong, is a single point of failure: if it is bypassed, misconfigured, or has an undiscovered flaw, nothing else stands between an attacker and the harmful outcome. **Defense in depth** is the principle of layering multiple, independent security controls, so that a failure or bypass of any single one does not by itself lead to compromise — network-level restrictions, authentication, authorization, input validation, encryption, and monitoring for anomalous behavior all operating simultaneously, each catching what the others might miss. This is directly analogous to the redundancy arguments made for reliability elsewhere in this book (§19, §74): just as you do not rely on a single server never failing, you do not rely on a single security control never failing either.

### 17.5 The Attacker's Advantage, and What It Implies

A structural asymmetry defines security engineering: a defender must correctly protect against *every* plausible way in, while an attacker only needs to find *one* way in that was missed. This asymmetry is why security cannot be approached as a checklist completed once — new features introduce new surface area, and the "every plausible way in" a defender must consider keeps growing as the system grows. The practical implication is that security has to be an ongoing practice (threat modeling new features, monitoring for new kinds of abuse, staying current on newly discovered classes of vulnerability) rather than a project with a defined end date.

### 17.6 Security and the Rest of This Book

It's worth being explicit that security is not a separate concern from everything else in this handbook — it is a lens applied to all of it. Every trust boundary in §3's request journey, every authorization check from §5, every piece of data replicated or cached (§8, §10), and every service boundary in a microservices architecture (§12) has a security dimension: what happens if this specific component is compromised, and what does that compromise let an attacker reach next? This "what does compromise let an attacker reach next" question is the concept of **blast radius** (§1.3.3) applied specifically to security, and minimizing it — so that compromising any one component doesn't automatically compromise everything downstream of it — is one of the central goals of the mechanisms developed in §49.

### 17.7 Engineering Intuition

> **How do I know I need to think explicitly about security for a given feature?** Any time a feature crosses a trust boundary (§17.3) — accepts input from outside your control, stores data belonging to more than one user, or grants any kind of access or capability — you have a security question to answer, whether or not the feature "looks" security-related.
>
> **What symptoms indicate a security gap?** Trust boundaries that were never explicitly identified during design; "internal-only" assumptions with no actual enforcement behind them; a single point where, if compromised, an attacker would gain broad access rather than narrowly-scoped access.
>
> **What metrics indicate it?** Time to detect and contain a security incident; the number of distinct systems reachable from a single compromised credential or service (a direct measure of blast radius).
>
> **What breaks first if security is neglected?** Not a specific technical component, but the containment of any single failure — a vulnerability that would have been a minor, contained issue with proper boundaries becomes a system-wide breach when trust is assumed too broadly (§17.3–17.4).
>
> **When is a lighter security posture acceptable?** Never entirely absent, but the *depth* of investment should scale with what's actually at risk — a genuinely low-stakes internal tool with no sensitive data warrants far less investment than a system handling payments or personal data.
>
> **What would a hyperscale company do?** Run dedicated security teams, formal threat modeling for new features, continuous automated vulnerability scanning, and zero-trust architectures assuming no request is trusted merely because of its origin (§61, §72) — because their scale makes them a constant, valuable target.
>
> **What would a two-person startup do?** Apply the basics rigorously (authentication, authorization, input validation, encryption in transit, not rolling their own cryptography) using well-established managed services and libraries, without building custom security infrastructure they don't yet need.
>
> **What changes with scale?** The basic principles (trust boundaries, defense in depth, minimizing blast radius) apply identically at every scale. What changes is the sophistication of enforcement — from "use a reputable auth provider and validate your inputs" at small scale, to formal zero-trust architecture, dedicated red teams, and continuous compliance auditing at hyperscale (§72).

### 17.8 Exercises

1. Draw the trust boundaries (§17.3) in a system you know — every point where data or a request crosses from a context you don't fully control into one you do. Which of them currently have no explicit check at all?
2. Explain, using §17.5, why a security practice that was "completed" during a project's initial build is not actually finished, even if no new vulnerabilities have been found since.

### 17.9 Further Reading

- OWASP, "OWASP Top 10" — the industry-standard, continuously updated catalog of the most common serious web application vulnerabilities, developed in full in §49.
- Adam Shostack, *Threat Modeling: Designing for Security* — a practical, structured methodology for identifying trust boundaries and attack surfaces before building, directly extending §17.2–17.3.

---
