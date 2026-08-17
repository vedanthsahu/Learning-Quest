## §61. SQL Injection, XSS, and SSRF

### 1. The Vocabulary

- **SQL injection (SQLi)** — untrusted input gets concatenated directly into a SQL query, letting
  an attacker change the query's actual meaning.
- **Cross-Site Scripting (XSS)** — untrusted input gets rendered into a page as if it were trusted
  HTML/JavaScript, letting an attacker run script in another user's browser session.
- **Server-Side Request Forgery (SSRF)** — an attacker tricks the *server* into making a request
  on their behalf, often to internal-only resources the attacker couldn't otherwise reach directly
  (like a cloud metadata endpoint).

### 2. Where It Sits, and Why Teams Use It

These three are consistently in every "most common web vulnerabilities" list for the same
underlying reason: they all come from trusting input (from a user, or from a URL a user
supplied) more than is warranted, in three different contexts (database queries, rendered HTML,
outbound server requests).

### 3. What Actually Breaks

- **String-concatenated SQL queries** — `"SELECT * FROM users WHERE name = '" + name + "'"` lets
  an attacker supply `name` that changes the query's logic entirely; parameterized queries (where
  the database driver handles escaping) close this off completely, and are the standard fix, not
  manual escaping.
- **Rendering user input as raw HTML** — a comment field, a username, or any user-supplied text
  rendered without escaping lets an attacker embed a `<script>` tag that runs in every other
  user's browser who views that content; most modern frameworks escape by default, but explicit
  "render as raw HTML" escape hatches reintroduce the risk.
- **A server that fetches a URL supplied by the user, with no restriction** — a feature like "fetch
  this image URL" or "check this webhook URL" can be abused to make the server request internal-
  only addresses (cloud metadata services, internal admin panels) that aren't reachable from the
  public internet at all — the server becomes the attacker's proxy into the internal network.
- **Trusting client-side validation as the actual security boundary** for any of the above — all
  three need to be defended against on the server, regardless of what the client already checked
  (see §21).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use parameterized queries, always — never string-concatenated SQL with user input."
- "I rely on the framework's default HTML escaping, and I'm specifically cautious about any
  'render raw HTML' escape hatch."
- "For any feature that fetches a user-supplied URL server-side, I restrict what it's allowed to
  reach — blocking internal/private IP ranges specifically — rather than fetching anything."

### 5. Interview-Ready Answer

> "All three come from trusting untrusted input in a context where it can change behavior instead
> of just being data. SQL injection is fixed with parameterized queries, never string
> concatenation. XSS is fixed by relying on a framework's default output escaping and being
> suspicious of any raw-HTML escape hatch. SSRF is the one people forget — if a server fetches a
> user-supplied URL, that request needs to be restricted from reaching internal-only addresses,
> because the attacker isn't limited to what they can reach directly, they're using the server as
> a proxy into the internal network."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §63 (Injection Attacks, SSRF & the OWASP Top 10)
chapter (full depth, including concrete exploit and defense code).

---
