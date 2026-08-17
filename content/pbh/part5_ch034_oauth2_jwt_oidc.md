## 34. Auth Protocols: OAuth2, JWT & OpenID Connect

### 34.1 The Problem: Proving Who Someone Is, Without Reinventing a Broken Wheel

§20's dependency-injection chapter assumed a `get_current_user` dependency already existed, without explaining how it actually determines identity from a raw incoming request. Authentication — proving who's making a request — and authorization — deciding what they're allowed to do — are deceptively easy to get subtly, dangerously wrong if implemented from scratch, which is exactly why a small number of standardized, heavily-scrutinized protocols exist and should be used rather than invented anew.

### 34.2 Engineering Constraint: Authentication and Authorization Are Genuinely Different Questions

**Authentication** answers "who is this?" — verifying an identity claim, typically via a password, a token, or (as in the actual Seat Management backend) a third-party identity provider. **Authorization** answers "what is this identity allowed to do?" — a separate concern, layered on top of a resolved identity (directly companion §20.3's `require_permission` dependency, which assumes `get_current_user` has *already* answered the authentication question and only adds the authorization check on top). Conflating the two in one undifferentiated check is a common design mistake that makes it hard to reason about either concern cleanly.

### 34.3 Python Mechanism: JWT — A Signed, Self-Contained Claim, Not a Session Lookup

A **JWT (JSON Web Token)** encodes a set of claims (who the user is, what tenant they belong to, when it expires) as a Base64-encoded JSON payload, cryptographically signed by the issuer — critically, a JWT's signature can be verified *without* a database lookup, since the signature itself proves the claims haven't been tampered with since issuance. This is a fundamentally different model from a traditional server-side session (a random token that's meaningless on its own, requiring a database or cache lookup to resolve to an actual user) — a JWT is self-contained and verifiable offline, at the cost of being much harder to revoke early (§34.4 develops this tradeoff directly).

### 34.4 Tradeoff: JWT's Statelessness Is Also Its Central Revocation Problem

Because a JWT's claims are trusted purely via signature verification, a JWT issued with a 24-hour expiry remains fully valid for that entire duration even if the user's account is disabled, their permissions change, or their session should be immediately revoked for a security reason — the token itself has no way to be "un-issued" early without an additional mechanism. The actual Seat Management backend's approach — short-lived access tokens (verified statelessly, fast) paired with a database-backed refresh-token table that *can* be revoked (`user_sessions`, checked on every refresh) — is the standard, practical resolution to this tradeoff: accept a short window of unrevoked validity for the access token itself, in exchange for the performance benefit of not hitting the database on every single request, while keeping the refresh flow itself fully revocable.

### 34.5 Python Mechanism: OAuth2 Delegates "Prove Who You Are" to a Trusted Third Party

**OAuth2** is a protocol for delegated authorization — letting a user grant your application limited access to their data on another service (Microsoft, Google) without ever sharing their actual password with your application. The actual Seat Management backend's `/auth/login` → Microsoft redirect → `/auth/callback` flow is a textbook OAuth2 **authorization code flow**: the user authenticates directly with Microsoft, Microsoft issues a short-lived authorization code back to your application, and your application exchanges that code (server-side, never exposed to the browser) for actual access tokens.

### 34.6 Decision Framework: OpenID Connect Adds "Who Is This" on Top of OAuth2's "What Can This App Access"

OAuth2 alone answers "can this application access this specific resource on the user's behalf" — it doesn't inherently establish a standardized way to answer "who, specifically, is this user, as an identity." **OpenID Connect (OIDC)** is a thin identity layer built on top of OAuth2, adding a standardized `id_token` (itself a JWT, §34.3) containing verified identity claims (`sub`, `email`, `name`) — precisely the token the actual backend's `sso.py` decodes via `verify_id_token`, extracting the tenant ID and user identity claims that drive its first-login user-provisioning logic. Recognizing that "Microsoft login" is really "OAuth2 authorization code flow plus OIDC identity claims" is what makes the actual `sso.py` code's specific function names and flow legible as an instance of a well-known standard, rather than bespoke, unfamiliar logic.

### 34.7 Implementation

```python
import jwt          # PyJWT
import time
from datetime import datetime, timezone

JWT_SECRET = "loaded-from-settings"   # in reality, from Settings (§17.4)
JWT_ALGORITHM = "HS256"

def issue_access_token(user_id: str, tenant_id: str, ttl_seconds: int = 900) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,            # OIDC-style claim name for "subject" (§34.6)
        "tenant_id": tenant_id,
        "iat": now,                 # issued-at
        "exp": now + ttl_seconds,   # expiry -- enforced automatically on decode
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_access_token(token: str) -> dict:
    try:
        # Signature AND expiry are both verified here -- no database lookup
        # needed at all (§34.3's statelessness benefit).
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidSignatureError:
        raise ValueError("Token signature is invalid -- possible tampering")
```

`issue_access_token` embeds the user's identity claims directly into a signed payload — no server-side session record is created for this specific token at all. `verify_access_token`'s single `jwt.decode(...)` call verifies both that the signature matches (proving the payload wasn't tampered with since `JWT_SECRET` signed it) and that `exp` hasn't passed — both checks entirely computational, requiring zero network round-trip to a database, which is exactly why access-token verification can be fast enough to run on literally every request without meaningfully adding latency, directly the performance property §34.4 traded revocability away to obtain.

### 34.8 Production Considerations

`JWT_SECRET` (or, more robustly in production, an asymmetric key pair where tokens are signed with a private key and verified with a public key) must be treated with the same secrets-handling discipline as any other credential (companion §44, §62) — anyone who obtains the signing secret can forge arbitrary, fully-valid tokens claiming to be any user at all, making this one of the single highest-value secrets in the entire system to protect and rotate carefully. §34.4's revocation gap should be explicitly bounded by keeping access-token TTLs genuinely short (minutes, not hours or days) — the shorter the access token's lifetime, the smaller the window during which a compromised-but-not-yet-expired token, or a token issued to a user whose access should have just been revoked, remains usable, directly trading a small amount of extra refresh-token traffic for a meaningfully reduced security exposure window.

### 34.9 Debugging

**Symptoms:** A user reports being unable to log in despite entering correct credentials; a user whose account was just disabled or whose permissions were just changed continues to have their old access apparently honored for some time afterward. **Investigation:** For login failures, check the OAuth2 flow's specific failure point (state mismatch, code exchange failure, id_token verification failure) — the actual backend's `sso.py` debug logging at each step (§34.5's flow) is specifically structured to make this traceable stage-by-stage. For the stale-access case, confirm the access token's TTL and recognize that this is an expected, bounded consequence of JWT statelessness (§34.4), not a bug — if the window is unacceptably long, the fix is shortening the TTL, not treating it as an application defect to patch elsewhere. **Root cause:** A specific OAuth2/OIDC flow step failing (each has its own distinct, identifiable cause); or a JWT genuinely remaining valid, by design, until its embedded expiry, regardless of server-side state changes since issuance. **Fix:** Debug the specific failing OAuth2/OIDC step directly rather than guessing broadly at "auth is broken"; tune access-token TTL explicitly against the organization's actual risk tolerance for this specific revocation-latency window.

### 34.10 Interview Thinking

"How would you validate a JWT without hitting the database on every request?" is testing whether you understand JWT's core self-contained-signature property (§34.3) as the actual mechanism enabling this, not just that "JWTs are stateless" as an unexplained fact — a strong answer also proactively raises the revocation tradeoff (§34.4) unprompted, since a candidate who only sees the performance benefit without recognizing its cost has an incomplete understanding of the tradeoff being made.

### 34.11 Mini Lab

Implement `issue_access_token` and `verify_access_token` as in §34.7 using PyJWT. Issue a token with a very short TTL (5 seconds), verify it succeeds immediately, then wait past the TTL and confirm `verify_access_token` correctly raises on the now-expired token. Separately, take a valid token, manually alter one character of its signature portion, and confirm verification correctly rejects it as tampered — directly demonstrating both halves of §34.3's stateless verification guarantee (expiry and signature integrity) yourself.

---
