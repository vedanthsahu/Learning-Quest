## §25. OAuth2/OIDC at the Level You Actually Need

### 1. The Vocabulary

- **OAuth2** — a protocol for granting a third party limited access to your resources *without*
  handing over your password ("let this app read your calendar").
- **OIDC (OpenID Connect)** — a thin identity layer built on top of OAuth2, specifically for
  "who is this user," not just "what can this app access."
- **Authorization code flow** — the standard, secure flow: redirect to the provider, user logs in
  there, provider redirects back with a short-lived code, your backend exchanges that code for
  tokens server-side.
- **Scope** — the specific permissions being requested (`read:email`, `write:calendar`).
- **"Login with Google/GitHub"** — OIDC in its most common real-world form.

### 2. Where It Sits, and Why Teams Use It

Almost nobody hand-rolls raw OAuth2 today — it's the protocol underneath "Login with X" buttons
and third-party integrations. What matters practically is recognizing the flow and its failure
modes, not implementing the cryptography yourself.

### 3. What Actually Breaks

- **Confusing OAuth2 (authorization) with OIDC (authentication)** — OAuth2 alone tells you an app
  was granted some access; it doesn't reliably tell you *who* the user is without the OIDC layer
  on top (the ID token specifically).
- **Doing the token exchange in the frontend/browser** — the authorization code should be
  exchanged for tokens by your backend, server-to-server, so the client secret never touches the
  browser.
- **No refresh token rotation** — reusing the same refresh token indefinitely means a leaked
  refresh token grants access indefinitely; rotating it on each use limits the damage of a leak.
- **Overly broad scope requests** — asking for full account access when you only need read access
  to one thing is both a security smell and, in review-gated platforms, a common reason
  third-party app approval gets rejected.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "OAuth2 is about authorization — granting access — and OIDC adds the identity layer on top;
  'Login with Google' is OIDC."
- "The authorization code exchange happens server-to-server, never in the browser, so the client
  secret is never exposed."
- "I request the minimum scope actually needed, not the broadest one available."

### 5. Interview-Ready Answer

> "OAuth2 solves 'let this app do something on my behalf without giving it my password,' and OIDC
> adds an identity layer on top so the app also knows who you are — that's the mechanism behind
> every 'Login with Google' button. In practice, I don't implement the cryptography myself; I use
> a maintained library or the identity provider's own SDK, and the part I'm careful about is
> making sure the actual token exchange happens on my backend, not in client-side JavaScript,
> since that's where the client secret would otherwise leak."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §59 (Authentication & Authorization
Implementation Patterns) chapter; companion Software Systems Handbook's §30 (AuthN/AuthZ
Mechanisms: sessions, JWT, OAuth2/OIDC, RBAC/ABAC) chapter.

---
