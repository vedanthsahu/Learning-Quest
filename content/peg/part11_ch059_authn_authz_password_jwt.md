## §59. AuthN vs AuthZ, Password Hashing, and JWTs

### 1. The Vocabulary

- **Password hashing** — storing a one-way transformed version of a password (bcrypt, scrypt,
  Argon2), never the plaintext, so a database leak doesn't directly expose passwords.
- **Salt** — random data mixed into each password before hashing, so identical passwords don't
  produce identical hashes, defeating precomputed lookup-table attacks.
- **JWT / session cookie** — covered in §24; this chapter focuses on the security posture around
  them specifically.

### 2. Where It Sits, and Why Teams Use It

This is the security-specific lens on the same authentication mechanics from §24 — the emphasis
here is on what happens when it's done wrong, since auth is one of the highest-consequence places
to get security fundamentals wrong.

### 3. What Actually Breaks

- **Hashing with a fast, general-purpose hash (MD5, SHA-256 alone)** — these are *designed* to be
  fast, which is exactly the wrong property for password hashing; a fast hash makes brute-forcing
  leaked hashes dramatically cheaper. Purpose-built slow hashes (bcrypt, Argon2) exist
  specifically to make that attack expensive.
- **No salt, or a shared salt across all users** — identical passwords produce identical hashes,
  letting an attacker use precomputed tables (rainbow tables) or spot which users share a
  password.
- **Storing passwords reversibly "just in case"** — there's essentially never a legitimate reason
  to be able to recover a user's original password; the correct flow for "I forgot my password"
  is always reset, never retrieve.
- **Comparing hashes with a naive `==`** — a simple equality check can leak timing information
  (a timing attack) about how many leading bytes matched; constant-time comparison functions exist
  specifically to prevent this.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Passwords get hashed with a purpose-built, slow algorithm like bcrypt or Argon2, always
  salted, never a fast general-purpose hash."
- "There's no legitimate 'recover my original password' flow — only reset."
- "I don't hand-roll password hashing or comparison logic — I use a maintained library that
  already handles salting and constant-time comparison correctly."

### 5. Interview-Ready Answer

> "Passwords always get hashed with a slow, purpose-built algorithm like bcrypt or Argon2, with a
> unique salt per user — never a fast general-purpose hash like plain SHA-256, since speed is
> exactly what makes brute-forcing a leaked hash cheap. And there's no such thing as recovering an
> original password, only resetting it — if a system can email you your actual password, that's a
> real red flag about how it's being stored."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §62 (Secrets, Password Hashing & Secure File
Uploads) chapter (full implementation guidance).

---
