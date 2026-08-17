## 63. Injection Attacks, SSRF & the OWASP Top 10 in Python

### 63.1 The Problem: This Part's Closing Chapter Consolidates Every Injection-Adjacent Risk Raised Earlier Into One Complete, Named Catalog

Across this handbook, several chapters have flagged specific injection-adjacent risks in passing — §24.5's SQL injection, §38.6's XXE, §62.5's path traversal — each in the context of the specific mechanism where it arises. This closing Part X chapter consolidates them into the industry-standard **OWASP Top 10** framework, adds the risks not yet covered (SSRF, deserialization attacks), and establishes the general pattern underlying all of them: untrusted input being interpreted as instructions rather than strictly as data, exactly the same structural vulnerability shape the companion AI Systems Handbook's §13.2 identifies for prompt injection, now in its classical, pre-AI form.

### 63.2 Engineering Constraint: Every Injection Vulnerability Shares One Root Cause — Untrusted Data Crossing Into an Instruction Context Unescaped

SQL injection (§24.5), XXE (§38.6), and path traversal (§62.5) are not three unrelated vulnerability classes requiring three unrelated mental models — every one of them is the identical underlying failure: data from an untrusted source (a user, an external API) being concatenated or embedded directly into something interpreted as an instruction (a SQL query, an XML parser's entity resolution, a filesystem path) without the interpreting system being told, structurally, "this specific part is data, not instruction." Parameterized queries (§24.5), `defusedxml` (§38.6), and application-generated storage identifiers (§62.5) are three different *mechanisms*, each solving the identical underlying problem in the specific context where it arises.

### 63.3 Python Mechanism: SSRF — When Your Own Backend Becomes the Attacker's Proxy

**Server-Side Request Forgery (SSRF)** occurs when an attacker convinces your backend to make an HTTP request on the attacker's behalf, to a destination the attacker chooses — companion §32's HTTP-client chapter established how your backend calls external services; SSRF exploits any code path where a URL's destination is influenced by untrusted user input (a "fetch this image from a URL" feature, a webhook-URL configuration field) to instead target internal-only infrastructure (a cloud provider's internal metadata service, an internal admin API not meant to be reachable from the public internet) that the backend itself can reach but the external attacker never could directly. This is precisely why any user-influenced outbound URL needs explicit validation — checking the destination against an allowlist of permitted domains/schemes, and explicitly rejecting requests targeting private/internal IP address ranges, before ever making the actual outbound call.

### 63.4 Decision Framework: Deserialization of Untrusted Data — `pickle` Is Never Safe Against Attacker-Controlled Input

Python's `pickle` module can serialize and deserialize arbitrary Python objects — but deserializing (`pickle.loads`) attacker-controlled data can execute arbitrary code as a direct, intended feature of how `pickle` works, not an edge-case bug; `pickle` is explicitly documented as unsafe to use on untrusted input. Any data crossing a trust boundary (companion §21.1's exact framing) — a request body, a message from an external queue whose producers you don't fully control, a cached value an attacker might somehow influence — must use a format with no such execution capability (JSON, companion §38.5, or Pydantic's own validated deserialization, companion §21) rather than `pickle`, which should be reserved exclusively for genuinely internal, trusted data you control end-to-end (a local cache of your own application's own objects, never anything crossing a trust boundary).

### 63.5 The OWASP Top 10, Mapped Directly to This Handbook's Own Chapters

Rather than treating the OWASP Top 10 as a separate list to memorize, recognizing where each item is *already* addressed elsewhere in this handbook is the more durable, transferable understanding: **Broken Access Control** (§59.3-59.5's object-level authorization); **Cryptographic Failures** (§62.2-62.4's password hashing, §44's secrets handling); **Injection** (§63.2's unifying principle, §24.5/§38.6); **Insecure Design** (§43's architectural layering, §59's authorization-by-design); **Security Misconfiguration** (§60.4's CORS wildcard trap, §44.3's secrets-in-environment-variables limitations); **Vulnerable Components** (companion §8's dependency-pinning and the supply-chain risk companion §113.5's case study describes); **Authentication Failures** (§34's JWT/OAuth2, §61.5's brute-force lockout); **Data Integrity Failures** (§63.4's deserialization risk, §46.4's contract-breaking-change risk applied adversarially); **Logging Failures** (companion §14.9/§64's structured logging as the actual mechanism enabling incident investigation at all); **SSRF** (§63.3). Recognizing this mapping is the actual skill — not reciting ten category names, but knowing precisely where in your own codebase each category's real, concrete risk actually lives.

### 63.6 Implementation

```python
import httpx
import ipaddress
from urllib.parse import urlparse

ALLOWED_SCHEMES = {"https"}
BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),        # private ranges + the common
    ipaddress.ip_network("172.16.0.0/12"),      # cloud-provider metadata
    ipaddress.ip_network("192.168.0.0/16"),      # service address -- SSRF
    ipaddress.ip_network("169.254.169.254/32"),   # defense (§63.3)
    ipaddress.ip_network("127.0.0.0/8"),
]

async def fetch_user_supplied_url_safely(url: str) -> bytes:
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise ValueError("Only HTTPS URLs are permitted")

    import socket
    resolved_ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
    for network in BLOCKED_NETWORKS:
        if resolved_ip in network:
            raise ValueError("This destination is not permitted")   # §63.3:
                                                                        # blocks
                                                                        # internal/
                                                                        # metadata
                                                                        # targets
                                                                        # explicitly

    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=5.0)
        return response.content


# NEVER do this with untrusted input (§63.4):
# import pickle
# data = pickle.loads(untrusted_bytes)   # arbitrary code execution risk

# Instead, ALWAYS use a safe, non-executable format:
import json
def safe_deserialize(untrusted_bytes: bytes) -> dict:
    return json.loads(untrusted_bytes)    # JSON has no code-execution
                                            # capability at all, by design
```

`fetch_user_supplied_url_safely` performs the two checks §63.3 requires before ever making the actual outbound request: the URL scheme is restricted to `https` only, and the resolved destination IP is explicitly checked against a blocklist of private/internal ranges (including the common cloud-provider metadata-service address, a frequent, specific real-world SSRF target) — critically, the check happens against the *resolved* IP address, not just the hostname string, since a hostname can resolve to an internal address even if the hostname text itself looks external. `safe_deserialize` demonstrates §63.4's principle concretely — JSON deserialization, unlike `pickle`, has no mechanism by which the deserialized data itself could cause code execution, making it the correct choice for any data originating outside full application control.

### 63.7 Production Considerations

SSRF protection (§63.3, §63.6) must account for **DNS rebinding** — an attacker-controlled domain that resolves to a safe, external IP address at the moment of the security check, then re-resolves to an internal address by the time the actual HTTP request is made moments later (a race condition against the check-then-act pattern, directly companion §14.1's general race-condition shape, now specifically weaponized against a security check) — a fully robust defense re-validates the resolved IP immediately before the actual connection is established, or uses a dedicated, hardened HTTP client library specifically designed to prevent this exact bypass, rather than trusting a check performed even a few milliseconds earlier. Dependency vulnerabilities (the OWASP "Vulnerable Components" category, §63.5) require ongoing, automated scanning (tools like `pip-audit` or GitHub's Dependabot, run routinely in CI, companion §8's lock-file discipline) rather than a one-time review at project start, since new vulnerabilities are discovered continuously in already-deployed dependencies your application has been running, unreviewed, for months.

### 63.8 Debugging

**Symptoms:** A security review or penetration test identifies that a "fetch this URL" or webhook feature can be used to reach internal-only infrastructure; a dependency-scanning tool flags a known vulnerability in a library your application uses. **Investigation:** For the SSRF finding, trace the exact code path handling the user-supplied URL and check whether it validates the resolved destination IP (not just the hostname text) against internal/private ranges before making the request (§63.3, §63.6). For the dependency vulnerability, check the specific CVE's details against how your application actually uses the affected library — not every reported vulnerability in a dependency is actually reachable/exploitable in your specific usage pattern, though this determination itself requires careful, deliberate analysis, not an assumption of safety. **Root cause:** Missing destination-IP validation on a user-influenced outbound request; an outdated dependency version with a since-patched, known vulnerability. **Fix:** Add explicit resolved-IP validation against a private/internal-range blocklist before any user-influenced outbound request (§63.6), with re-validation immediately before connection to guard against DNS rebinding (§63.7); update the affected dependency to a patched version, or apply the specific documented mitigation if an immediate update isn't yet possible.

### 63.9 Interview Thinking

"A feature lets users provide a URL for your backend to fetch content from — what security concerns does this raise?" is testing whether SSRF (§63.3) is immediately, unprompted, part of your answer — a strong answer explains the specific mechanism (the backend, not the external attacker, makes the request, potentially reaching internal-only infrastructure the attacker could never reach directly) and proposes the concrete defense (destination-IP validation against private ranges, §63.6) rather than only naming "SSRF" as a term without being able to explain or defend against it.

### 63.10 Mini Lab

Implement `fetch_user_supplied_url_safely` as in §63.6 and test it against three cases: a legitimate external HTTPS URL (should succeed), a URL resolving to a private/internal IP address like `http://192.168.1.1` (should be rejected), and — if you have safe, local access to test it — a URL targeting `169.254.169.254` specifically, confirming it's correctly blocked as the well-known cloud-metadata-service address. Then implement `safe_deserialize` and confirm it correctly rejects malformed or non-JSON input with a clear error, contrasting this explicitly against what `pickle.loads` would do with equivalent malicious input (conceptually — do not actually run `pickle.loads` against untrusted data, even for this educational exercise).

---
