## 5. Mental Model: Authentication and Authorization

### 5.1 Two Different Questions That Get Conflated

"Who are you?" and "what are you allowed to do?" are two entirely separate questions, answered by two separate mechanisms, and a large fraction of real-world security bugs come from a system that answers one and silently assumes it has answered the other. **Authentication (AuthN)** answers "who are you" — establishing identity. **Authorization (AuthZ)** answers "what is this identity allowed to do" — granting or denying permission. A system can authenticate someone perfectly (it really is you) and still authorize them incorrectly (you can now see another user's private data), and that gap is where a large share of production security incidents live. Mechanisms (session stores, JWT structure, OAuth2/OIDC flows, RBAC/ABAC/ReBAC) are deferred to Pass 2, §30.

### 5.2 The Problem: A Network Call Has No Face

§3.2 established that a network call is not a function call. It is also, critically, not a handshake with a person you can recognize — every request that arrives at your server is, at the protocol level, indistinguishable from any other unless something in the request proves who sent it. Before any authentication mechanism existed, "proving who you are" to a computer system meant physically being at a specific terminal in a specific room. The moment systems became reachable over a network from anywhere, that physical proof disappeared, and software had to invent a substitute.

### 5.3 Why "Log In Once, Not Every Request" Requires a Mechanism

The most primitive substitute — send your username and password with *every single request* — technically solves authentication but is expensive (verifying a password is deliberately slow, to resist guessing attacks) and dangerous (it means the most sensitive secret you own is repeated on the wire constantly). The engineering response is to authenticate once, expensively, and then issue the caller something cheaper to verify on every subsequent request — a **session** or a **token** — that proves "this request comes from someone who already proved their identity a moment ago," without re-checking the original password every time.

This is a direct instance of the general tradeoff shape from §1.7: you are trading a small window of risk (whatever the session/token allows a holder to do until it expires) for a large reduction in cost (not re-verifying a password on every request) and a large reduction in exposure (the actual password is transmitted once, rarely, instead of constantly). Every choice about *how* that session or token is issued, stored, and invalidated (§30) is a negotiation over exactly how large that window of risk is allowed to be.

### 5.4 Authorization: Identity Is Not Permission

Once a request is authenticated, the system knows *who* is asking — but "who" does not automatically imply "allowed to do what." A logged-in user is unambiguously themselves, and should still be prevented from reading another user's private records, deleting resources they don't own, or invoking administrative operations. Authorization is the separate, subsequent check: given this now-known identity, is *this specific action on this specific resource* permitted?

The reason this must be treated as a genuinely separate mental step, not a detail bundled into authentication, is that authorization decisions are typically far more numerous and far more context-dependent than authentication decisions. You authenticate a user once per session; you authorize potentially every single action they take, against a constantly-changing set of resources and rules (who owns this record, what role does this user hold, what organization are they acting within). Systems that conflate the two — treating "is logged in" as a proxy for "is allowed" — are the direct cause of one of the most common serious vulnerability classes in production software: an authenticated user reaching data or actions they were never meant to access, simply because nobody asked the second question.

### 5.5 Trust Boundaries: Where the Question Actually Gets Asked

A useful mental model for both AuthN and AuthZ is the **trust boundary**: a line in your architecture across which you can no longer assume the caller is who or what it claims to be, and must explicitly verify. Every hop identified in §3.3 is a potential trust boundary. A common and consequential mistake is checking identity and permission only at the outermost boundary (say, the public API gateway) and then assuming every internal service behind it can trust every request it receives unconditionally — which works exactly until any internal component is reachable by an unexpected path, or until one compromised internal service can now impersonate a trusted caller to every other internal service. This is the conceptual seed of the "zero-trust" architectural philosophy developed at scale in §61 and §72: trust nothing merely because a request arrived from "inside," and verify identity and permission at every boundary, not just the edge.

### 5.6 Engineering Intuition

> **How do I know AuthN and AuthZ need to be treated as separate design questions?** If your authorization logic is expressed anywhere as "if the user is logged in, allow it," you have collapsed the two questions into one, and you very likely have a permission gap.
>
> **What symptoms indicate a weak boundary between the two?** Bug reports of the form "User A could see User B's data" — this is almost always an authorization gap behind a correctly-functioning authentication check, not an authentication failure.
>
> **What metrics indicate it?** Rate of 403 (forbidden) responses relative to 401 (unauthenticated) responses — a system with essentially no 403s despite complex ownership rules is a system that likely isn't checking authorization at all, not a system with perfect permissions.
>
> **What breaks first if this distinction is ignored?** Data leakage between users/tenants — the single most common real-world consequence, and one that authentication mechanisms, however strong, cannot detect or prevent on their own.
>
> **When is a lightweight approach appropriate?** A genuinely single-user internal tool with no multi-tenant data can reasonably skip fine-grained authorization entirely — the cost of building it exceeds the risk it mitigates when there is no "other user" to protect data from.
>
> **What would a hyperscale company do?** Externalize authorization into a dedicated policy engine checked at every service boundary (§61, §72), rather than hand-writing permission checks inside each service, specifically so that the rule "who can do what" has one authoritative source instead of being reimplemented (and drifting) across hundreds of services.
>
> **What would a two-person startup do?** Use a managed auth provider for authentication and simple ownership checks ("does this record belong to this user ID?") for authorization — entirely sufficient before multiple roles, organizations, or fine-grained permissions exist.
>
> **What changes with scale?** At small scale, "does this record belong to this user" is the entire authorization model. At large scale, with multiple roles, organizations, and delegated permissions, authorization becomes its own system, generally externalized from any single service (§61).

### 5.7 Exercises

1. Find an endpoint in a system you've worked on and ask: does it check identity, permission, or both? Could a valid, logged-in user reach data they shouldn't by calling it with a different ID?
2. Explain, in one sentence, why re-sending a password on every request is both slower and riskier than issuing a session or token after the first successful login.

### 5.8 Further Reading

- OWASP, "Broken Access Control" (perennially the #1 item in the OWASP Top 10, §49) — real-world grounding for why §5.4's distinction matters in practice.
- Google, *BeyondCorp* papers — the origin of the zero-trust framing previewed in §5.5, developed fully in §61 and §72.

---
