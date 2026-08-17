## 60. CSRF, CORS & Security Headers

### 60.1 The Problem: A Browser's Own Trust Assumptions Are an Attack Surface

A browser automatically attaches cookies (companion §34.4's access/refresh token cookies) to every request made to the domain that set them — including requests initiated by a *different*, malicious website the user happens to have open in another tab. This automatic-cookie-attachment behavior, combined with a backend that trusts any request bearing valid auth cookies without further checking, is precisely the vulnerability CSRF protection exists to close.

### 60.2 Engineering Constraint: CSRF Exploits the Browser's Automatic Cookie Attachment, Not a Stolen Credential

A **Cross-Site Request Forgery (CSRF)** attack doesn't require stealing a user's session token at all — a malicious page simply constructs a request (a form auto-submitted via JavaScript, or even a simple `<img>` tag for a GET-based state change) targeting your backend's domain; the victim's browser, having no way to distinguish "this request originated from your legitimate frontend" from "this request originated from a malicious page," automatically attaches the victim's real, valid auth cookies to it. If your backend performs a real state change (cancelling a booking, changing account settings) based purely on a valid cookie being present, with no additional verification, this forged request succeeds exactly as if the legitimate user had genuinely initiated it themselves.

### 60.3 Decision Framework: SameSite Cookies as the Primary, Modern CSRF Defense

Setting a cookie's `SameSite` attribute to `Strict` or `Lax` (directly the actual Seat Management backend's own `build_auth_cookie_settings` function, companion §34.7) instructs the browser itself not to attach that cookie to cross-site requests at all — `Strict` blocks it on essentially every cross-site request; `Lax` (a common, pragmatic default) allows it for top-level navigation (a user clicking a real link) while still blocking it for the kind of background, script-initiated cross-site requests CSRF attacks actually rely on. For most modern applications, correctly-configured `SameSite` cookies alone provide strong, browser-enforced CSRF protection without needing the older, more implementation-heavy CSRF-token pattern — though a defense-in-depth-minded team may still layer an explicit CSRF token check for genuinely high-stakes state-changing operations, accepting the added implementation complexity for that additional protection margin.

### 60.4 Engineering Constraint: CORS Exists to Protect *Users*, Not to Protect *Your API* From Being Called

**CORS (Cross-Origin Resource Sharing)** is frequently misunderstood as a server-side security mechanism protecting the API itself — it is not. CORS is a *browser*-enforced policy protecting a user from a malicious website reading the *response* of a cross-origin request made using the user's own browser-held credentials; a non-browser client (a script using `curl` or `httpx` directly, companion §32) is entirely unaffected by CORS, since CORS is enforced by the browser reading the response, not by the server refusing to process the request at all. This is precisely why setting `allow_origins=["*"]` (the actual Seat Management backend correctly avoids this, instead configuring `allow_origins=[settings.frontend_url]` explicitly) is a common, dangerous misconfiguration specifically for any API relying on cookie-based authentication — it tells every browser, for every user, that responses can be read by scripts running on *any* origin, directly undermining `SameSite`'s protection if a request somehow does get through.

### 60.5 Python Mechanism: Security Headers as Defense-in-Depth Beyond CSRF/CORS

Beyond CSRF and CORS specifically, a set of standard HTTP response headers provide additional, largely-independent defense-in-depth: `Strict-Transport-Security` (instructs the browser to only ever connect via HTTPS to this domain, preventing a downgrade attack); `X-Content-Type-Options: nosniff` (prevents the browser from trying to guess a response's content type in a way that could be exploited); `Content-Security-Policy` (restricts which sources scripts/styles/resources may be loaded from, a meaningful mitigation against cross-site scripting even if one somehow occurs). None of these headers replace CSRF/CORS protection — each closes a genuinely distinct, independent attack vector, and a mature security posture applies all of them together rather than treating any single mechanism as sufficient alone.

### 60.6 Implementation

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.seatmanagement.example"],   # §60.4: EXPLICIT,
    allow_credentials=True,                                    # never "*" when
    allow_methods=["GET", "POST", "PATCH", "DELETE"],          # allow_credentials
    allow_headers=["Authorization", "Content-Type"],            # is True
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"           # prevents this
                                                              # page being
                                                              # embedded in a
                                                              # malicious iframe
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response


def build_auth_cookie_settings(max_age: int) -> dict:
    return {
        "max_age": max_age,
        "httponly": True,           # prevents JavaScript from reading the
                                       # cookie at all -- unrelated to CSRF
                                       # but a critical, separate protection
                                       # against a DIFFERENT attack (XSS-based
                                       # token theft)
        "secure": True,               # HTTPS-only
        "samesite": "lax",            # §60.3: the primary CSRF defense
    }
```

`CORSMiddleware`'s explicit `allow_origins` list (never `"*"` when `allow_credentials=True` — FastAPI/Starlette actively rejects that dangerous combination) directly implements §60.4's principle: only the genuine, known frontend origin is permitted to read cross-origin responses using the user's credentials. `add_security_headers` demonstrates §60.5's defense-in-depth layering — each header closes a distinct, independent attack vector, none of them redundant with the others. `build_auth_cookie_settings`'s `samesite="lax"` is §60.3's primary CSRF defense, while `httponly=True` is a related-but-distinct protection specifically against a compromised script on your *own* page reading and exfiltrating the token (relevant if an XSS vulnerability exists elsewhere), not against CSRF at all — two genuinely different threats, both addressed, neither one substituting for the other.

### 60.7 Production Considerations

`SameSite=Strict` provides the strongest CSRF protection but can break legitimate cross-site navigation flows (a user following a link from an external site directly into an authenticated page) — `Lax` is the practical, widely-recommended default balancing security against this specific usability cost, and the choice between the two should be a deliberate decision based on the application's actual navigation patterns, not a default left unexamined. CORS configuration errors are a common, easy-to-introduce regression during deployment-environment changes (a new staging domain added to the frontend without the backend's `allow_origins` being updated to match) — treating the allowed-origins list as configuration requiring the same deliberate, reviewed change-management discipline as any other security-relevant setting (companion §44) prevents this specific, recurring class of "the frontend suddenly can't call the API" incident.

### 60.8 Debugging

**Symptoms:** A frontend application suddenly cannot successfully call the backend API after a deployment, with the browser's console showing a CORS-related error; a user reports that an action they didn't take (a booking cancelled, a setting changed) appears to have happened on their account. **Investigation:** For CORS errors, check the actual `Origin` header the browser is sending against the backend's configured `allow_origins` list — a mismatch (a new domain, a protocol difference like `http` vs `https`, a trailing-slash difference) is almost always the specific, exact cause. For the unauthorized-action report, check whether the affected cookies' `SameSite` attribute is correctly configured and whether the specific endpoint performing the state change validates anything beyond a bare cookie's presence. **Root cause:** A CORS `allow_origins` configuration not updated to match an actual, legitimate frontend origin; a missing or incorrectly-configured `SameSite` cookie attribute allowing a forged cross-site request to succeed. **Fix:** Update `allow_origins` to include the correct, current frontend origin(s) precisely; correctly configure `SameSite` (and verify it via direct testing, §60.10) for every authentication cookie, treating any gap here as a genuine, exploitable CSRF vulnerability requiring immediate remediation.

### 60.9 Interview Thinking

"What's the difference between CORS and CSRF, and how do you defend against each?" is testing whether you understand these as two genuinely distinct concerns (§60.2, §60.4) that are commonly, incorrectly conflated — a strong answer explains that CORS is a browser policy protecting users from having cross-origin *responses* read by malicious scripts, while CSRF is an attack exploiting automatic cookie attachment to forge *requests*, and that `SameSite` cookies (not CORS configuration) are the primary defense against the latter.

### 60.10 Mini Lab

Configure `CORSMiddleware` as in §60.6 against a small FastAPI application, then attempt a cross-origin fetch request from a different local origin (e.g., serving a simple HTML file with a JavaScript `fetch` call from a different port) both with and without that origin included in `allow_origins`, observing the browser's console behavior in each case directly. Separately, set a cookie with `samesite="lax"` and confirm (using your browser's developer tools, inspecting the actual `Set-Cookie` header) that the attribute is present exactly as configured.

---
