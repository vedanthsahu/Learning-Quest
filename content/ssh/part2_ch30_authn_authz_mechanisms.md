## 30. AuthN/AuthZ Mechanisms: Session Stores, JWTs, OAuth2/OIDC, RBAC/ABAC/ReBAC

### 30.1 What This Chapter Adds to §5

§5 established that authentication substitutes an expensive, one-time password check with a cheaper, repeatable proof, and that authorization is a distinct, subsequent question. This chapter covers the two dominant real mechanisms for that proof (server-side sessions and client-held tokens), the standard protocol for delegated authentication (OAuth2/OIDC), and the three major models for structuring authorization decisions.

### 30.2 Server-Side Sessions: State Lives on the Server

The classic mechanism: after successful login, the server creates a **session record** (in memory, or more commonly in a shared store like a cache or database) containing whatever identifies the user, and gives the client a random, unguessable **session ID** via a cookie. Every subsequent request includes that cookie; the server looks up the session ID in its store to retrieve the associated identity. The server-side session store is the authoritative source of truth, which makes revocation trivial (delete the session record, and the ID is instantly useless) — a meaningful advantage covered further in §30.4. The cost is that every request now requires a lookup against the shared session store, and — connecting directly to §18.5 — that store is itself a piece of shared state that must be reachable from every server handling requests, which is precisely why a naive in-memory session store defeats horizontal scaling unless it's centralized or replicated.

### 30.3 Tokens (JWT): State Travels With the Client

An alternative mechanism avoids the server-side lookup entirely: encode the user's identity and relevant claims directly into a signed token — most commonly a **JSON Web Token (JWT)** — that the client holds and presents with each request. The server verifies the token's cryptographic signature (proving it was issued by a trusted authority and hasn't been tampered with) and trusts its contents directly, with no database lookup required.

```
JWT structure (three base64url-encoded parts, dot-separated):

  header.payload.signature

  header:    { "alg": "HS256", "typ": "JWT" }
  payload:   { "sub": "user123", "role": "admin", "exp": 1735689600 }
  signature: HMAC-SHA256(base64(header) + "." + base64(payload), secret_key)
```

The direct benefit is removing the per-request lookup cost from §30.2, at a direct and important cost: **because the server no longer checks a central store, a JWT cannot be easily revoked before its expiration** — if an attacker steals a valid, unexpired token, or an employee is terminated, the token remains valid and usable until it naturally expires, unless additional machinery (a revocation/denylist check, reintroducing the exact per-request lookup JWTs were meant to avoid) is layered back on top. This tradeoff — cheap, stateless verification versus easy revocation — is a direct instance of the general shape from §1.7, and the right choice depends on how short-lived the tokens are and how serious the consequence of delayed revocation would be for a given system.

### 30.4 Why Real Systems Often Combine Both

Given §30.2 and §30.3's opposite tradeoffs, many production systems use a hybrid: a short-lived **access token** (a JWT, cheap to verify, limited exposure window if compromised because it expires quickly) paired with a longer-lived **refresh token** (checked against a central, revocable store only when the access token expires and needs renewal). This confines the expensive, revocable lookup to the comparatively rare token-refresh event, while the frequent, per-request verification stays cheap and stateless — a deliberate engineering compromise between §30.2's revocability and §30.3's performance.

### 30.5 OAuth2 and OIDC: Delegated Authentication Without Sharing Passwords

A distinct problem from either mechanism above: how does a third-party application get limited access to a user's data on another service (e.g., a scheduling app reading someone's calendar) without that user ever handing their actual password to the third party? **OAuth2** solves this via a redirect-based flow: the user is sent to the service that actually holds their data (the **authorization server**), authenticates there directly, explicitly grants the requesting application specific, limited permissions (**scopes**), and is redirected back with a token the requesting application can use — the requesting application never sees the user's actual credentials at any point. **OpenID Connect (OIDC)** is a thin, standardized layer on top of OAuth2 specifically for authentication (proving identity), adding a standardized **ID token** (itself a JWT, §30.3) containing verified identity claims — OAuth2 alone was designed for delegated *authorization* (limited access), and OIDC's addition is precisely what makes "log in with Google/GitHub/etc." a well-defined, standard flow rather than a repurposing of a protocol built for something else.

### 30.6 RBAC, ABAC, and ReBAC: Three Models for Structuring Authorization Decisions

Once identity is established, §5.4's authorization question — what is this identity allowed to do — needs a concrete model to be implemented consistently rather than as ad hoc, scattered checks:

- **Role-Based Access Control (RBAC)**: permissions are attached to **roles** (admin, editor, viewer), and users are assigned one or more roles. Simple to reason about and audit, but coarse — it struggles to express permissions that depend on specific resource context ("edit only orders you personally created") without proliferating an unmanageable number of narrow roles.
- **Attribute-Based Access Control (ABAC)**: permissions are expressed as rules over attributes of the user, the resource, and the context (e.g., "allow if user.department == resource.department AND time is business hours"). Far more expressive than RBAC, at the cost of rules that are harder to audit at a glance and a policy engine that must evaluate potentially complex logic on every authorization check.
- **Relationship-Based Access Control (ReBAC)**: permissions are derived from relationships between entities (e.g., "allow if the user is a member of the team that owns this document," possibly through several hops of relationship) — a natural fit for systems with rich, graph-like ownership and sharing structures (file/document sharing, social graphs), implemented efficiently using graph-traversal techniques (§7.4's graph database discussion) rather than flat role or attribute checks.

The choice among these is a direct instance of the tradeoff shape in §1.7: RBAC trades expressiveness for simplicity and auditability; ABAC and ReBAC trade that simplicity for the ability to express authorization rules that actually match complex, real-world ownership and permission structures.

### 30.7 Common Mistakes and Production Debugging Signals

- Storing session data in a single server's local memory in a horizontally-scaled deployment (§18.5), causing users to be intermittently "logged out" whenever a load balancer routes them to a different server than the one holding their session.
- Using long-lived JWTs with no refresh/revocation mechanism at all (§30.3–30.4), leaving compromised or terminated-employee tokens valid for their full, often generously-long lifetime.
- Implementing authorization as scattered, ad hoc `if` checks throughout the codebase instead of a consistent model (§30.6), making it impossible to audit "who can do what" without reading every code path individually — a direct structural cause of the access-control gaps warned about in §5.4 and §17.

### 30.8 Engineering Intuition

> **How do I know whether to use sessions or JWTs?** If instant revocation matters more than avoiding a per-request lookup, favor sessions (or short-lived JWTs with a refresh mechanism, §30.4). If minimizing per-request latency/infrastructure matters more and token lifetimes can be kept short, favor JWTs.
>
> **What symptoms indicate an authorization-model problem?** Authorization logic duplicated and drifting across many code paths; a specific permission bug requiring a search through unrelated code to even locate the relevant check; new features regularly needing bespoke, one-off permission logic that doesn't fit any existing pattern.
>
> **What metrics indicate it?** Time-to-revoke for a compromised credential (directly exposed by the sessions-vs-JWT choice, §30.3-30.4); the number of distinct places in a codebase implementing authorization checks for supposedly the same resource type.
>
> **What breaks first if this is neglected?** A compromised long-lived token or a terminated employee's stale credential remaining valid for an unacceptably long window, or — from scattered ad hoc checks — an authorization gap discovered only when a user reports seeing data they shouldn't.
>
> **When is plain RBAC (§30.6) sufficient, and when do you need more?** RBAC suffices when permissions genuinely don't depend on specific resource ownership or relationship context. The moment "can edit their own orders but not others'" appears, RBAC alone can't express it cleanly, and ABAC or ReBAC becomes necessary.
>
> **What would a hyperscale company do?** Externalize authorization into a dedicated policy engine implementing ABAC or ReBAC (§61, §72), use short-lived JWTs with robust refresh-token revocation infrastructure, and standardize on OIDC for any federated or third-party login.
>
> **What would a two-person startup do?** Use a managed auth provider handling sessions/JWTs and OAuth2/OIDC entirely, and implement simple RBAC or direct ownership checks (`record.owner_id == current_user.id`) rather than building a policy engine.
>
> **What changes with scale?** At small scale, simple sessions or JWTs plus RBAC/ownership checks handle the overwhelming majority of needs. At large scale, with complex organizational structures, sharing models, and compliance requirements, ABAC/ReBAC and centralized policy engines become necessary to keep authorization auditable and consistent (§61, §72).

### 30.9 Exercises

1. For a system using JWTs with a 24-hour expiration and no refresh token or revocation list, describe exactly what happens if an employee with a valid token is terminated at hour 1, and propose the minimal change (per §30.4) that would reduce this exposure window.
2. Model the authorization requirement "a user can edit a document if they are the owner, or if they belong to a team the document has been shared with" using RBAC, and then again using ReBAC (§30.6). Explain which model expresses it more naturally and why.

### 30.10 Further Reading

- RFC 6749 (OAuth 2.0) and the OpenID Connect Core specification — the authoritative definitions underlying §30.5.
- Google, "Zanzibar: Google's Consistent, Global Authorization System" (2019) — the influential paper behind modern ReBAC implementations, directly extending §30.6.

---
