## Project 09: Authentication Service — Solution Guide

### Business Reasoning

The business need is a single, consistent source of truth for user identity, usable by many independent applications. The central engineering tension, named directly in the challenge, is that fast, database-free verification (a real requirement given how frequently identity gets checked) and instant revocation (a real security expectation) pull in genuinely opposite directions, and a good design states this tradeoff honestly rather than pretending both are free.

### Requirements Analysis

Verification speed at high frequency essentially rules out a database call on every check — this points toward a self-contained, signature-verifiable token. But revocation (the ability to make a token stop working before its natural expiration) is fundamentally in tension with that same self-containment, since a self-contained token's validity, by design, doesn't depend on anything checkable after issuance. Resolving this tension, rather than ignoring it, is the actual content of this project.

### Architecture

```
Register/Login -> [hash password with bcrypt/argon2] -> issue short-lived signed JWT
Other services -> verify JWT signature + expiration LOCALLY (no call back to this service)
Logout -> (optional) add token's jti to a lightweight, checked, short-lived blocklist
```

### Tradeoff Discussion

**JWTs vs. server-side session tokens.** JWTs are self-contained and verifiable by signature alone, meaning any service holding the shared signing key (or public key, for asymmetric signing) can verify identity with zero database or network call — ideal for the stated high-frequency verification requirement. But they cannot be instantly revoked without reintroducing exactly the per-check lookup they were chosen to avoid. Server-side session tokens support instant revocation trivially (delete the session record) but require every verification to hit a shared store, directly working against the verification-speed requirement at scale.

**Password hashing algorithm choice.** A fast, general-purpose hash (e.g., SHA-256 used for data integrity) is dangerous here specifically because its speed — a virtue for integrity-checking — becomes a liability for password storage: an attacker with the hash can attempt billions of guesses per second. bcrypt/argon2 are deliberately, tunably slow, making brute-force guessing computationally expensive even with the hash exposed, directly the point of the challenge's third engineering question.

### Alternative Designs Considered and Rejected

**Server-side sessions as the sole mechanism.** Rejected as the default given the stated high-frequency verification requirement — a shared session store queried on every single check across every dependent application would itself likely become a bottleneck and a new single point of failure shared by every application. **JWTs with no expiration, relying solely on manual logout for revocation.** Rejected — this is the challenge's second named trap: a stolen, non-expiring token remains valid indefinitely, an unbounded blast radius for a single credential compromise.

### Chosen Design

Short-lived JWTs (a lifetime measured in hours, not days) as the primary mechanism, bounding the damage from an unrevoked, compromised token by time alone; a lightweight, optional blocklist of specific revoked token IDs (`jti` claims), checked by any service that specifically needs instant-revocation guarantees, layered on top rather than replacing the JWT mechanism entirely — an explicit, stated compromise between the two competing requirements rather than a pretense that one fully solves both.

### Implementation Walkthrough

```python
import jwt
from passlib.hash import argon2

def register(email: str, password: str, db) -> None:
    password_hash = argon2.hash(password)         # deliberately slow, automatically salted
    db.insert_user(email=email, password_hash=password_hash)

def login(email: str, password: str, db) -> str:
    user = db.get_user(email)
    if user is None or not argon2.verify(password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return jwt.encode(
        {"sub": email, "jti": str(uuid4()),
         "exp": datetime.now(timezone.utc) + timedelta(hours=2)},   # SHORT-lived (bounds blast radius)
        SECRET_KEY, algorithm="HS256",
    )

def verify_token(token: str, redis_client) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])   # NO database call
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    if redis_client.sismember("revoked_jtis", payload["jti"]):          # ONE fast, optional check
        raise HTTPException(401, "Token has been revoked")
    return payload["sub"]

def logout(token: str, redis_client) -> None:
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"verify_exp": False})
    ttl = max(0, payload["exp"] - int(time.time()))
    redis_client.sadd("revoked_jtis", payload["jti"])
    redis_client.expire("revoked_jtis", ttl)         # blocklist entries expire with the token itself
```

`verify_token` requires zero primary-database call in the common case — signature and expiration checks alone are sufficient — directly satisfying the verification-speed requirement. The Redis blocklist check is a single, fast `SISMEMBER` call, not a full database round-trip, and the blocklist entry's own TTL matches the token's remaining lifetime, so the blocklist never grows unbounded (a token that's already expired doesn't need to remain on the blocklist at all).

### Production Improvements

Use asymmetric signing (RS256) rather than a shared symmetric secret once multiple independent applications need to verify tokens — this lets every dependent application hold only the public key (sufficient for verification) without ever possessing the private signing key, a meaningfully better security boundary than distributing one shared secret to every application. Add rate limiting (this series' Project 02) on the login endpoint specifically, since it's a natural target for credential-stuffing attacks.

### Scaling Path

Because verification is self-contained, the authentication service itself only needs to scale for registration, login, and the (comparatively rare) revocation-check traffic — not for the full volume of every identity check across every dependent application, which happens locally at each verifying service instead. This is the direct payoff of the JWT-based design: verification load scales with each dependent application's own traffic, not with a shared central bottleneck.

### Interview Discussion

See Python Backend Engineering Handbook §95.3 for this exact system walked through the five-phase interview framework — the deep-dive phase for this question is almost always the revocation tradeoff discussed above, and a strong answer states it explicitly rather than presenting JWTs as an unconditionally superior choice.

### Lessons Learned

The core lesson is that some engineering tradeoffs don't have a clean resolution — they have an honest compromise, stated explicitly, with a concrete mitigation for the accepted downside (here, short expiration bounding the damage from unrevocable tokens). This same "state the tradeoff honestly rather than pretending it's fully solved" discipline is exactly what Python Backend Engineering Handbook §80.3's capstone ADR-2 modeled for this identical decision.

---
