## §60. CSRF vs CORS

### 1. The Vocabulary

- **CSRF (Cross-Site Request Forgery)** — tricking a logged-in user's browser into submitting a
  request to a site they're authenticated on, without their intent (e.g. a hidden form on a
  malicious page that auto-submits to your bank).
- **SameSite cookie attribute** — tells the browser whether to send a cookie along with cross-site
  requests at all (`Strict`, `Lax`, `None`) — a major modern defense against CSRF.
- **CSRF token** — a random, per-session (or per-form) value the server requires on state-
  changing requests, which an attacker's forged request can't know or include.

### 2. Where It Sits, and Why Teams Use It

CSRF and CORS (§3) are two completely different problems that get confused constantly because
they're both "cross-site" security concerns. CORS controls what cross-origin JavaScript can
*read*; CSRF is about a browser automatically *sending* credentials (cookies) with a forged
request it didn't need to read the response of at all.

### 3. What Actually Breaks

- **Assuming CORS protects against CSRF** — it doesn't; a CSRF attack often doesn't need to read
  the response at all (a form auto-submit just needs the side effect to happen), which means
  CORS's read-blocking has nothing to stop it.
- **No SameSite attribute set (or set to `None` without good reason)** — cookies get sent along
  with cross-site requests by default in older configurations, which is exactly the mechanism CSRF
  exploits; `SameSite=Lax` or `Strict` closes most of this off.
- **State-changing GET requests** — a GET request that changes data (deletes something, changes a
  setting) is especially vulnerable to CSRF via something as simple as an `<img>` tag pointing at
  the URL; GET should never have side effects (§2) partly for this exact reason.
- **CSRF tokens that don't actually get validated server-side** — a token is only a real defense
  if the server actually checks it matches on every state-changing request, not just includes it
  in the form as a formality.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "CORS is about what cross-origin JavaScript can read; CSRF is about a browser automatically
  sending cookies with a forged request — they're different problems with different defenses."
- "SameSite cookies are a major, simple defense against CSRF, and I check what it's set to,
  rather than assuming a safe default."
- "GET requests never have side effects, partly because that closes off a whole class of trivial
  CSRF via a plain image tag or link."

### 5. Interview-Ready Answer

> "CORS and CSRF get confused because they're both 'cross-site,' but they're different problems.
> CORS controls whether cross-origin JavaScript can read a response; CSRF is about a browser
> automatically attaching cookies to a forged request it didn't even need to read the response
> of. The main defenses are SameSite cookies, which stop the cookie from being sent cross-site in
> the first place, and CSRF tokens validated on every state-changing request as a second layer."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §60 (CSRF, CORS & Security Headers) chapter (full
mechanics).

---
