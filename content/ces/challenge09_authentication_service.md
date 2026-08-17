## Project 09: Authentication Service

### Problem Statement

Multiple applications across the business each need to know who a user is before letting them do anything sensitive. Currently, each application has implemented its own login logic independently, with inconsistent password handling and no shared way to recognize a user who's already logged in to a different application. The business wants one central service responsible for verifying identity that every other application can rely on.

### Functional Requirements

- Allow a user to register with an email and password.
- Allow a user to log in and receive proof of their identity usable by other applications.
- Allow other applications to verify that proof of identity without needing direct access to the password database.
- Support logging a user out such that their identity proof no longer works.

### Non-Functional Requirements

- **Password security**: a stored password must remain safe even if the underlying database is somehow read by an attacker.
- **Verification speed**: other applications will verify a user's identity proof extremely frequently — this check must be fast and must not require a database call on every single verification if avoidable.
- **Revocation**: think carefully about what "logging out" needs to guarantee, and whether that's compatible with a verification mechanism that avoids a database call.
- **Availability**: since every other application depends on this service to verify identity, consider what happens to those applications if this service is unreachable.

### Project Scope

**In scope**: registration, login, an identity-proof mechanism verifiable by other applications, logout. **Out of scope**: multi-factor authentication, social/third-party login (OAuth as a client), fine-grained permissions/authorization (this project is about *who*, not *what they're allowed to do*).

### Engineering Questions (Answer Them Yourself First)

- What, specifically, makes a "fast, no-database-call" verification mechanism and "instant logout" pull in opposite directions?
- If a password's stored form is ever exposed, what should an attacker be unable to do with it, even given unlimited time?
- Why might hashing a password with a fast, general-purpose hash function (like the ones used for data integrity checks) be a bad idea, even though hashing is happening at all?
- If this service itself is temporarily unreachable, should every other application in the business stop working entirely?

### Architecture Thinking

Sketch what "proof of identity" actually needs to contain for another application to trust it without calling back to this service on every check — and sketch what that proof needs to contain for a logout to actually take effect. Consider whether these two things can both be true at once with a single, simple mechanism, or whether you need to make a genuine tradeoff. Estimate: if this identity proof has no expiration at all, what's the worst-case consequence of it being stolen once?

### Progressive Hint System

**Level 1**: Consider giving the identity proof a limited lifespan, even if you can't instantly revoke it — does a shorter lifespan reduce the actual damage from an unrevoked-but-compromised proof? **Level 2**: Research self-contained tokens that carry identity information directly, verifiable by signature alone, without a database lookup — and consider explicitly what these tokens are bad at. **Level 3**: Research the specific tradeoff between JWTs and server-side session tokens, and research password hashing algorithms specifically designed to be slow and salted, as opposed to fast general-purpose hashes. **Level 4**: A standard design issues short-lived, signed JWTs as the identity proof (fast, no per-check database call, verified by signature and expiration alone), accepting that instant revocation isn't naturally supported — for the rare case where instant, forced logout is genuinely required, a lightweight, checked-per-request blocklist of specific revoked token IDs is layered on top rather than making every single verification depend on a database lookup. Passwords are hashed with bcrypt or argon2, both deliberately slow and automatically salted.

### Common Engineering Traps

- **Hashing passwords with a fast, general-purpose hash function (e.g., one designed for data integrity, not secrecy)** — why does a hash function's *speed* matter here, and which direction of "fast" is actually dangerous?
- **Giving identity tokens no expiration at all, relying entirely on manual logout** — what's the actual blast radius of a single stolen, non-expiring token?
- **Assuming a JWT can be instantly revoked the same way a server-side session can** — what would you actually need to add to support genuine instant revocation, and what does that cost you?
- **Making every single application depend synchronously on this service being reachable for every request** — what happens to the rest of the business if this one service has a bad day?

### Reflection Questions

- If a user reports "I logged out, but my session on my other device is still active," is that necessarily a bug given the design you chose? Why or why not?
- How would you decide the right token expiration lifetime — what's the actual tradeoff you're balancing?
- What's the difference between this service being *unavailable* and this service *returning an incorrect "not authenticated" result* for a valid user? Which failure mode is worse, and does your design distinguish them?

### Completion Checklist

- [ ] I can explain the specific tradeoff between fast, database-free verification and instant revocation.
- [ ] I have chosen a password hashing approach and can explain why speed matters here.
- [ ] I have a token expiration policy and can justify the specific lifetime chosen.
- [ ] I have considered what happens to dependent applications if this service becomes unreachable.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
