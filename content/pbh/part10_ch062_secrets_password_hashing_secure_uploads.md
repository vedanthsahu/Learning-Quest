## 62. Secrets, Password Hashing & Secure File Uploads

### 62.1 The Problem: Three Distinct Security-Critical Data-Handling Concerns This Chapter Closes Out

§44 covered configuration secrets (API keys, database URLs). This chapter addresses a genuinely different secret — user passwords, which must never be stored in any recoverable form at all, not even encrypted — plus the specific, additional security hardening §41's upload mechanics need once you consider a genuinely adversarial uploader, not just a well-behaved one.

### 62.2 Engineering Constraint: A Password Must Never Be Stored, Only a One-Way Proof That the Correct One Was Provided

Storing a password in any recoverable form — plaintext, or even reversibly encrypted — means a database breach directly exposes every user's actual password, which (given widespread password reuse across services) compromises those users' accounts on *other*, unrelated services too. A **cryptographic hash function** is deliberately one-way: computing `hash(password)` is fast and deterministic, but recovering `password` from `hash(password)` alone is computationally infeasible by design — storing only the hash means even a full database breach never exposes the actual password, only a value that can *verify* a correct password was provided without ever revealing it.

### 62.3 Decision Framework: `bcrypt`/`argon2`, Never a General-Purpose Hash Like SHA-256, for Passwords Specifically

A general-purpose cryptographic hash (SHA-256, used correctly elsewhere for data integrity checks) is *deliberately fast* — a genuine design goal for its intended use cases, but a direct liability for password hashing specifically, since a fast hash lets an attacker with a stolen hash database attempt billions of password guesses per second (a "brute-force" or "dictionary" attack) using ordinary hardware. `bcrypt` and `argon2` (the current, recommended standards) are deliberately, tunably **slow** — computationally expensive by design, specifically to make large-scale guessing attacks impractically slow even with significant attacker hardware, while remaining fast enough that a single legitimate login's hash computation (one attempt, not billions) is imperceptible to a real user.

### 62.4 Python Mechanism: Salting — Defeating Precomputed Rainbow-Table Attacks

A **salt** — random data unique to each password, combined with the password before hashing — ensures that two users with the identical password produce entirely different stored hashes, and defeats precomputed "rainbow table" attacks (an attacker's precomputed table of hash-to-password mappings for common passwords, built once and reused against any database) since the attacker would need a separate precomputed table per unique salt, which is computationally infeasible to build in advance for genuinely random, per-user salts. `bcrypt` and `argon2`'s standard Python libraries handle salt generation and storage automatically — a salt is embedded directly in the library's own output hash string, meaning application code never needs to manage salts separately or explicitly at all.

### 62.5 Engineering Constraint: File Uploads Introduce a Path-Traversal Risk the Moment a Filename Influences a Storage Path

Beyond §41.5's content-validation concern, a filename supplied by an uploading client (or derived carelessly from client-controlled input) must never be used directly to construct a filesystem path — a maliciously crafted filename (`../../etc/passwd`, or a similar path-traversal sequence) could, if concatenated naively into a storage path, cause the application to write (or, on the read side, read) a file entirely outside the intended upload directory, a genuine, serious vulnerability class (companion §63's OWASP Top 10 chapter names path traversal explicitly). The correct defense generates a new, application-controlled identifier (a UUID, directly companion §37.7's object-storage key pattern) for the actual storage location, using the client-supplied filename only as display metadata, never as part of any real filesystem or storage path construction.

### 62.6 Implementation

```python
import bcrypt
import uuid
from pathlib import Path

def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt()                        # §62.4: random per call
    hashed = bcrypt.hashpw(plain_password.encode(), salt)
    return hashed.decode()                           # includes the salt
                                                        # embedded within it

def verify_password(plain_password: str, stored_hash: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), stored_hash.encode())


# Storing a password (e.g. during signup, if not using SSO exclusively):
stored = hash_password("correct horse battery staple")
print(stored)   # e.g. "$2b$12$KIXQ...' -- the salt is embedded in this string

# Verifying a login attempt:
is_valid = verify_password("correct horse battery staple", stored)
assert is_valid is True
assert verify_password("wrong guess", stored) is False


UPLOAD_ROOT = Path("/var/app/uploads")

def safe_upload_path(client_filename: str) -> Path:
    """§62.5: NEVER derive a storage path from client input directly."""
    extension = Path(client_filename).suffix.lower()
    if extension not in {".svg", ".png", ".jpg"}:
        raise ValueError("Unsupported file type")

    safe_name = f"{uuid.uuid4()}{extension}"    # application-generated,
    final_path = UPLOAD_ROOT / safe_name          # NOT derived from the
                                                     # client-supplied
                                                     # filename's actual
                                                     # text at all

    # Defense-in-depth: even with a generated name, confirm the resolved
    # path is genuinely still inside UPLOAD_ROOT before ever using it.
    if not final_path.resolve().is_relative_to(UPLOAD_ROOT.resolve()):
        raise ValueError("Invalid upload path")

    return final_path
```

`hash_password`/`verify_password` never store or compare the plaintext password directly — `bcrypt.hashpw` embeds a fresh, random salt (§62.4) into its own output automatically, and `bcrypt.checkpw` extracts and reuses that same embedded salt internally when verifying, meaning application code never manually tracks or manages salts at all. `safe_upload_path` deliberately discards the client-supplied filename's actual text entirely (using only its extension, after validating it against an explicit allowlist) and generates a fresh UUID-based name instead — directly closing §62.5's path-traversal risk structurally, since no client-controlled string ever becomes part of the actual constructed filesystem path, with the final `is_relative_to` check as an explicit, defense-in-depth confirmation even beyond that.

### 62.7 Production Considerations

`bcrypt`'s (and `argon2`'s) computational cost is tunable (a "work factor" or "cost parameter") and should be periodically re-evaluated as hardware improves — a cost factor considered appropriately slow when first configured can become relatively fast (and therefore less protective) years later as attacker-available hardware improves, meaning this parameter deserves the same periodic-review discipline as any other security configuration, not a "set once at project start and never revisit" default. Password hashing verification should take **constant time** regardless of whether the password is correct or not — both `bcrypt.checkpw` and `argon2`'s equivalent are specifically designed to avoid **timing attacks** (where an attacker measures tiny response-time differences to infer information about a comparison's result), meaning hand-rolling your own "compare the hash directly" logic instead of using the library's provided verification function is a real, avoidable risk, since a naive string comparison (`==`) is not guaranteed constant-time and can leak timing information a determined attacker could exploit.

### 62.8 Debugging

**Symptoms:** A security review or penetration test identifies that an uploaded file's storage location can be manipulated by a crafted filename; login verification shows measurably different response times for correct versus incorrect password attempts. **Investigation:** For the path-traversal finding, trace exactly how the upload's storage path is constructed and check whether any portion of the client-supplied filename's actual text is used directly in that path (§62.5). For the timing-difference finding, check whether password comparison uses the hashing library's own provided verification function or a hand-rolled comparison. **Root cause:** Client-controlled filename text used directly in filesystem path construction, allowing path-traversal manipulation; a non-constant-time comparison leaking timing information about the password verification's result. **Fix:** Replace direct filename usage with an application-generated identifier (§62.6's UUID pattern), validating file type via an explicit allowlist rather than trusting the filename's extension alone; ensure password comparison exclusively uses the hashing library's provided, constant-time verification function.

### 62.9 Interview Thinking

"Why shouldn't you use SHA-256 to hash user passwords?" is testing whether you understand the deliberate-slowness rationale (§62.3) specifically, not just that "SHA-256 isn't for passwords" as an unexplained rule — a strong answer explains that SHA-256's speed (a genuine strength for its actual intended use cases, like file-integrity checksums) is precisely the liability for password hashing, since it makes brute-force attacks against a stolen hash database dramatically more feasible than against a deliberately slow algorithm like bcrypt or argon2.

### 62.10 Mini Lab

Implement `hash_password` and `verify_password` as in §62.6, and confirm hashing the same password twice produces two genuinely different stored hash strings (directly observing §62.4's per-call random salting), while `verify_password` still correctly validates the original password against both. Then implement `safe_upload_path` and test it against both a normal filename and a deliberately malicious one containing `../` path-traversal sequences, confirming the malicious attempt either raises an error or, if it somehow reaches the `is_relative_to` check, is correctly rejected as escaping the intended upload directory.

---
