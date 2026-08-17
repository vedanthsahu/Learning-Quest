## §24. AuthN vs AuthZ: Sessions, JWTs, and Tokens

### 1. The Vocabulary

- **Authentication (AuthN)** — proving who you are.
- **Authorization (AuthZ)** — determining what you're allowed to do, *after* identity is
  established.
- **Session** — server-side state tracking a logged-in user, referenced by a session ID stored in
  a cookie.
- **JWT (JSON Web Token)** — a self-contained, signed token carrying claims (user ID, roles,
  expiry) that the server can verify without a database lookup.
- **Access token vs. refresh token** — a short-lived token used for actual API calls, and a
  longer-lived token used only to obtain a new access token when the old one expires.
- **RBAC (Role-Based Access Control)** — permissions assigned to roles, users assigned to roles.

### 2. Where It Sits, and Why Teams Use It

Every authenticated system needs both halves — knowing who's calling, and knowing what they're
allowed to do — and conflating the two ("if they're logged in, they can do anything") is one of
the most common real security gaps in early-stage systems.

### 3. What Actually Breaks

- **401 vs 403 confusion carried into the auth logic itself** — returning 403 when a token is
  simply missing/invalid (should be 401), or 401 when the user is known but lacks permission
  (should be 403), makes debugging access issues genuinely harder (see §60, §104).
- **JWTs that never expire, or expire so far out that a compromised token stays valid for weeks**
  — because a JWT is self-contained and stateless, revoking one before its expiry isn't as simple
  as deleting a session row; it typically requires a separate denylist or short expiries plus
  refresh tokens.
- **Storing a JWT in localStorage "because cookies are complicated"** — makes the token
  accessible to any JavaScript running on the page, including an XSS payload (see §61) — an
  httpOnly cookie is not readable by JavaScript at all, which is a real security advantage for
  sensitive tokens.
- **Checking authentication but not object-level authorization** — verifying a user is logged in,
  then trusting an ID in the URL/body without checking that *this* user is allowed to access
  *that specific* resource (a very common, very real vulnerability class).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Authentication answers 'who are you,' authorization answers 'what are you allowed to do' —
  I check both, separately, on every protected action."
- "A JWT is stateless and self-verifying, which is great for scaling but makes early revocation
  harder than a server-side session's 'just delete the row.'"
- "I check object-level permissions explicitly — being logged in doesn't mean a user is allowed
  to access every resource whose ID they happen to guess or receive."

### 5. Interview-Ready Answer

> "Authentication and authorization are two separate checks that happen in sequence: first prove
> identity, then check permissions for the specific action and specific resource. For the
> mechanism, sessions are server-side state referenced by a cookie, easy to revoke instantly;
> JWTs are stateless and self-verifying, which scales better but makes revocation before natural
> expiry harder. Either way, the check I'm most careful about is object-level authorization — just
> because someone's authenticated doesn't mean every resource ID they can construct is theirs to
> access."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §59 (Authentication & Authorization
Implementation Patterns) chapter; companion Software Systems Handbook's §30 (AuthN/AuthZ
Mechanisms: sessions, JWT, OAuth2/OIDC, RBAC/ABAC) chapter (session stores, JWT pitfalls,
OAuth2/OIDC flows, RBAC/ABAC/ReBAC in full).

---
