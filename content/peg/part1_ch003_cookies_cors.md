## §3. Cookies, CORS, and Cross-Origin Requests

### 1. The Vocabulary

- **Cookie** — a small piece of data the browser stores and automatically resends to the same
  origin on every request.
- **localStorage** — browser storage that persists but is *never* automatically sent with
  requests; your code has to read and attach it manually.
- **Origin** — the combination of scheme + host + port (`https://app.example.com:443`).
- **CORS (Cross-Origin Resource Sharing)** — the browser-enforced rule that JavaScript on one
  origin can't read responses from another origin unless that origin explicitly allows it.
- **Preflight request** — an automatic `OPTIONS` request the browser sends before certain
  cross-origin requests, asking "are you okay with this?" before sending the real one.

### 2. Where It Sits, and Why Teams Use It

This is a browser-side security boundary, not a server-side one — the server always receives the
request either way. CORS exists so that a malicious website can't silently use your logged-in
session against a bank or email provider from a background script. It only matters when your
frontend and API live on different origins, which is extremely common (separate frontend/backend
deploys, third-party widgets, local dev on a different port).

### 3. What Actually Breaks

- **"CORS error" in the console** almost always means the *server* didn't send back an
  `Access-Control-Allow-Origin` header matching the requesting origin — it is a server-side fix,
  not something the frontend can work around.
- **Preflight passes, actual request still fails** — a common gap is allowing the preflight
  `OPTIONS` request but not applying the same CORS headers to the real `GET`/`POST` response.
- **Cookies not being sent cross-origin** — by default, cross-origin `fetch`/`XHR` calls don't
  include cookies; you need `credentials: "include"` on the client and a specific (non-wildcard)
  `Access-Control-Allow-Origin` plus `Access-Control-Allow-Credentials: true` on the server.
- **Confusing CORS with CSRF** — CORS controls what a browser lets *JavaScript* read; it does
  nothing to stop a form submission or an image tag from firing a cross-origin request in the
  first place. That's a separate problem (see §60).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "CORS is enforced by the browser, and it's a response-header problem on the server, not
  something you patch on the frontend."
- "Cookies get sent automatically to their origin; localStorage never gets sent automatically —
  that difference matters for both security and cross-origin auth design."
- "A wildcard `Access-Control-Allow-Origin: *` cannot be combined with credentials — the browser
  will reject that combination outright."

### 5. Interview-Ready Answer

> "A CORS error means the browser blocked a cross-origin JavaScript call because the server's
> response didn't include the right `Access-Control-Allow-Origin` header for the calling origin.
> It's not a bug in the request itself — the fix is always on the server, configuring which
> origins, methods, and headers are allowed, and if cookies need to go along with it, explicitly
> allowing credentials with a specific origin rather than a wildcard."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §60 (CSRF, CORS & Security Headers) chapter
covers the full preflight algorithm and credentialed-request rules.

---
