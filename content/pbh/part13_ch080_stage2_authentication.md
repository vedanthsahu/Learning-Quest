## 80. Stage 2: Authentication

### 80.1 Stage Goal

Every note in Stage 1 is anonymous and globally visible — the first real gap between the toy skeleton and any usable product. This stage adds user accounts and authentication, establishing *who* is making each request, without yet deciding *what* they're allowed to do with that identity (that's §81's job, deliberately kept separate).

### 80.2 New Requirements

Functional: `POST /auth/register`, `POST /auth/login` issuing a bearer token; every existing `/notes` route now requires a valid token and records which user created each note. Non-functional: passwords must never be stored or logged in recoverable form (companion §62.3).

### 80.3 ADR-2: Session Tokens vs. JWTs for Stage 2

**(1) Deciding:** How should an authenticated identity be represented across requests? **(2) Options considered:** (a) opaque, server-side session tokens looked up in a store on every request; (b) self-contained JWTs (companion §34.3) carrying identity directly, verified by signature alone. **(3) Tradeoffs:** Session tokens allow instant, server-side revocation but require a lookup (a database or Redis call, companion §35) on every single request; JWTs avoid that per-request lookup entirely but make instant revocation genuinely hard (companion §34.6's revocation problem) without reintroducing a server-side check that partially defeats the point. **(4) Chosen:** JWTs, specifically because Stage 2 has no database yet (§79.3's deliberate deferral) and no revocation requirement has been stated — introducing a session store now would mean building real persistence one stage earlier than the capstone's own progression calls for, purely to support a requirement (revocation) that hasn't actually been requested. **(5) Revisit when:** A genuine revocation requirement appears (a "log out all devices" feature, or a security incident requiring forced re-authentication) — at that point this ADR should be explicitly reopened, not silently worked around.

### 80.4 Implementation

```python
from datetime import datetime, timedelta, timezone
import jwt                                    # PyJWT (companion §34.3)
from fastapi import Depends, HTTPException, Header
from passlib.hash import bcrypt               # companion §62.2

SECRET = settings.jwt_signing_key.get_secret_value()   # companion §44's SecretStr
ALGORITHM = "HS256"
_users: dict[str, dict] = {}                  # Stage 2: still in-memory (§79.3's ADR stands)

class Credentials(BaseModel):
    email: str
    password: str

@app.post("/auth/register", status_code=201)
def register(payload: Credentials) -> dict:
    if payload.email in _users:
        raise HTTPException(status_code=409, detail="Email already registered")
    _users[payload.email] = {"password_hash": bcrypt.hash(payload.password)}
    return {"email": payload.email}

@app.post("/auth/login")
def login(payload: Credentials) -> dict:
    user = _users.get(payload.email)
    if user is None or not bcrypt.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = jwt.encode(
        {"sub": payload.email, "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        SECRET, algorithm=ALGORITHM,
    )
    return {"access_token": token, "token_type": "bearer"}

def get_current_user(authorization: str = Header(...)) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload["sub"]

@app.post("/notes", response_model=Note, status_code=201)
def create_note(payload: NoteIn, owner: str = Depends(get_current_user)) -> Note:
    now = datetime.now(timezone.utc)
    note = Note(id=uuid4(), created_at=now, updated_at=now, owner=owner, **payload.model_dump())
    _notes[note.id] = note
    return note
```

`bcrypt.hash`/`bcrypt.verify` (companion §62.2) apply deliberately-slow, salted hashing — never a fast general-purpose hash — to the one piece of data (a password) that must survive even a full database compromise without immediate exposure. `get_current_user` as a `Depends` (companion §20.3) makes authentication a composable, reusable requirement any route can opt into by declaring the dependency, rather than duplicated token-parsing logic inside every handler. The JWT's `exp` claim gives every token a bounded lifetime (companion §34.5) even without server-side revocation, directly limiting ADR-2's accepted risk to, at most, the token's expiry window.

### 80.5 What Changed in the Architecture

Every mutating `/notes` route now depends on `get_current_user`, and `Note` gains an `owner` field — the first instance of a pattern that recurs at every later stage: a new capability (here, identity) doesn't just add new routes, it also reaches back and modifies the existing data model and existing routes, exactly as companion §78.5's evolvability requirement anticipated.

### 80.6 Production Considerations

The in-memory `_users` store carries the same Stage-1-appropriate, production-inappropriate caveat as `_notes` (§79.3) — it's accepted here for the same reason, and will be addressed by the same Stage 4 migration (§82), not separately.

### 80.7 Debugging

**Symptoms:** A valid-looking token is rejected with 401. **Investigation:** Decode the token without verification (`jwt.decode(token, options={"verify_signature": False})`) to inspect its claims directly — this immediately reveals whether the issue is an expired `exp` claim, a `SECRET` mismatch between the process that issued the token and the process verifying it (a real risk if `SECRET` is loaded inconsistently, companion §44.4), or a malformed `Authorization` header missing the `Bearer ` prefix. **Root cause (most common):** `SECRET` sourced from an environment variable that differs between a local shell session and the running server process, or wasn't reloaded after a `.env` change (companion §17.4's startup-validation discipline exists precisely to catch this class of drift early).

### 80.8 Interview Thinking

"Would you use JWTs or session tokens here?" is testing whether the answer engages with the *actual* stated requirements (§80.3's tradeoff) rather than reciting "JWTs are stateless and better" as a memorized fact — a strong answer states the specific tradeoff (revocation difficulty versus per-request lookup cost) and ties the choice to what's actually required at this stage, exactly as ADR-2 does, including naming the concrete condition that would flip the decision.

### 80.9 Mini Lab

Add a deliberately-expired token to a request and confirm the 401 response; then implement a simple, coarse revocation mechanism — a server-side blocklist of token IDs (`jti` claims) checked in `get_current_user` — and use it to answer ADR-2's own "what would make us revisit this" question concretely, in code, rather than only in the abstract.

---
