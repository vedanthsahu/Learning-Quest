## §64. OWASP Top 10, Security Headers (incl. CSP), and File Upload Security

### 1. The Vocabulary

- **OWASP Top 10** — a regularly-updated, widely-referenced list of the most critical web
  application security risks — a useful shared vocabulary, not a complete checklist.
- **Content Security Policy (CSP)** — a response header telling the browser exactly which sources
  scripts, styles, images, etc. are allowed to load from, dramatically limiting what an XSS
  payload could even do if one slipped through.
- **HSTS (HTTP Strict Transport Security)** — tells the browser to only ever connect over HTTPS
  for this site, closing off a class of downgrade attacks.
- **File upload security** — validating file type, size, and content (not just trusting the
  filename or declared MIME type) before storing or processing an uploaded file.
- **Dependency vulnerability** — a known security flaw in a third-party library your code depends
  on, not in your own code at all.

### 2. Where It Sits, and Why Teams Use It

OWASP's list is the industry's shared reference point for "which vulnerabilities are actually
common enough to prioritize" — and security headers plus upload validation are two of the
cheapest, most broadly-applicable defenses available, closing off entire categories of attack
with a small amount of configuration.

### 3. What Actually Breaks

- **No CSP at all** — even with good output escaping elsewhere, a CSP acts as defense-in-depth: if
  an XSS payload does slip through some other gap, a strict CSP can still prevent it from
  executing or from exfiltrating data to an attacker-controlled domain.
- **Trusting a file's declared extension or MIME type** — an uploaded file claiming to be a
  `.jpg` can actually contain executable content; real validation inspects the file's actual
  content/magic bytes, not just what the client claims.
- **An upload endpoint with no size limit** — a single large or repeated upload can exhaust
  storage or memory, an easy, low-effort denial-of-service vector if there's no cap.
- **Outdated dependencies with known CVEs** — a vulnerability in a third-party library is exactly
  as exploitable as one in your own code; not tracking and updating dependencies means known,
  publicly-documented attack paths sit open indefinitely.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I'd add a CSP as defense-in-depth against XSS, not a replacement for proper output escaping."
- "File upload validation checks actual content, not just the filename extension or declared MIME
  type, and enforces a size limit."
- "I keep dependencies updated and watch for known vulnerabilities, since a flaw in a library is
  just as exploitable as one in my own code."

### 5. Interview-Ready Answer

> "I treat the OWASP Top 10 as a shared vocabulary for prioritizing common risks, not a complete
> checklist on its own. Two cheap, high-leverage defenses I'd always want in place: a Content
> Security Policy, as defense-in-depth in case an XSS payload gets through some other gap, and
> real file upload validation that checks actual file content rather than trusting a declared
> extension or MIME type. And dependency vulnerabilities get the same seriousness as a bug in my
> own code, since they're exactly as exploitable."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §63 (Injection Attacks, SSRF & the OWASP Top 10)
chapter and companion Python Backend Engineering Handbook's §60 (CSRF, CORS & Security Headers)
chapter (full depth on CSP, HSTS, and every header).

---
